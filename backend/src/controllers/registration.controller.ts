import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { paginate, buildMeta } from '../utils/helpers';
import { logActivity } from '../services/audit.service';

// POST /api/registrations - user registers for an internship
// NOTE: this endpoint only handles FREE internships now. Paid internships
// must go through POST /api/payments/create-order + /verify, which is what
// actually enforces "no confirmed registration without payment".
export async function registerForInternship(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { internshipId } = req.body;
    const userId = req.user!.id;

    const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
    if (!internship) throw new AppError('Internship not found', 404);
    if (internship.status !== 'OPEN') throw new AppError('Registrations are not open for this internship', 400);
    if (new Date() > new Date(internship.registrationDeadline)) throw new AppError('Registration deadline has passed', 400);
    if (internship.seatsFilled >= internship.totalSeats) throw new AppError('No seats available', 400);
    if (internship.fee && Number(internship.fee) > 0) {
      throw new AppError('This internship requires payment. Use the payment checkout to register.', 400);
    }

    const existing = await prisma.registration.findUnique({
      where: { userId_internshipId: { userId, internshipId } },
    });
    if (existing && !['CANCELLED', 'REJECTED'].includes(existing.status)) {
      throw new AppError('You have already registered for this internship', 409);
    }

    const { generateRegistrationNumber } = await import('../utils/helpers');
    const registration = existing
      ? await prisma.registration.update({
          where: { id: existing.id },
          data: { status: 'PENDING', registrationNo: generateRegistrationNumber(), appliedAt: new Date(), cancelledAt: null },
        })
      : await prisma.registration.create({ data: { userId, internshipId, status: 'PENDING', registrationNo: generateRegistrationNumber() } });

    await prisma.notification.create({
      data: {
        userId,
        type: 'REGISTRATION',
        title: 'Registration Received',
        message: `Your registration for "${internship.title}" has been received and is pending approval.`,
      },
    });

    res.status(201).json({ success: true, message: 'Registration submitted successfully', data: registration });
  } catch (err) {
    next(err);
  }
}

// PUT /api/registrations/:id/cancel - user cancels before deadline
export async function cancelRegistration(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const registration = await prisma.registration.findUnique({
      where: { id: req.params.id },
      include: { internship: true },
    });
    if (!registration || registration.userId !== req.user!.id) throw new AppError('Registration not found', 404);
    if (new Date() > new Date(registration.internship.registrationDeadline)) {
      throw new AppError('Cannot cancel after the registration deadline', 400);
    }

    const updated = await prisma.registration.update({
      where: { id: registration.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    res.json({ success: true, message: 'Registration cancelled', data: updated });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/internships/:internshipId/registrations
export async function listRegistrationsForInternship(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { skip, take } = paginate(page, limit);
    const { search, status } = req.query as Record<string, string>;

    const where: any = { internshipId: req.params.internshipId };
    if (status) where.status = status;
    if (search) {
      where.user = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [registrations, total] = await Promise.all([
      prisma.registration.findMany({
        where,
        include: { user: true },
        orderBy: { appliedAt: 'desc' },
        skip,
        take,
      }),
      prisma.registration.count({ where }),
    ]);

    res.json({ success: true, data: registrations, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/registrations/:id/approve
export async function approveRegistration(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const registration = await prisma.registration.findUnique({
      where: { id: req.params.id },
      include: { internship: true, user: true },
    });
    if (!registration) throw new AppError('Registration not found', 404);
    if (registration.internship.seatsFilled >= registration.internship.totalSeats) {
      throw new AppError('No seats remaining', 400);
    }

    const [updated] = await prisma.$transaction([
      prisma.registration.update({
        where: { id: registration.id },
        data: { status: 'APPROVED', decidedAt: new Date() },
      }),
      prisma.internship.update({
        where: { id: registration.internshipId },
        data: { seatsFilled: { increment: 1 } },
      }),
      prisma.notification.create({
        data: {
          userId: registration.userId,
          type: 'REGISTRATION',
          title: 'Registration Approved',
          message: `You're in! Your registration for "${registration.internship.title}" has been approved.`,
        },
      }),
    ]);

    await logActivity({
      actorId: req.user!.id,
      action: 'REGISTRATION_APPROVE',
      description: `Approved ${registration.user.fullName}'s registration for "${registration.internship.title}"`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Registration approved', data: updated });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/registrations/:id/reject
export async function rejectRegistration(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const registration = await prisma.registration.findUnique({
      where: { id: req.params.id },
      include: { internship: true },
    });
    if (!registration) throw new AppError('Registration not found', 404);

    const updated = await prisma.registration.update({
      where: { id: registration.id },
      data: { status: 'REJECTED', decidedAt: new Date() },
    });

    await prisma.notification.create({
      data: {
        userId: registration.userId,
        type: 'REGISTRATION',
        title: 'Registration Update',
        message: `Your registration for "${registration.internship.title}" was not approved this time.`,
      },
    });

    res.json({ success: true, message: 'Registration rejected', data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/registrations/:id
export async function removeRegistration(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const registration = await prisma.registration.findUnique({ where: { id: req.params.id }, include: { user: true, internship: true } });
    if (!registration) throw new AppError('Registration not found', 404);

    await prisma.$transaction([
      // Unlink (not cascade-delete) any payment history tied to this
      // registration first — a payment must survive for financial/audit
      // records even after the registration itself is removed. Deleting the
      // registration with a payment still pointing at it would otherwise
      // fail the same way the user-delete FK issue did.
      prisma.payment.updateMany({ where: { registrationId: registration.id }, data: { registrationId: null } }),
      // Free up the seat if it was counted as filled.
      ...(['APPROVED', 'COMPLETED'].includes(registration.status)
        ? [prisma.internship.update({ where: { id: registration.internshipId }, data: { seatsFilled: { decrement: 1 } } })]
        : []),
      prisma.registration.delete({ where: { id: req.params.id } }),
    ]);

    await logActivity({
      actorId: req.user!.id,
      action: 'REGISTRATION_REMOVE',
      description: `Removed ${registration.user.fullName}'s registration for "${registration.internship.title}"`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Registration removed and seat freed up' });
  } catch (err) {
    next(err);
  }
}
