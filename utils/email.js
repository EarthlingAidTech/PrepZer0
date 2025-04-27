var nodemailer = require('nodemailer');
const sendEmails =async options =>{
    const transporter = nodemailer.createTransport({
      host: "smtpout.secureserver.net",  
      secure: true,
      secureConnection: false, // TLS requires secureConnection to be false
      tls: {
          ciphers:'SSLv3'
      },
      requireTLS:true,
      port: 465,
      debug: true,
      
        auth: {
          user: 'services@prepzer0.co.in',
          pass: 'loco20014'
        }
      });
      console.log("inside mailer")

      const mailOptions = {
        from: 'services@prepzer0.co.in',
        to: options.email,
        subject : options.subject || "Passoword reset",
        html: options.html || `<h1 style="color : red;">The password reset link is :</h1>  <a href="${options.subject}"> ${options.subject}</a> `
      };
      console.log('shit it may be the reversehack')
     await transporter.sendMail(mailOptions)
}
module.exports = sendEmails