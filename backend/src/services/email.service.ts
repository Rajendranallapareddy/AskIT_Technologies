import { mailTransport, isEmailConfigured } from '../config/email';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendMail({
  to,
  subject,
  html,
  replyTo,
}: SendMailOptions): Promise<boolean> {
  if (!isEmailConfigured || !mailTransport) {
    console.log('\n--- Email not sent: SMTP not configured ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('------------------------------------------\n');

    return false;
  }

  const smtpUser = process.env.SMTP_USER?.trim();

  const sender =
    process.env.SMTP_FROM?.trim() ||
    (smtpUser
      ? `AskIT Technologies <${smtpUser}>`
      : undefined);

  if (!sender) {
    console.error('SMTP_FROM / SMTP_USER is not configured.');
    return false;
  }

  await mailTransport.sendMail({
    from: sender,
    to,
    subject,
    html,

    // Customer replies should return to the official mailbox.
    replyTo: replyTo || smtpUser || undefined,
  });

  return true;
}

export function verificationEmailTemplate(name: string, link: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <div style="
        background:#0f1d45;
        padding:24px;
        border-radius:8px 8px 0 0;
        text-align:center;
      ">
        <span style="font-size:22px;font-weight:800;color:#fff;">
          ASK<span style="color:#f97316;">IT</span>
        </span>

        <p style="
          color:#cbd5f5;
          font-size:11px;
          margin:4px 0 0 0;
          letter-spacing:1px;
        ">
          TECHNOLOGIES
        </p>
      </div>

      <div style="
        padding:28px 24px;
        border:1px solid #eee;
        border-top:none;
        border-radius:0 0 8px 8px;
      ">
        <h2 style="color:#1e3a8a;margin-top:0;">
          Your account has been created 🎉
        </h2>

        <p>Hi ${name},</p>

        <p>
          Thanks for signing up. Your account with
          <b>AskIT Technologies</b> has been created successfully.
          Please verify your email address to activate your account.
        </p>

        <a
          href="${link}"
          style="
            background:#f97316;
            color:#fff;
            padding:12px 24px;
            border-radius:6px;
            text-decoration:none;
            display:inline-block;
            font-weight:600;
            margin:16px 0;
          "
        >
          Verify My Email
        </a>

        <p style="color:#666;font-size:13px;">
          Once verified, you can log in and access your account.
        </p>

        <p style="margin-top:24px;color:#999;font-size:12px;">
          If you didn't create this account, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;
}

export function resetPasswordEmailTemplate(name: string, link: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#1e3a8a">
        Password Reset Request
      </h2>

      <p>Hi ${name},</p>

      <p>
        Click the button below to reset your password.
        This link expires in 1 hour.
      </p>

      <a
        href="${link}"
        style="
          background:#f97316;
          color:#fff;
          padding:12px 24px;
          border-radius:6px;
          text-decoration:none;
          display:inline-block;
        "
      >
        Reset Password
      </a>

      <p style="margin-top:24px;color:#666">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
}