import { Response, NextFunction } from 'express';
import { Request } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { slugify, paginate, buildMeta } from '../utils/helpers';
import { logActivity } from '../services/audit.service';

// GET /api/internships - public browse with search & filter
export async function listInternships(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, mode, status, courseId } = req.query as Record<string, string>;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 9;
    const { skip, take } = paginate(page, limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (mode) where.mode = mode;
    if (status) where.status = status;
    else where.status = { in: ['OPEN', 'ONGOING'] }; // default: show active ones publicly
    if (courseId) where.courseId = courseId;

    const [internships, total] = await Promise.all([
      prisma.internship.findMany({
        where,
        include: { course: true, trainer: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.internship.count({ where }),
    ]);

    res.json({ success: true, data: internships, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/internships/:slug
export async function getInternshipBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const internship = await prisma.internship.findUnique({
      where: { slug: req.params.slug },
      include: { course: true, trainer: { include: { user: true } }, announcements: true },
    });
    if (!internship) throw new AppError('Internship not found', 404);
    res.json({ success: true, data: internship });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/internships
export async function createInternship(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      title, description, courseId, trainerId, duration,
      startDate, endDate, registrationDeadline, totalSeats, mode, fee, status,
      earlyBirdFee, earlyBirdDeadline, gstPercentage,
    } = req.body;

    const internship = await prisma.internship.create({
      data: {
        title,
        slug: slugify(title),
        description,
        courseId: courseId || undefined,
        trainerId: trainerId || undefined,
        duration,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationDeadline: new Date(registrationDeadline),
        totalSeats: Number(totalSeats),
        mode,
        fee: fee ? Number(fee) : undefined,
        earlyBirdFee: earlyBirdFee ? Number(earlyBirdFee) : undefined,
        earlyBirdDeadline: earlyBirdDeadline ? new Date(earlyBirdDeadline) : undefined,
        gstPercentage: gstPercentage ? Number(gstPercentage) : undefined,
        status: status || 'DRAFT',
        createdById: req.user!.id,
      },
    });

    await logActivity({
      actorId: req.user!.id,
      action: 'INTERNSHIP_CREATE',
      description: `Created internship "${internship.title}"`,
      newValue: internship,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'Internship created successfully', data: internship });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/internships/:id
export async function updateInternship(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.internship.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Internship not found', 404);

    const updatable = [
      'title', 'description', 'courseId', 'trainerId', 'duration', 'totalSeats',
      'mode', 'fee', 'status', 'earlyBirdFee', 'gstPercentage',
    ];
    const data: Record<string, any> = {};
    for (const key of updatable) if (req.body[key] !== undefined) data[key] = req.body[key];
    if (req.body.startDate) data.startDate = new Date(req.body.startDate);
    if (req.body.endDate) data.endDate = new Date(req.body.endDate);
    if (req.body.registrationDeadline) data.registrationDeadline = new Date(req.body.registrationDeadline);
    if (req.body.earlyBirdDeadline !== undefined) data.earlyBirdDeadline = req.body.earlyBirdDeadline ? new Date(req.body.earlyBirdDeadline) : null;
    if (req.body.totalSeats) data.totalSeats = Number(req.body.totalSeats);
    if (req.body.fee !== undefined) data.fee = req.body.fee ? Number(req.body.fee) : null;
    if (req.body.earlyBirdFee !== undefined) data.earlyBirdFee = req.body.earlyBirdFee ? Number(req.body.earlyBirdFee) : null;
    if (req.body.gstPercentage !== undefined) data.gstPercentage = Number(req.body.gstPercentage);

    const updated = await prisma.internship.update({ where: { id: req.params.id }, data });

    await logActivity({
      actorId: req.user!.id,
      action: 'INTERNSHIP_UPDATE',
      description: `Updated internship "${updated.title}"`,
      previousValue: existing,
      newValue: updated,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Internship updated successfully', data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/internships/:id
export async function deleteInternship(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.internship.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Internship not found', 404);

    await prisma.internship.delete({ where: { id: req.params.id } });

    await logActivity({
      actorId: req.user!.id,
      action: 'INTERNSHIP_DELETE',
      description: `Deleted internship "${existing.title}"`,
      previousValue: existing,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Internship deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/internships/:id/archive
export async function archiveInternship(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const updated = await prisma.internship.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' },
    });
    res.json({ success: true, message: 'Internship archived', data: updated });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/internships/:id/duplicate
export async function duplicateInternship(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const original = await prisma.internship.findUnique({ where: { id: req.params.id } });
    if (!original) throw new AppError('Internship not found', 404);

    const copy = await prisma.internship.create({
      data: {
        title: `${original.title} (Copy)`,
        slug: slugify(`${original.title}-copy`),
        description: original.description,
        courseId: original.courseId,
        trainerId: original.trainerId,
        duration: original.duration,
        startDate: original.startDate,
        endDate: original.endDate,
        registrationDeadline: original.registrationDeadline,
        totalSeats: original.totalSeats,
        mode: original.mode,
        fee: original.fee ?? undefined,
        status: 'DRAFT',
        createdById: req.user!.id,
      },
    });

    res.status(201).json({ success: true, message: 'Internship duplicated', data: copy });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/internships - full admin list (any status)
export async function adminListInternships(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { skip, take } = paginate(page, limit);
    const { search, status } = req.query as Record<string, string>;

    const where: any = {};
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (status) where.status = status;

    const [internships, total] = await Promise.all([
      prisma.internship.findMany({
        where,
        include: { trainer: { include: { user: true } }, _count: { select: { registrations: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.internship.count({ where }),
    ]);

    res.json({ success: true, data: internships, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}
