// WhatsApp delivery via Twilio's WhatsApp API — the most standard option for
// developers to set up quickly. Requires a Twilio account with WhatsApp
// enabled (their free trial supports WhatsApp sandbox testing).
//
// Setup (see backend/.env.example for the exact variable names):
//   1. Sign up at https://www.twilio.com and verify your account.
//   2. Go to Messaging > Try it out > Send a WhatsApp message, and follow the
//      sandbox join steps (or set up a real WhatsApp sender for production).
//   3. Copy your Account SID and Auth Token from the Twilio Console.
//   4. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM
//      (e.g. "whatsapp:+14155238886" for the sandbox number) in backend/.env.
//   5. Each recipient must have joined your sandbox (or, in production, be
//      opted in) before Twilio will deliver to their number.
//
// If these aren't configured, sendWhatsApp() logs the message instead of
// sending — same pattern as email.service.ts — so nothing breaks locally
// without a Twilio account.

interface SendWhatsAppOptions {
  to: string; // plain 10-digit or E.164 mobile number; formatted internally
  body: string;
}

function isWhatsAppConfigured() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}

function toE164(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`; // default to India country code
  return digits.startsWith('+') ? digits : `+${digits}`;
}

// Returns true if a real WhatsApp message was sent, false if it was only
// logged (Twilio not configured) — mirrors sendMail()'s honest-status contract.
export async function sendWhatsApp({ to, body }: SendWhatsAppOptions): Promise<boolean> {
  if (!isWhatsAppConfigured()) {
    console.log('\n--- [DEV] WhatsApp not sent (Twilio not configured) ---');
    console.log(`To: ${to}\n${body}`);
    console.log('--------------------------------------------------------\n');
    return false;
  }

  // Lazy import so the app still boots fine if the `twilio` package isn't
  // installed yet (it's an optional dependency for this feature).
  const twilio = (await import('twilio')).default;
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${toE164(to)}`,
    body,
  });
  return true;
}

export function receiptWhatsAppMessage(params: {
  studentName: string;
  internshipTitle: string;
  amount: number;
  receiptNo: string;
  downloadUrl: string;
}) {
  return (
    `Hi ${params.studentName}! 👋\n\n` +
    `Your payment of ₹${params.amount.toFixed(2)} for *${params.internshipTitle}* was successful.\n\n` +
    `Receipt No: ${params.receiptNo}\n` +
    `Download your receipt here: ${params.downloadUrl}\n\n` +
    `— ASK IT Technologies`
  );
}
