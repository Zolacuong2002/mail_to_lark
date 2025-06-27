require('dotenv').config();
const imap = require('imap-simple');
const { simpleParser } = require('mailparser');
const axios = require('axios');

const config = {
  imap: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  }
};

async function start() {
  const connection = await imap.connect(config);
  await connection.openBox('INBOX');
  console.log('✅ Đang lắng nghe email mới...');

  connection.on('mail', async (numNewMsgs) => {
    try {
      const criteria = ['UNSEEN'];
      const options = {
        bodies: [''],
        markSeen: true,
        struct: true
      };

      const results = await connection.search(criteria, options);

      // ✅ Lấy đúng 1 email mới nhất
      const latest = results[results.length - 1];
      if (!latest) return;

      const part = latest.parts.find(p => p.which === '');
      const parsed = await simpleParser(part.body);

      const payload = {
        from: parsed.from?.text || '',
        subject: parsed.subject || '',
        date: parsed.date,
        body: parsed.text?.substring(0, 300) || '',
      };

      console.log('📤 Gửi tới webhook:', payload);

      await axios.post(process.env.WEBHOOK_URL, payload);
    } catch (err) {
      console.error('❌ Lỗi khi gửi webhook:', err.message);
    }
  });
}

start();
