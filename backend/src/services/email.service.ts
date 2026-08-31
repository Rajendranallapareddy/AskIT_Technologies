import { mailTransport, isEmailConfigured } from '../config/email';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

// If SMTP isn't configured (typical in local dev), we log the email instead
// of failing the request, so registration/reset flows still work end-to-end.
// Returns true if a real email was sent, false if it was only logged —
// callers should use this to give an honest status instead of always
// claiming "email sent" when nothing actually left the server.
export async function sendMail({ to, subject, html }: SendMailOptions): Promise<boolean> {
  if (!isEmailConfigured || !mailTransport) {
    console.log('\n--- [DEV] Email not sent (SMTP not configured) ---');
    console.log(`To: ${to}\nSubject: ${subject}\n${html}`);
    console.log('----------------------------------------------------\n');
    return false;
  }
  await mailTransport.sendMail({
    from: process.env.SMTP_FROM || 'ASK IT Technologies <no-reply@askittechnologies.com>',
    to,
    subject,
    html,
  });
  return true;
}

export function verificationEmailTemplate(name: string, link: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
    <div style="background:#0f1d45;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
      <span style="font-size:22px;font-weight:800;color:#fff;">ASK<span style="color:#f97316;">IT</span></span>
      <p style="color:#cbd5f5;font-size:11px;margin:4px 0 0 0;letter-spacing:1px;">TECHNOLOGIES</p>
    </div>
    <div style="padding:28px 24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;">
      <h2 style="color:#1e3a8a;margin-top:0;">Your account has been created 🎉</h2>
      <p>Hi ${name},</p>
      <p>Thanks for signing up — your account with <b>ASK IT Technologies &amp; Consultancy</b> has been created successfully. One last step: verify your email address to fully activate it.</p>
      <a href="${link}" style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;margin:16px 0;">Verify My Email</a>
      <p style="color:#666;font-size:13px;">Once verified, you can log in and start browsing internships right away.</p>
      <p style="margin-top:24px;color:#999;font-size:12px;">If you didn't create this account, you can safely ignore this email.</p>
    </div>
  </div>`;
}

export function resetPasswordEmailTemplate(name: string, link: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
    <h2 style="color:#1e3a8a">Password Reset Request</h2>
    <p>Hi ${name}, click the button below to reset your password. This link expires in 1 hour.</p>
    <a href="${link}" style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Reset Password</a>
    <p style="margin-top:24px;color:#666">If you didn't request this, you can safely ignore this email.</p>
  </div>`;
}
