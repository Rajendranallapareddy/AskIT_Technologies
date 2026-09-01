import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { prisma } from '../config/db';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../config/jwt';

import { COOKIE_NAMES } from '../utils/constants';
import { sanitizeUser } from '../utils/helpers';

import { AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

import { logActivity } from '../services/audit.service';

import {
  sendMail,
  verificationEmailTemplate,
  resetPasswordEmailTemplate,
} from '../services/email.service';

import {
  uploadProfilePictureToCloud,
  getProfilePictureSignedUrl,
  deleteCloudFile,
} from '../services/cloudStorage.service';

const isProd = process.env.NODE_ENV === 'production';

const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
};

/**
 * Sets access and refresh token cookies.
 */
function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
) {
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    ...cookieOpts,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
    ...cookieOpts,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

/**
 * Converts the stored private GCS object path into
 * a temporary signed URL before returning the user
 * to the frontend.
 */
async function prepareUserForResponse(user: any) {
  const safeUser = sanitizeUser(user);

  let profilePicture: string | null = null;

  try {
    profilePicture = await getProfilePictureSignedUrl(
      user.profilePicture
    );
  } catch (error) {
    console.error(
      '[PROFILE] Failed to generate signed profile picture URL:',
      error
    );

    profilePicture = null;
  }

  return {
    ...safeUser,
    profilePicture,
  };
}

/**
 * POST /api/auth/register
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      fullName,
      email,
      mobileNumber,
      password,
      gender,
      dateOfBirth,
      collegeName,
      university,
      degree,
      branch,
      graduationYear,
      address,
      city,
      state,
      country,
    } = req.body;

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const normalizedMobile = String(mobileNumber)
      .trim();

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          {
            email: normalizedEmail,
          },
          {
            mobileNumber: normalizedMobile,
          },
        ],
      },
    });

    if (existing) {
      if (
        existing.email.toLowerCase() ===
        normalizedEmail
      ) {
        throw new AppError(
          'An account with this email already exists. Please login.',
          409
        );
      }

      throw new AppError(
        'An account with this mobile number already exists. Please login.',
        409
      );
    }

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    const emailVerifyToken = crypto
      .randomBytes(32)
      .toString('hex');

    const user = await prisma.user.create({
      data: {
        fullName: String(fullName).trim(),

        email: normalizedEmail,

        mobileNumber: normalizedMobile,

        passwordHash,

        gender,

        dateOfBirth,

        collegeName: collegeName?.trim(),

        university: university?.trim(),

        degree: degree?.trim(),

        branch: branch?.trim(),

        graduationYear: graduationYear
          ? Number(graduationYear)
          : undefined,

        address: address?.trim(),

        city: city?.trim(),

        state: state?.trim(),

        country:
          country?.trim() || 'India',

        emailVerifyToken,

        role: 'USER',
      },
    });

    const frontendUrl =
      process.env.FRONTEND_URL ||
      'http://localhost:5173';

    const verifyLink =
      `${frontendUrl}/verify-email?token=${emailVerifyToken}`;

    /**
     * Do NOT wait for SMTP.
     *
     * Account creation should succeed immediately,
     * even if email delivery temporarily fails.
     */
    void sendMail({
      to: normalizedEmail,

      subject:
        'Welcome to AskIT Technologies - Verify Your Email',

      html: verificationEmailTemplate(
        fullName,
        verifyLink
      ),
    })
      .then((sent) => {
        if (sent) {
          console.log(
            `[REGISTER] Verification email sent to ${normalizedEmail}`
          );
        } else {
          console.warn(
            `[REGISTER] Account created but verification email was not sent to ${normalizedEmail}`
          );
        }
      })
      .catch((error) => {
        console.error(
          '[REGISTER] Verification email error:',
          error
        );
      });

    /**
     * Activity logging should not delay registration.
     */
    void logActivity({
      actorId: user.id,

      action: 'USER_REGISTER',

      description:
        `${fullName} registered a new account`,

      ipAddress: req.ip,
    }).catch((error) => {
      console.error(
        '[REGISTER] Activity log error:',
        error
      );
    });

    return res.status(201).json({
      success: true,

      message:
        'Account created successfully. Please login.',

      data: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/verify-email
 */
export async function verifyEmail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { token } = req.body;

    const user =
      await prisma.user.findFirst({
        where: {
          emailVerifyToken: token,
        },
      });

    if (!user) {
      throw new AppError(
        'Invalid or expired verification token',
        400
      );
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
      },
    });

    return res.json({
      success: true,

      message:
        'Email verified successfully. You can now log in.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      email,
      password,
      rememberMe,
    } = req.body;

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    const user =
      await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },

        include: {
          trainerProfile: true,
          subAdminPermissions: true,
        },
      });

    if (!user) {
      throw new AppError(
        'Invalid email or password',
        401
      );
    }

    const validPassword =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!validPassword) {
      throw new AppError(
        'Invalid email or password',
        401
      );
    }

    if (!user.isActive) {
      throw new AppError(
        'Your account has been deactivated. Contact support.',
        403
      );
    }

    const accessToken =
      signAccessToken({
        userId: user.id,
        role: user.role,
      });

    const refreshToken =
      signRefreshToken({
        userId: user.id,
        role: user.role,
      });

    setAuthCookies(
      res,
      accessToken,
      refreshToken
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        lastLoginAt: new Date(),
        lastLoginIp: req.ip,
      },
    });

    void logActivity({
      actorId: user.id,

      action: 'LOGIN',

      description:
        `${user.fullName} logged in`,

      ipAddress: req.ip,
    }).catch((error) => {
      console.error(
        '[LOGIN] Activity log error:',
        error
      );
    });

    /**
     * IMPORTANT:
     * Converts private GCS profile object into
     * a signed URL before sending it to frontend.
     */
    const safeUser =
      await prepareUserForResponse(user);

    return res.json({
      success: true,

      message: 'Login successful',

      data: {
        user: safeUser,

        accessToken,

        rememberMe:
          !!rememberMe,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 */
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token =
      req.cookies?.[
        COOKIE_NAMES.REFRESH_TOKEN
      ];

    if (!token) {
      throw new AppError(
        'No refresh token provided',
        401
      );
    }

    const payload =
      verifyRefreshToken(token);

    const user =
      await prisma.user.findUnique({
        where: {
          id: payload.userId,
        },
      });

    if (
      !user ||
      !user.isActive
    ) {
      throw new AppError(
        'Session invalid',
        401
      );
    }

    const accessToken =
      signAccessToken({
        userId: user.id,
        role: user.role,
      });

    const refreshToken =
      signRefreshToken({
        userId: user.id,
        role: user.role,
      });

    setAuthCookies(
      res,
      accessToken,
      refreshToken
    );

    return res.json({
      success: true,

      data: {
        accessToken,
      },
    });
  } catch (_err) {
    next(
      new AppError(
        'Invalid or expired refresh token',
        401
      )
    );
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout(
  req: AuthRequest,
  res: Response
) {
  res.clearCookie(
    COOKIE_NAMES.ACCESS_TOKEN
  );

  res.clearCookie(
    COOKIE_NAMES.REFRESH_TOKEN
  );

  if (req.user) {
    void logActivity({
      actorId: req.user.id,

      action: 'LOGOUT',

      description:
        `${req.user.fullName} logged out`,

      ipAddress: req.ip,
    }).catch((error) => {
      console.error(
        '[LOGOUT] Activity log error:',
        error
      );
    });
  }

  return res.json({
    success: true,

    message:
      'Logged out successfully',
  });
}

/**
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const email =
      String(req.body.email || '')
        .trim()
        .toLowerCase();

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    /**
     * Always return the same response so users cannot
     * discover which email addresses are registered.
     */
    if (!user) {
      return res.json({
        success: true,

        message:
          'If that email exists, a reset link has been sent.',
      });
    }

    const resetToken =
      crypto
        .randomBytes(32)
        .toString('hex');

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        resetToken,

        resetTokenExpiry:
          new Date(
            Date.now() +
              60 * 60 * 1000
          ),
      },
    });

    const resetLink =
      `${
        process.env.FRONTEND_URL ||
        'http://localhost:5173'
      }/reset-password?token=${resetToken}`;

    /**
     * Do not allow SMTP failure to expose internal
     * errors or make the request hang unnecessarily.
     */
    void sendMail({
      to: email,

      subject:
        'Reset your AskIT Technologies password',

      html:
        resetPasswordEmailTemplate(
          user.fullName,
          resetLink
        ),
    }).catch((error) => {
      console.error(
        '[PASSWORD RESET] Email error:',
        error
      );
    });

    return res.json({
      success: true,

      message:
        'If that email exists, a reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 */
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      token,
      password,
    } = req.body;

    const user =
      await prisma.user.findFirst({
        where: {
          resetToken: token,

          resetTokenExpiry: {
            gt: new Date(),
          },
        },
      });

    if (!user) {
      throw new AppError(
        'Invalid or expired reset token',
        400
      );
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    void logActivity({
      actorId: user.id,

      action:
        'PASSWORD_RESET',

      description:
        `${user.fullName} reset their password`,

      ipAddress: req.ip,
    }).catch((error) => {
      console.error(
        '[PASSWORD RESET] Activity log error:',
        error
      );
    });

    return res.json({
      success: true,

      message:
        'Password reset successfully. You can now log in.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 *
 * This endpoint is important for persistent
 * profile pictures because App.tsx calls fetchMe()
 * when the application loads.
 */
export async function getMe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user =
      await prisma.user.findUnique({
        where: {
          id: req.user!.id,
        },

        include: {
          trainerProfile: true,
          subAdminPermissions: true,
        },
      });

    if (!user) {
      throw new AppError(
        'User not found',
        404
      );
    }

    /**
     * DB contains:
     *
     * profiles/<userId>/<uuid>.jpg
     *
     * Frontend receives:
     *
     * https://storage.googleapis.com/...signed...
     */
    const safeUser =
      await prepareUserForResponse(user);

    return res.json({
      success: true,

      data: safeUser,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/profile-picture
 *
 * Uploads the current user's profile picture to
 * private Google Cloud Storage and stores only
 * the permanent GCS object path in PostgreSQL.
 *
 * Works for:
 * - Student
 * - Trainer
 * - Sub Admin
 * - Super Admin
 */
export async function updateMyProfilePicture(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  let newObjectPath:
    | string
    | null = null;

  try {
    if (!req.file) {
      throw new AppError(
        'No image uploaded',
        400
      );
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          id: req.user!.id,
        },

        select: {
          id: true,
          profilePicture: true,
        },
      });

    if (!existingUser) {
      throw new AppError(
        'User not found',
        404
      );
    }

    /**
     * Upload image to private GCS bucket.
     *
     * Returns something like:
     *
     * profiles/user-id/random-uuid.jpg
     */
    newObjectPath =
      await uploadProfilePictureToCloud(
        req.file,
        req.user!.id
      );

    /**
     * Store only object path in PostgreSQL.
     */
    const user =
      await prisma.user.update({
        where: {
          id: req.user!.id,
        },

        data: {
          profilePicture:
            newObjectPath,
        },

        include: {
          trainerProfile: true,
          subAdminPermissions: true,
        },
      });

    /**
     * Generate temporary browser-accessible URL.
     */
    const signedUrl =
      await getProfilePictureSignedUrl(
        user.profilePicture
      );

    const safeUser =
      sanitizeUser(user);

    /**
     * Delete previous GCS image only after:
     * 1. New upload succeeds
     * 2. PostgreSQL update succeeds
     *
     * Old /uploads/... values are ignored by
     * deleteCloudFile().
     */
    if (
      existingUser.profilePicture &&
      existingUser.profilePicture !==
        newObjectPath
    ) {
      void deleteCloudFile(
        existingUser.profilePicture
      );
    }

    return res.json({
      success: true,

      message:
        'Profile picture updated successfully',

      data: {
        ...safeUser,

        profilePicture:
          signedUrl,
      },
    });
  } catch (err) {
    /**
     * If GCS upload succeeded but DB update failed,
     * remove the orphaned newly-uploaded image.
     */
    if (newObjectPath) {
      void deleteCloudFile(
        newObjectPath
      );
    }

    next(err);
  }
}