export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUB_ADMIN: 'SUB_ADMIN',
  TRAINER: 'TRAINER',
  USER: 'USER',
} as const;

export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN];

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'askit_access_token',
  REFRESH_TOKEN: 'askit_refresh_token',
};

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=]).{8,}$/;
// At least 8 chars, one uppercase, one lowercase, one number, one special char.

export const MOBILE_REGEX = /^[6-9]\d{9}$/;

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_MAX_ATTEMPTS = 10;
