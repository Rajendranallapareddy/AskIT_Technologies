import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../config/jwt';
import { COOKIE_NAMES } from '../utils/constants';
import { sanitizeUser } from '../utils/helpers';
import { AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { logActivity } from '../services/audit.service';
import { sendMail, verificationEmailTemplate, resetPasswordEmailTemplate } from '../services/email.service';

const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      fullName, email, mobileNumber, password, gender, dateOfBirth,
      collegeName, university, degree, branch, graduationYear,
      address, city, state, country,
    } = req.body;

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { mobileNumber }] } });
    if (existing) {
      throw new AppError('An account with this email or mobile number already exists', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        fullName, email, mobileNumber, passwordHash,
        gender, dateOfBirth, collegeName, university, degree, branch,
        graduationYear: graduationYear ? Number(graduationYear) : undefined,
        address, city, state, country,
        emailVerifyToken,
        role: 'USER',
      },
    });

    const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${emailVerifyToken}`;
    const emailSent = await sendMail({
      to: email,
      subject: 'Your ASK IT Technologies account has been created',
      html: verificationEmailTemplate(fullName, verifyLink),
    });

    await logActivity({
      actorId: user.id,
      action: 'USER_REGISTER',
      description: `${fullName} registered a new account`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: emailSent
        ? 'Account created! Please check your email to verify your account.'
        : 'Account created! (Confirmation email was not sent — SMTP is not configured on this server yet.)',
      data: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.body;
    const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
    if (!user) throw new AppError('Invalid or expired verification token', 400);

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null },
    });

    res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { trainerProfile: true, subAdminPermissions: true },
    });
    if (!user) throw new AppError('Invalid email or password', 401);

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) throw new AppError('Invalid email or password', 401);

    if (!user.isActive) throw new AppError('Your account has been deactivated. Contact support.', 403);

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, role: user.role });
    setAuthCookies(res, accessToken, refreshToken);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: req.ip },
    });

    await logActivity({ actorId: user.id, action: 'LOGIN', description: `${user.fullName} logged in`, ipAddress: req.ip });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: sanitizeUser(user),
        accessToken, // also returned for mobile / non-cookie clients
        rememberMe: !!rememberMe,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
    if (!token) throw new AppError('No refresh token provided', 401);

    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) throw new AppError('Session invalid', 401);

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, role: user.role });
    setAuthCookies(res, accessToken, refreshToken);

    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    next(new AppError('Invalid or expired refresh token', 401));
  }
}

export async function logout(req: AuthRequest, res: Response) {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN);
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN);
  if (req.user) {
    await logActivity({ actorId: req.user.id, action: 'LOGOUT', description: `${req.user.fullName} logged out`, ipAddress: req.ip });
  }
  res.json({ success: true, message: 'Logged out successfully' });
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to avoid leaking which emails are registered.
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) },
    });

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    await sendMail({
      to: email,
      subject: 'Reset your ASK IT Technologies password',
      html: resetPasswordEmailTemplate(user.fullName, resetLink),
    });

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body;
    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
    });
    if (!user) throw new AppError('Invalid or expired reset token', 400);

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    await logActivity({ actorId: user.id, action: 'PASSWORD_RESET', description: `${user.fullName} reset their password`, ipAddress: req.ip });

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { trainerProfile: true, subAdminPermissions: true },
    });
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/auth/profile-picture — updates the logged-in account's own avatar,
// regardless of role. Profile pictures live on the shared User table, so one
// endpoint covers students, trainers, sub admins, and the super admin alike
// (previously this only existed for students, under /api/users/*).
export async function updateMyProfilePicture(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError('No image uploaded', 400);
    const relativePath = `/uploads/profiles/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { profilePicture: relativePath },
    });
    res.json({ success: true, message: 'Profile picture updated', data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}
