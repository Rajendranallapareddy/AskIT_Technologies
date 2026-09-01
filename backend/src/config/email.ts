import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST?.trim();
const smtpUser = process.env.SMTP_USER?.trim();
const smtpPass = process.env.SMTP_PASS;
const smtpPort = Number(process.env.SMTP_PORT || 465);

const hasSmtpConfig = !!(
  smtpHost &&
  smtpUser &&
  smtpPass
);

export const mailTransport = hasSmtpConfig
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,

      // Port 465 requires SSL/TLS immediately.
      // Port 587 normally uses STARTTLS.
      secure: smtpPort === 465,

      auth: {
        user: smtpUser,
        pass: smtpPass,
      },

      // Prevent SMTP problems from hanging requests
      // for a very long time.
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 15000,

      tls: {
        minVersion: 'TLSv1.2',
      },
    })
  : null;

export const isEmailConfigured = hasSmtpConfig;