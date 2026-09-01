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

      // Port 465 = SSL/TLS from the beginning.
      // Port 587 normally starts unsecured and upgrades with STARTTLS.
      secure: smtpPort === 465,

      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;

export const isEmailConfigured = hasSmtpConfig;