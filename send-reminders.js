const FIREBASE_DB_URL = "https://cybehood-default-rtdb.firebaseio.com/cyberhood_docs.json";

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_RECIPIENT = process.env.EMAILJS_RECIPIENT;

async function checkAndSendReminders() {
  try {
    const res = await fetch(FIREBASE_DB_URL);
    const data = await res.json();
    if (!data) return console.log("資料庫為空，結束流程。");

    const docs = Object.values(data);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 篩選 7 天內到期或已逾期且未辦結的公文
    const urgentDocs = docs.filter(doc => {
      if (doc.isCompleted) return false;
      const target = new Date(doc.deadline);
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    });

    if (urgentDocs.length === 0) {
      console.log("🎉 今日無逾期或即期公文，無需發送 Email。");
      return;
    }

    // 彙總公文資訊
    const summaryText = urgentDocs.map((doc, idx) => {
      return `${idx + 1}. [${doc.no}] ${doc.subject}\n   - 期限：${doc.deadline}\n   - 內容：${doc.content || '無'}`;
    }).join('\n\n');

    const templateParams = {
      to_email: EMAILJS_RECIPIENT,
      doc_no: `雲端自動排程通知 (${urgentDocs.length}筆待辦公文)`,
      doc_subject: `【每日公文催辦提醒】共有 ${urgentDocs.length} 筆公文即將到期或已逾期`,
      doc_deadline: '請儘速辦理',
      doc_status: `包含 ${urgentDocs.length} 筆未辦結公文`,
      doc_content: summaryText
    };

    // 發送至 EmailJS REST API
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: templateParams
      })
    });

    if (response.ok) {
      console.log(`✉️ 成功自動寄送 ${urgentDocs.length} 筆公文催辦通知！`);
    } else {
      const errText = await response.text();
      console.error('❌ Email 發送失敗：', errText);
    }
  } catch (err) {
    console.error('❌ 執行過程中出錯：', err);
  }
}

checkAndSendReminders();
