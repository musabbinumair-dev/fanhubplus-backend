import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const hasConfig = process.env.EMAIL_USER && process.env.EMAIL_PASS;

    if (!hasConfig) {
      console.log(`\n========================================`);
      console.log(`[EMAIL DISPATCH] To: ${to}`);
      console.log(`[SUBJECT]: ${subject}`);
      console.log(`[BODY]: ${text || html}`);
      console.log(`========================================\n`);
      return true;
    }

    const transportConfig = process.env.EMAIL_HOST
      ? {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      }
      : {
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      };

    const transporter = nodemailer.createTransport(transportConfig);

    const fromAddress = process.env.EMAIL_FROM || `"FanHub Support" <${process.env.EMAIL_USER}>`;

    await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });

    return true;
  } catch (error) {
    console.error('Email send error:', error.message);
    return false;
  }
};
