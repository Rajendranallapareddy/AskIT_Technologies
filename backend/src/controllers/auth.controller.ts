import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import {
  validatePublicEmail,
} from '../utils/emailValidation';

import {
  registrationOtpEmailTemplate,
  passwordResetOtpEmailTemplate,
} from '../services/otpEmail.service';

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

import { sendMail } from '../services/email.service';

import {
  uploadProfilePictureToCloud,
  getProfilePictureSignedUrl,
  deleteCloudFile,
} from '../services/cloudStorage.service';

import {
  notifyAdmins,
  notifyUser,
} from '../services/notify.service';

function generateOtp(): string {
  return crypto
    .randomInt(
      100000,
      1000000
    )
    .toString();
}

function hashOtp(
  otp: string
): string {
  return crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');
}

const OTP_EXPIRY_MS =
  10 * 60 * 1000;

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
/**
 * POST /api/auth/register
 *
 * Creates an unverified student account
 * and sends a 6-digit email OTP.
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

    const emailValidation =
      validatePublicEmail(email);

    if (!emailValidation.valid) {
      throw new AppError(
        emailValidation.message ||
          'Please enter a valid email address.',
        400
      );
    }

    const normalizedEmail =
      emailValidation.email;

    const normalizedMobile =
      String(mobileNumber || '').trim();

    if (
      !fullName ||
      !normalizedMobile ||
      !password
    ) {
      throw new AppError(
        'Full name, email, mobile number and password are required.',
        400
      );
    }

    if (String(password).length < 8) {
      throw new AppError(
        'Password must contain at least 8 characters.',
        400
      );
    }

    /*
     * Only check REAL accounts here.
     * No User record is created before OTP verification.
     */
    const existingUser =
      await prisma.user.findFirst({
        where: {
          OR: [
            { email: normalizedEmail },
            { mobileNumber: normalizedMobile },
          ],
        },
      });

    if (existingUser) {
      if (
        existingUser.email.toLowerCase() ===
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

    /*
     * Prevent the same mobile number from being used by a
     * different pending registration.
     */
    const pendingWithMobile =
      await prisma.pendingRegistration.findFirst({
        where: {
          mobileNumber: normalizedMobile,
          NOT: {
            email: normalizedEmail,
          },
        },
      });

    if (pendingWithMobile) {
      throw new AppError(
        'This mobile number is already being used for another pending registration.',
        409
      );
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = new Date(
      Date.now() + OTP_EXPIRY_MS
    );

    const passwordHash =
      await bcrypt.hash(
        String(password),
        12
      );

    /*
     * IMPORTANT:
     * Save only to PendingRegistration.
     * The actual User account does not exist yet.
     */
    await prisma.pendingRegistration.upsert({
      where: {
        email: normalizedEmail,
      },
      update: {
        fullName: String(fullName).trim(),
        mobileNumber: normalizedMobile,
        passwordHash,
        gender: gender || null,
        dateOfBirth: dateOfBirth || null,
        collegeName:
          collegeName?.trim() || null,
        university:
          university?.trim() || null,
        degree:
          degree?.trim() || null,
        branch:
          branch?.trim() || null,
        graduationYear:
          graduationYear
            ? Number(graduationYear)
            : null,
        address:
          address?.trim() || null,
        city:
          city?.trim() || null,
        state:
          state?.trim() || null,
        country:
          country?.trim() || 'India',
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
      },
      create: {
        fullName: String(fullName).trim(),
        email: normalizedEmail,
        mobileNumber: normalizedMobile,
        passwordHash,
        gender: gender || null,
        dateOfBirth: dateOfBirth || null,
        collegeName:
          collegeName?.trim() || null,
        university:
          university?.trim() || null,
        degree:
          degree?.trim() || null,
        branch:
          branch?.trim() || null,
        graduationYear:
          graduationYear
            ? Number(graduationYear)
            : null,
        address:
          address?.trim() || null,
        city:
          city?.trim() || null,
        state:
          state?.trim() || null,
        country:
          country?.trim() || 'India',
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
      },
    });

    const sent = await sendMail({
      to: normalizedEmail,
      subject:
        'AskIT Technologies - Your Verification OTP',
      html: registrationOtpEmailTemplate(
        String(fullName).trim(),
        otp
      ),
    });

    if (!sent) {
      console.error(
        `[REGISTER OTP] Unable to send OTP to ${normalizedEmail}`
      );

      throw new AppError(
        'Unable to send verification OTP right now. Please try again.',
        503
      );
    }

    return res.status(200).json({
      success: true,
      message:
        'Verification OTP has been sent to your email. Your account will be created only after successful OTP verification.',
      data: {
        email: normalizedEmail,
        requiresOtp: true,
        otpExpiresIn: 600,
      },
    });
  } catch (err) {
    next(err);
  }
}


/**
 * POST /api/auth/verify-email
 *
 * Body:
 * {
 *   email: string,
 *   otp: string
 * }
 *
 * IMPORTANT:
 * The actual User is created only after OTP verification succeeds.
 */
export async function verifyEmail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const emailValidation = validatePublicEmail(
      req.body.email
    );

    if (!emailValidation.valid) {
      throw new AppError(
        'Please enter a valid email address.',
        400
      );
    }

    const email = emailValidation.email;

    const otp = String(
      req.body.otp || ''
    ).trim();

    if (!otp) {
      throw new AppError(
        'Please enter the verification OTP.',
        400
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      throw new AppError(
        'OTP must be exactly 6 digits.',
        400
      );
    }

    /*
     * Registration data lives here until
     * verification succeeds.
     */
    const pending =
      await prisma.pendingRegistration.findUnique({
        where: {
          email,
        },
      });

    if (!pending) {
      /*
       * It may already have been successfully verified.
       */
      const existingUser =
        await prisma.user.findUnique({
          where: {
            email,
          },
        });

      if (
        existingUser &&
        existingUser.isEmailVerified
      ) {
        return res.json({
          success: true,
          message:
            'Your email is already verified. Please login.',
        });
      }

      throw new AppError(
        'Registration not found. Please register again.',
        404
      );
    }

    /*
     * Check expiration first.
     */
    if (
      pending.otpExpiresAt.getTime() <
      Date.now()
    ) {
      throw new AppError(
        'Your verification OTP has expired. Please click Resend OTP to receive a new code.',
        400
      );
    }

    /*
     * Limit repeated invalid attempts.
     */
    if (pending.otpAttempts >= 5) {
      throw new AppError(
        'Too many incorrect OTP attempts. Please request a new OTP.',
        429
      );
    }

    const submittedHash =
      hashOtp(otp);

    const submittedBuffer =
      Buffer.from(
        submittedHash,
        'hex'
      );

    const storedBuffer =
      Buffer.from(
        pending.otpHash,
        'hex'
      );

    let validOtp = false;

    /*
     * timingSafeEqual requires equal length buffers.
     */
    if (
      submittedBuffer.length ===
      storedBuffer.length
    ) {
      validOtp =
        crypto.timingSafeEqual(
          submittedBuffer,
          storedBuffer
        );
    }

    if (!validOtp) {
      const attempts =
        pending.otpAttempts + 1;

      await prisma.pendingRegistration.update({
        where: {
          id: pending.id,
        },

        data: {
          otpAttempts: {
            increment: 1,
          },
        },
      });

      const remaining =
        Math.max(
          0,
          5 - attempts
        );

      if (remaining === 0) {
        throw new AppError(
          'Incorrect OTP. Too many failed attempts. Please request a new OTP.',
          429
        );
      }

      throw new AppError(
        `Incorrect OTP. Please check the code and try again. ${remaining} attempt${
          remaining === 1 ? '' : 's'
        } remaining.`,
        400
      );
    }

    /*
     * Re-check before creating User in case another
     * request completed verification simultaneously.
     */
    const existingUser =
      await prisma.user.findFirst({
        where: {
          OR: [
            {
              email:
                pending.email,
            },
            {
              mobileNumber:
                pending.mobileNumber,
            },
          ],
        },
      });

    if (existingUser) {
      /*
       * If same email already became verified,
       * remove stale pending registration.
       */
      if (
        existingUser.email ===
        pending.email
      ) {
        await prisma.pendingRegistration.delete({
          where: {
            id: pending.id,
          },
        });

        return res.json({
          success: true,
          message:
            'Your email is already verified. Please login.',
        });
      }

      throw new AppError(
        'This mobile number is already associated with another account.',
        409
      );
    }

    /*
     * Create the real User and remove PendingRegistration
     * atomically.
     */
    const user =
      await prisma.$transaction(
        async (tx) => {
          const createdUser =
            await tx.user.create({
              data: {
                fullName:
                  pending.fullName,

                email:
                  pending.email,

                mobileNumber:
                  pending.mobileNumber,

                passwordHash:
                  pending.passwordHash,

                gender:
                  pending.gender,

                dateOfBirth:
                  pending.dateOfBirth,

                collegeName:
                  pending.collegeName,

                university:
                  pending.university,

                degree:
                  pending.degree,

                branch:
                  pending.branch,

                graduationYear:
                  pending.graduationYear,

                address:
                  pending.address,

                city:
                  pending.city,

                state:
                  pending.state,

                country:
                  pending.country,

                role:
                  'USER',

                isActive:
                  true,

                isEmailVerified:
                  true,

                emailVerifyToken:
                  null,

                emailVerifyTokenExpiry:
                  null,
              },
            });

          await tx.pendingRegistration.delete({
            where: {
              id: pending.id,
            },
          });

          return createdUser;
        }
      );

    /*
     * Notifications must not break verification.
     */
    void notifyAdmins({
      type: 'REGISTRATION',

      title:
        'New Student Registered',

      message:
        `${user.fullName} created and verified a new AskIT Technologies account. Email: ${user.email}`,

      link:
        '/admin/users/students',

      push: true,
      email: true,
      whatsapp: false,
    }).catch((error) => {
      console.error(
        '[VERIFY EMAIL] Admin notification error:',
        error
      );
    });

    void notifyUser({
      userId:
        user.id,

      type:
        'REGISTRATION',

      title:
        'Welcome to AskIT Technologies',

      message:
        'Your email has been verified and your account is ready.',

      link:
        '/dashboard',

      push: true,
      email: false,
      whatsapp: false,
    }).catch((error) => {
      console.error(
        '[VERIFY EMAIL] Welcome notification error:',
        error
      );
    });

    void logActivity({
      actorId:
        user.id,

      action:
        'EMAIL_VERIFIED',

      description:
        `${user.fullName} verified their email address`,

      ipAddress:
        req.ip,
    }).catch((error) => {
      console.error(
        '[VERIFY EMAIL] Activity log error:',
        error
      );
    });

    return res.json({
      success: true,

      message:
        'Email verified successfully. Your account has been created. You can now login.',
    });
  } catch (err) {
    next(err);
  }
}


