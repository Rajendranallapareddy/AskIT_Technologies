import nodemailer from 'nodemailer';

// In development without SMTP credentials, emails are logged to the console
// instead of actually being sent, so the app is fully runnable out of the box.
const hasSmtpConfig = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

export const mailTransport = hasSmtpConfig
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

export const isEmailConfigured = hasSmtpConfig;
