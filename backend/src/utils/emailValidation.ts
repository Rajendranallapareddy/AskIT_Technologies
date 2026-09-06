const ALLOWED_EMAIL_DOMAINS = new Set([
  'gmail.com',

  'yahoo.com',
  'yahoo.co.in',
  'yahoo.in',

  'outlook.com',
  'hotmail.com',
  'live.com',

  'icloud.com',
  'me.com',

  'proton.me',
  'protonmail.com',

  'zoho.com',

  'rediffmail.com',
]);

export interface EmailValidationResult {
  valid: boolean;
  email: string;
  message?: string;
}

export function validatePublicEmail(
  input: unknown
): EmailValidationResult {
  const email = String(
    input || ''
  )
    .trim()
    .toLowerCase();

  if (!email) {
    return {
      valid: false,
      email,
      message:
        'Email address is required.',
    };
  }

  if (email.length > 254) {
    return {
      valid: false,
      email,
      message:
        'Email address is too long.',
    };
  }

  /*
   * General email structure.
   *
   * Examples accepted:
   * rajendra@gmail.com
   * rajendra123@yahoo.com
   * rajendra.n@gmail.com
   *
   * Examples rejected:
   * abc
   * abc@
   * abc@gmail
   * abc..test@gmail.com
   */
  const emailRegex =
    /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9.-]+\.[a-z]{2,}$/i;

  if (!emailRegex.test(email)) {
    return {
      valid: false,
      email,
      message:
        'Please enter a valid email address.',
    };
  }

  const [
    localPart,
    domain,
  ] = email.split('@');

  if (
    !localPart ||
    !domain
  ) {
    return {
      valid: false,
      email,
      message:
        'Please enter a valid email address.',
    };
  }

  if (
    localPart.length < 2 ||
    localPart.length > 64
  ) {
    return {
      valid: false,
      email,
      message:
        'Please enter a valid email address.',
    };
  }

  if (
    localPart.includes('..') ||
    localPart.startsWith('.') ||
    localPart.endsWith('.')
  ) {
    return {
      valid: false,
      email,
      message:
        'Please enter a valid email address.',
    };
  }

  /*
   * AskIT accepts trusted/common personal
   * email providers for student signup.
   */
  if (
    !ALLOWED_EMAIL_DOMAINS.has(
      domain
    )
  ) {
    return {
      valid: false,
      email,
      message:
        'Please use a valid email account such as Gmail, Yahoo, Outlook, Hotmail, iCloud, ProtonMail or Zoho.',
    };
  }

  return {
    valid: true,
    email,
  };
}