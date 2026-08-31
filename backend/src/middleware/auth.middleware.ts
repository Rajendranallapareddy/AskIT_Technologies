import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../config/jwt';
import { prisma } from '../config/db';
import { COOKIE_NAMES } from '../utils/constants';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
    fullName: string;
    isActive: boolean;
  };
}

// Verifies the JWT (from the httpOnly cookie or Authorization header),
// confirms the user still exists and is active, and attaches it to req.user.
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;
    const token = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN] || bearer;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Account not found or deactivated' });
    }

    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
}

// Does not fail the request if unauthenticated; used for public routes that
// optionally personalize content.
export async function optionalAuthenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;
    const token = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN] || bearer;
    if (!token) return next();

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (user && user.isActive) {
      req.user = {
        id: user.id,
        role: user.role,
        email: user.email,
        fullName: user.fullName,
        isActive: user.isActive,
      };
    }
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}