/**
 * POST /api/auth/resend-verification-otp
 *
 * Body:
 * {
 *   email: string
 * }
 */
export async function resendVerificationOtp(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const emailValidation =
      validatePublicEmail(
        req.body.email
      );

    if (!emailValidation.valid) {
      throw new AppError(
        'Please enter a valid email address.',
        400
      );
    }

    const email =
      emailValidation.email;

    /*
     * Resend must use PendingRegistration,
     * NOT User.
     */
    const pending =
      await prisma.pendingRegistration.findUnique({
        where: {
          email,
        },
      });

    if (!pending) {
      const existingUser =
        await prisma.user.findUnique({
          where: {
            email,
          },
        });

      if (
        existingUser &&
        existingUser.isEmailVerified
      ) {
        throw new AppError(
          'This email is already verified. Please login.',
          400
        );
      }

      throw new AppError(
        'Pending registration was not found. Please register again.',
        404
      );
    }

    const otp =
      generateOtp();

    const otpHash =
      hashOtp(otp);

    const otpExpiresAt =
      new Date(
        Date.now() +
          OTP_EXPIRY_MS
      );

    /*
     * New OTP also resets incorrect-attempt count.
     */
    await prisma.pendingRegistration.update({
      where: {
        id: pending.id,
      },

      data: {
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
      },
    });

    const sent =
      await sendMail({
        to:
          pending.email,

        subject:
          'AskIT Technologies - New Verification OTP',

        html:
          registrationOtpEmailTemplate(
            pending.fullName,
            otp
          ),
      });

    if (!sent) {
      throw new AppError(
        'We could not send the OTP right now. Please try again shortly.',
        503
      );
    }

    return res.json({
      success: true,

      message:
        'A new verification OTP has been sent to your email.',
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

    if (
  !user.isEmailVerified
) {
  throw new AppError(
    'Please verify your email using the OTP before logging in.',
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
 *
 * Sends password-reset OTP.
 */
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const emailValidation =
      validatePublicEmail(
        req.body.email
      );

    /*
     * Keep a generic response to avoid
     * exposing registered email addresses.
     */
    if (
      !emailValidation.valid
    ) {
      return res.json({
        success: true,

        message:
          'If this email is registered, a password reset OTP has been sent.',
      });
    }

    const email =
      emailValidation.email;

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (
      !user ||
      !user.isActive
    ) {
      return res.json({
        success: true,

        message:
          'If this email is registered, a password reset OTP has been sent.',
      });
    }

    const otp =
      generateOtp();

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        resetToken:
          hashOtp(otp),

        resetTokenExpiry:
          new Date(
            Date.now() +
              OTP_EXPIRY_MS
          ),
      },
    });

    const sent =
      await sendMail({
        to: email,

        subject:
          'AskIT Technologies - Password Reset OTP',

        html:
          passwordResetOtpEmailTemplate(
            user.fullName,
            otp
          ),
      });

    if (!sent) {
      console.error(
        `[PASSWORD RESET] OTP email could not be sent to ${email}`
      );
    }

    return res.json({
      success: true,

      message:
        'If this email is registered, a password reset OTP has been sent.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 *
 * Body:
 * {
 *   email,
 *   otp,
 *   password
 * }
 */
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      email,
      otp,
      password,
    } = req.body;

    const emailValidation =
      validatePublicEmail(
        email
      );

    if (
      !emailValidation.valid
    ) {
      throw new AppError(
        'Invalid email or OTP.',
        400
      );
    }

    const cleanOtp =
      String(otp || '')
        .trim();

    if (
      !/^\d{6}$/.test(
        cleanOtp
      )
    ) {
      throw new AppError(
        'Please enter the 6-digit OTP.',
        400
      );
    }

    if (
      !password ||
      String(password).length <
        8
    ) {
      throw new AppError(
        'New password must contain at least 8 characters.',
        400
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email:
            emailValidation.email,
        },
      });

    if (
      !user ||
      !user.resetToken ||
      !user.resetTokenExpiry
    ) {
      throw new AppError(
        'Invalid or expired OTP.',
        400
      );
    }

    if (
      user.resetTokenExpiry <
      new Date()
    ) {
      throw new AppError(
        'Password reset OTP has expired. Please request a new OTP.',
        400
      );
    }

    const submittedHash =
      hashOtp(
        cleanOtp
      );

    const validOtp =
      crypto.timingSafeEqual(
        Buffer.from(
          submittedHash,
          'hex'
        ),
        Buffer.from(
          user.resetToken,
          'hex'
        )
      );

    if (!validOtp) {
      throw new AppError(
        'Incorrect password reset OTP.',
        400
      );
    }

    const passwordHash =
      await bcrypt.hash(
        String(password),
        12
      );

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        passwordHash,

        resetToken:
          null,

        resetTokenExpiry:
          null,
      },
    });

    void logActivity({
      actorId:
        user.id,

      action:
        'PASSWORD_RESET',

      description:
        `${user.fullName} reset their password using email OTP`,

      ipAddress:
        req.ip,
    }).catch(
      (error) => {
        console.error(
          '[PASSWORD RESET] Activity log error:',
          error
        );
      }
    );

    return res.json({
      success: true,

      message:
        'Password changed successfully. You can now login with your new password.',
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