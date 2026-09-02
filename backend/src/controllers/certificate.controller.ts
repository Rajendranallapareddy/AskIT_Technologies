import {
  Request,
  Response,
  NextFunction,
} from 'express';

import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { generateCertificateNumber } from '../utils/helpers';

import {
  generateCertificatePdf,
  getCertificateSignedUrl,
} from '../services/certificate.service';

import { logActivity } from '../services/audit.service';
import { sendMail } from '../services/email.service';

async function buildCertificatePdf(
  certificate: any,
  issuedAt: Date
): Promise<string> {
  return generateCertificatePdf({
    certificateNo:
      certificate.certificateNo,

    studentName:
      certificate.user.fullName,

    studentPhoto:
      certificate.user.profilePicture,

    internshipTitle:
      certificate.internship.title,

    duration:
      certificate.internship.duration,

    startDate:
      certificate.internship.startDate,

    endDate:
      certificate.internship.endDate,

    trainerName:
      certificate.internship
        .trainer?.user
        ?.fullName || null,

    issuedDate:
      issuedAt,
  });
}

// GET /api/users/certificates
export async function getMyCertificates(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const certificates =
      await prisma.certificate.findMany({
        where: {
          userId: req.user!.id,
        },

        include: {
          internship: true,
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    res.json({
      success: true,
      data: certificates,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/public/certificates/verify/:certificateNo
export async function verifyCertificate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const cert =
      await prisma.certificate.findUnique({
        where: {
          certificateNo:
            req.params
              .certificateNo,
        },

        include: {
          user: true,
          internship: true,
        },
      });

    if (
      !cert ||
      cert.status !== 'ISSUED'
    ) {
      return res.json({
        success: true,
        data: {
          valid: false,
        },
      });
    }

    return res.json({
      success: true,

      data: {
        valid: true,

        certificateNo:
          cert.certificateNo,

        studentName:
          cert.user.fullName,

        internshipTitle:
          cert.internship.title,

        duration:
          cert.internship.duration,

        startDate:
          cert.internship.startDate,

        endDate:
          cert.internship.endDate,

        issuedAt:
          cert.issuedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/certificates/generate
export async function generateCertificate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      userId,
      internshipId,
    } = req.body;

    if (
      !userId ||
      !internshipId
    ) {
      throw new AppError(
        'userId and internshipId are required',
        400
      );
    }

    const [
      user,
      internship,
      existing,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },
      }),

      prisma.internship.findUnique({
        where: {
          id: internshipId,
        },
      }),

      prisma.certificate.findFirst({
        where: {
          userId,
          internshipId,
        },
      }),
    ]);

    if (
      !user ||
      !internship
    ) {
      throw new AppError(
        'User or internship not found',
        404
      );
    }

    if (existing) {
      throw new AppError(
        `A certificate already exists for this student and internship (${existing.certificateNo}).`,
        409
      );
    }

    const certificateNo =
      generateCertificateNumber();

    const certificate =
      await prisma.certificate.create({
        data: {
          certificateNo,
          userId,
          internshipId,
          status: 'PENDING',
        },
      });

    return res
      .status(201)
      .json({
        success: true,

        message:
          'Certificate record created and is ready to issue.',

        data: certificate,
      });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/certificates/:id/issue
export async function issueCertificate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const certificate =
      await prisma.certificate.findUnique({
        where: {
          id: req.params.id,
        },

        include: {
          user: true,

          internship: {
            include: {
              trainer: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      });

    if (!certificate) {
      throw new AppError(
        'Certificate not found',
        404
      );
    }

    const issuedAt =
      new Date();

    const objectPath =
      await buildCertificatePdf(
        certificate,
        issuedAt
      );

    const updated =
      await prisma.certificate.update({
        where: {
          id: certificate.id,
        },

        data: {
          status: 'ISSUED',
          issuedAt,
          fileUrl: objectPath,
        },
      });

    await prisma.notification.create({
      data: {
        userId:
          certificate.userId,

        type: 'CERTIFICATE',

        title:
          'Certificate Issued',

        message:
          `Your certificate for "${certificate.internship.title}" is ready to download.`,
      },
    });

    const frontendUrl =
      process.env.FRONTEND_URL
        ?.replace(/\/+$/, '') ||
      'http://localhost:5173';

    const myCertificatesUrl =
      `${frontendUrl}/my-certificates`;

    const verificationUrl =
      `${frontendUrl}/verify-certificate/${encodeURIComponent(
        certificate.certificateNo
      )}`;

    void sendMail({
      to: certificate.user.email,

      subject:
        `Your AskIT Certificate — ${certificate.certificateNo}`,

      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:auto;color:#1f2937;line-height:1.6">

          <div style="background:#0b2868;padding:22px;text-align:center;color:#fff">
            <h2 style="margin:0">
              AskIT Technologies
            </h2>
          </div>

          <div style="padding:24px;border:1px solid #e5e7eb;border-top:none">

            <p>
              Hi ${certificate.user.fullName},
            </p>

            <p>
              Congratulations! Your internship completion certificate for
              <strong>${certificate.internship.title}</strong>
              has been issued.
            </p>

            <p>
              <strong>Certificate No:</strong>
              ${certificate.certificateNo}
            </p>

            <p style="margin:24px 0">
              <a
                href="${myCertificatesUrl}"
                style="background:#f97316;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:700"
              >
                Download Certificate
              </a>
            </p>

            <p style="font-size:13px;color:#6b7280">
              Public verification:
              <a href="${verificationUrl}">
                ${verificationUrl}
              </a>
            </p>

            <p>
              Regards,
              <br/>
              <strong>
                AskIT Technologies
              </strong>
            </p>

          </div>
        </div>
      `,
    }).catch((error) => {
      console.error(
        '[CERTIFICATE] Certificate email error:',
        error
      );
    });

    await logActivity({
      actorId:
        req.user!.id,

      action:
        'CERTIFICATE_ISSUE',

      description:
        `Issued certificate ${certificate.certificateNo} to ${certificate.user.fullName}`,

      ipAddress:
        req.ip,
    });

    return res.json({
      success: true,

      message:
        'Certificate issued successfully',

      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/certificates/:id/reissue
export async function reissueCertificate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const certificate =
      await prisma.certificate.findUnique({
        where: {
          id: req.params.id,
        },

        include: {
          user: true,

          internship: {
            include: {
              trainer: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      });

    if (!certificate) {
      throw new AppError(
        'Certificate not found',
        404
      );
    }

    const issuedAt =
      new Date();

    const objectPath =
      await buildCertificatePdf(
        certificate,
        issuedAt
      );

    const updated =
      await prisma.certificate.update({
        where: {
          id: certificate.id,
        },

        data: {
          fileUrl:
            objectPath,

          issuedAt,

          status:
            'ISSUED',
        },
      });

    await logActivity({
      actorId:
        req.user!.id,

      action:
        'CERTIFICATE_REISSUE',

      description:
        `Reissued certificate ${certificate.certificateNo} for ${certificate.user.fullName}`,

      ipAddress:
        req.ip,
    });

    return res.json({
      success: true,

      message:
        'Certificate regenerated with the latest template.',

      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/certificates
export async function adminListCertificates(
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const certificates =
      await prisma.certificate.findMany({
        include: {
          user: true,
          internship: true,
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    return res.json({
      success: true,
      data: certificates,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Secure certificate download.
 *
 * Student:
 * GET /api/users/certificates/:id/download
 *
 * Admin:
 * GET /api/admin/certificates/:id/download
 *
 * Old /uploads certificates are automatically
 * regenerated into Cloud Storage.
 */
export async function downloadCertificate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const certificate =
      await prisma.certificate.findUnique({
        where: {
          id: req.params.id,
        },

        include: {
          user: true,

          internship: {
            include: {
              trainer: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      });

    if (!certificate) {
      throw new AppError(
        'Certificate not found',
        404
      );
    }

    const isOwner =
      certificate.userId ===
      req.user!.id;

    const isAdmin =
      [
        'SUPER_ADMIN',
        'SUB_ADMIN',
      ].includes(
        req.user!.role
      );

    if (
      !isOwner &&
      !isAdmin
    ) {
      throw new AppError(
        'You do not have access to this certificate',
        403
      );
    }

    if (
      certificate.status !==
      'ISSUED'
    ) {
      throw new AppError(
        'This certificate has not been issued yet',
        400
      );
    }

    let objectPath =
      certificate.fileUrl;

    // Automatically repair certificates
    // previously stored on Cloud Run local disk.
    if (
      !objectPath ||
      objectPath.startsWith(
        '/uploads/'
      )
    ) {
      console.log(
        `[CERTIFICATE] Migrating legacy certificate ${certificate.certificateNo}`
      );

      const issuedAt =
        certificate.issuedAt ||
        new Date();

      objectPath =
        await buildCertificatePdf(
          certificate,
          issuedAt
        );

      await prisma.certificate.update({
        where: {
          id: certificate.id,
        },

        data: {
          fileUrl:
            objectPath,

          issuedAt,

          status:
            'ISSUED',
        },
      });
    }

    const signedUrl =
      await getCertificateSignedUrl(
        objectPath
      );

    return res.json({
      success: true,

      data: {
        certificateNo:
          certificate.certificateNo,

        fileUrl:
          signedUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}