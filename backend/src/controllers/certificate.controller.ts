import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { generateCertificateNumber } from '../utils/helpers';
import { generateCertificatePdf } from '../services/certificate.service';
import { logActivity } from '../services/audit.service';

// The DB stores profilePicture as a public URL path like
// "/uploads/profiles/xyz.png" — PDFKit needs an actual filesystem path to
// embed the image, so this resolves one from the other. Returns null if the
// user has no picture set, and the certificate generator falls back to an
// initial-letter avatar in that case.
function resolveProfilePicturePath(profilePicture?: string | null): string | null {
  if (!profilePicture) return null;
  return path.join(process.cwd(), profilePicture.replace(/^\//, ''));
}

// GET /api/users/certificates
export async function getMyCertificates(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { userId: req.user!.id },
      include: { internship: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: certificates });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/certificates/:id/download
//
// Downloads a certificate owned by the logged-in student.
// If Cloud Run has restarted and the locally-generated PDF has disappeared,
// regenerate it automatically before sending it.
export async function downloadMyCertificate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const certificate = await prisma.certificate.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
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

    if (
      !certificate ||
      certificate.status !== 'ISSUED'
    ) {
      throw new AppError(
        'Certificate not found or not issued yet',
        404
      );
    }

    let fileUrl = certificate.fileUrl;

    let filePath =
      fileUrl &&
      fileUrl.startsWith('/uploads/certificates/')
        ? path.join(
            process.cwd(),
            fileUrl.replace(/^\//, '')
          )
        : '';

    // Cloud Run local files are temporary.
    // If the PDF disappeared after a restart/scale-down,
    // regenerate it using the data stored in PostgreSQL.
    if (!filePath || !fs.existsSync(filePath)) {
      const issuedDate =
        certificate.issuedAt || new Date();

      fileUrl = await generateCertificatePdf({
        certificateNo: certificate.certificateNo,
        studentName: certificate.user.fullName,

        studentPhotoPath: resolveProfilePicturePath(
          certificate.user.profilePicture
        ),

        internshipTitle:
          certificate.internship.title,

        duration:
          certificate.internship.duration,

        startDate:
          certificate.internship.startDate,

        endDate:
          certificate.internship.endDate,

        trainerName:
          certificate.internship.trainer?.user.fullName,

        issuedDate,
      });

      await prisma.certificate.update({
        where: {
          id: certificate.id,
        },
        data: {
          fileUrl,
        },
      });

      filePath = path.join(
        process.cwd(),
        fileUrl.replace(/^\//, '')
      );
    }

    if (!fs.existsSync(filePath)) {
      throw new AppError(
        'Certificate PDF could not be generated',
        500
      );
    }

    res.setHeader(
      'Content-Type',
      'application/pdf'
    );

    return res.download(
      filePath,
      `${certificate.certificateNo}.pdf`
    );
  } catch (err) {
    next(err);
  }
}

// GET /api/certificates/verify/:certificateNo - public verification
export async function verifyCertificate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cert = await prisma.certificate.findUnique({
      where: { certificateNo: req.params.certificateNo },
      include: { user: true, internship: true },
    });
    if (!cert || cert.status !== 'ISSUED') {
      return res.json({ success: true, data: { valid: false } });
    }
    res.json({
      success: true,
      data: {
        valid: true,
        studentName: cert.user.fullName,
        internshipTitle: cert.internship.title,
        issuedAt: cert.issuedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/certificates/generate - body: { userId, internshipId }
export async function generateCertificate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId, internshipId } = req.body;

    const [user, internship] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.internship.findUnique({ where: { id: internshipId }, include: { trainer: { include: { user: true } } } }),
    ]);
    if (!user || !internship) throw new AppError('User or internship not found', 404);

    const certificateNo = generateCertificateNumber();
    const certificate = await prisma.certificate.create({
      data: { certificateNo, userId, internshipId, status: 'PENDING' },
    });

    res.status(201).json({ success: true, message: 'Certificate record created (pending approval)', data: certificate });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/certificates/:id/issue
export async function issueCertificate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const certificate = await prisma.certificate.findUnique({
      where: { id: req.params.id },
      include: { user: true, internship: { include: { trainer: { include: { user: true } } } } },
    });
    if (!certificate) throw new AppError('Certificate not found', 404);

    const issuedAt = new Date();
    const fileUrl = await generateCertificatePdf({
      certificateNo: certificate.certificateNo,
      studentName: certificate.user.fullName,
      studentPhotoPath: resolveProfilePicturePath(certificate.user.profilePicture),
      internshipTitle: certificate.internship.title,
      duration: certificate.internship.duration,
      startDate: certificate.internship.startDate,
      endDate: certificate.internship.endDate,
      trainerName: certificate.internship.trainer?.user.fullName,
      issuedDate: issuedAt,
    });

    const updated = await prisma.certificate.update({
      where: { id: certificate.id },
      data: { status: 'ISSUED', issuedAt, fileUrl },
    });

    await prisma.notification.create({
      data: {
        userId: certificate.userId,
        type: 'CERTIFICATE',
        title: 'Certificate Issued',
        message: `Your certificate for "${certificate.internship.title}" is ready to download.`,
      },
    });

    await logActivity({
      actorId: req.user!.id,
      action: 'CERTIFICATE_ISSUE',
      description: `Issued certificate ${certificate.certificateNo} to ${certificate.user.fullName}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Certificate issued successfully', data: updated });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/certificates/:id/reissue
export async function reissueCertificate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const certificate = await prisma.certificate.findUnique({
      where: { id: req.params.id },
      include: { user: true, internship: { include: { trainer: { include: { user: true } } } } },
    });
    if (!certificate) throw new AppError('Certificate not found', 404);

    const issuedAt = new Date();
    const fileUrl = await generateCertificatePdf({
      certificateNo: certificate.certificateNo,
      studentName: certificate.user.fullName,
      studentPhotoPath: resolveProfilePicturePath(certificate.user.profilePicture),
      internshipTitle: certificate.internship.title,
      duration: certificate.internship.duration,
      startDate: certificate.internship.startDate,
      endDate: certificate.internship.endDate,
      trainerName: certificate.internship.trainer?.user.fullName,
      issuedDate: issuedAt,
    });

    const updated = await prisma.certificate.update({
      where: { id: certificate.id },
      data: { fileUrl, issuedAt, status: 'ISSUED' },
    });

    res.json({ success: true, message: 'Certificate reissued', data: updated });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/certificates
export async function adminListCertificates(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const certificates = await prisma.certificate.findMany({
      include: { user: true, internship: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: certificates });
  } catch (err) {
    next(err);
  }
}
