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
    console.warn(
      `[EMAIL] SMTP not configured. Email not sent to ${to}`
    );

    return false;
  }

  const smtpUser = process.env.SMTP_USER?.trim();

  const sender =
    process.env.SMTP_FROM?.trim() ||
    (smtpUser
      ? `AskIT Technologies <${smtpUser}>`
      : undefined);

  if (!sender) {
    console.error(
      '[EMAIL] SMTP_FROM and SMTP_USER are missing.'
    );

    return false;
  }

  try {
    await mailTransport.sendMail({
      from: sender,
      to,
      subject,
      html,
      replyTo: replyTo || smtpUser || undefined,
    });

    console.log(
      `[EMAIL] Email sent successfully to ${to}`
    );

    return true;
  } catch (error: any) {
    // Email failure must never crash registration,
    // payments or other application functionality.
    console.error(
      `[EMAIL] Failed to send email to ${to}:`,
      error?.message || error
    );

    return false;
  }
}

export function verificationEmailTemplate(
  name: string,
  link: string
) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <div
        style="
          background:#0f1d45;
          padding:24px;
          border-radius:8px 8px 0 0;
          text-align:center;
        "
      >
        <span
          style="
            font-size:22px;
            font-weight:800;
            color:#fff;
          "
        >
          AskIT
          <span style="color:#f97316;">
            Technologies
          </span>
        </span>
      </div>

      <div
        style="
          padding:28px 24px;
          border:1px solid #eee;
          border-top:none;
          border-radius:0 0 8px 8px;
        "
      >
        <h2
          style="
            color:#1e3a8a;
            margin-top:0;
          "
        >
          Welcome to AskIT Technologies 🎉
        </h2>

        <p>Hi ${name},</p>

        <p>
          Your AskIT Technologies account has been
          created successfully.
        </p>

        <p>
          Please verify your email address by clicking
          the button below.
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

        <p
          style="
            color:#666;
            font-size:13px;
          "
        >
          After verification, you can log in and access
          your account.
        </p>

        <p
          style="
            margin-top:24px;
            color:#999;
            font-size:12px;
          "
        >
          If you didn't create this account, you can
          safely ignore this email.
        </p>
      </div>
    </div>
  `;
}

export function resetPasswordEmailTemplate(
  name: string,
  link: string
) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#1e3a8a">
        Password Reset Request
      </h2>

      <p>Hi ${name},</p>

      <p>
        We received a request to reset your
        AskIT Technologies password.
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
        This link expires in 1 hour.
      </p>

      <p style="color:#666">
        If you didn't request this, you can safely
        ignore this email.
      </p>
    </div>
  `;
}