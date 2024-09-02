const nodemailer = require('nodemailer');
 
class MailSender {
  constructor() {
    this._transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_ADDRESS,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }
 
  sendEmail(targetEmail, content) {
    const message = {
      from: 'Playlists Service',
      to: targetEmail,
      subject: 'Ekspor Daftar Lagu',
      text: 'Terlampir hasil dari ekspor daftar lagu',
      attachments: [
        {
          filename: 'playlists.json',
          content,
        },
      ],
    };
 
    return this._transporter.sendMail(message);
  }
}
 
module.exports = MailSender;