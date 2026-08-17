const FIREBASE_DB_URL = "https://cybehood-default-rtdb.firebaseio.com/cyberhood_docs.json";

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_RECIPIENT = process.env.EMAILJS_RECIPIENT;

async function checkAndSendReminders() {
  try {
    console.log("🔍 開始讀取 Firebase 資料庫...");
    const res = await fetch(FIREBASE_DB_URL);
    const data = await res.json();

    if (!data) {
      console.log("⚠️ 資料庫為空，結束流程。");
      return;
    }

    const docs = Object.values(data);
    console.log(`📊 成功讀取資料庫，共有 ${docs.length} 筆公文紀錄。`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 篩選 7 天內到期或已逾期且未辦結的公文
    const urgentDocs = docs.filter(doc => {
      if (doc.isCompleted) return false;
      if (!doc.deadline) return false;
      const target = new Date(doc.deadline);
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    });

    console.log(`🚨 符合「7天內到期或逾期未辦結」的公文共有 ${urgentDocs.length} 筆。`);

    if (urgentDocs.length === 0) {
      console.log("🎉 今日無即期待辦公文，不觸發 EmailJS 發送。");
      return;
    }

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

    console.log("✉️ 正發送 API 請求給 EmailJS...");
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
      console.log(`✅ EmailJS 發送成功！已寄出 ${urgentDocs.length} 筆催辦通知！`);
    } else {
      const errText = await response.text();
      console.error(`❌ EmailJS 發送失敗 (HTTP ${response.status})：`, errText);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ 執行過程發生錯誤：', err);
    process.exit(1);
  }
}

checkAndSendReminders();
