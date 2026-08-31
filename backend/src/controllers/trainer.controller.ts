import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { paginate, buildMeta } from '../utils/helpers';

async function getTrainerRecord(userId: string) {
  let trainer = await prisma.trainer.findUnique({ where: { userId } });
  if (!trainer) {
    // Self-healing path: this only happens for TRAINER-role accounts created
    // before the linked-profile fix in admin.controller.ts's createUser. We
    // repair it automatically here rather than leaving the account
    // permanently unable to reach any trainer page.
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === 'TRAINER') {
      trainer = await prisma.trainer.create({ data: { userId, expertise: [], experienceYears: 0 } });
    } else {
      throw new AppError('Trainer profile not found', 404);
    }
  }
  return trainer;
}

// GET /api/trainer/dashboard
export async function getTrainerDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const trainer = await getTrainerRecord(req.user!.id);
    const internships = await prisma.internship.findMany({
      where: { trainerId: trainer.id },
      include: { _count: { select: { registrations: true } } },
      orderBy: { startDate: 'desc' },
    });

    const active = internships.filter((i) => i.status === 'ONGOING' || i.status === 'OPEN');
    const completed = internships.filter((i) => i.status === 'COMPLETED');

    res.json({
      success: true,
      data: {
        totalInternships: internships.length,
        activeInternships: active.length,
        completedInternships: completed.length,
        internships,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/trainer/internships/:id/participants
export async function getParticipants(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const trainer = await getTrainerRecord(req.user!.id);
    const internship = await prisma.internship.findFirst({ where: { id: req.params.id, trainerId: trainer.id } });
    if (!internship) throw new AppError('Internship not found or not assigned to you', 404);

    const registrations = await prisma.registration.findMany({
      where: { internshipId: internship.id, status: 'APPROVED' },
      include: { user: true },
    });

    res.json({ success: true, data: registrations });
  } catch (err) {
    next(err);
  }
}

// POST /api/trainer/internships/:id/materials
export async function uploadMaterial(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const trainer = await getTrainerRecord(req.user!.id);
    const internship = await prisma.internship.findFirst({ where: { id: req.params.id, trainerId: trainer.id } });
    if (!internship) throw new AppError('Internship not found or not assigned to you', 404);
    if (!req.file) throw new AppError('No file uploaded', 400);

    const material = await prisma.material.create({
      data: {
        internshipId: internship.id,
        trainerId: trainer.id,
        title: req.body.title || req.file.originalname,
        fileUrl: `/uploads/materials/${req.file.filename}`,
      },
    });

    res.status(201).json({ success: true, message: 'Material uploaded', data: material });
  } catch (err) {
    next(err);
  }
}

// GET /api/trainer/internships/:id/materials
export async function listMaterials(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const materials = await prisma.material.findMany({
      where: { internshipId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: materials });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/trainer/materials/:id — a trainer can only delete materials
// they uploaded themselves for one of their own assigned internships.
export async function deleteMaterial(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const trainer = await getTrainerRecord(req.user!.id);
    const material = await prisma.material.findUnique({ where: { id: req.params.id } });
    if (!material || material.trainerId !== trainer.id) {
      throw new AppError('Material not found', 404);
    }
    await prisma.material.delete({ where: { id: material.id } });
    res.json({ success: true, message: 'Material deleted' });
  } catch (err) {
    next(err);
  }
}

// POST /api/trainer/internships/:id/announcements
export async function postAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const trainer = await getTrainerRecord(req.user!.id);
    const internship = await prisma.internship.findFirst({ where: { id: req.params.id, trainerId: trainer.id } });
    if (!internship) throw new AppError('Internship not found or not assigned to you', 404);

    const { title, message } = req.body;
    const announcement = await prisma.announcement.create({
      data: { title, message, internshipId: internship.id, createdById: req.user!.id },
    });

    const registrations = await prisma.registration.findMany({
      where: { internshipId: internship.id, status: 'APPROVED' },
      select: { userId: true },
    });
    if (registrations.length) {
      const { notifyUsers } = await import('../services/notify.service');
      await notifyUsers(registrations.map((r) => r.userId), {
        type: 'ANNOUNCEMENT',
        title: `New Announcement: ${title}`,
        message,
        link: '/notifications',
        // Announcements matter enough to reach students off-site too, not
        // just as an in-app/push notification — see notify.service.ts.
        whatsapp: true,
        email: true,
      });
    }

    res.status(201).json({ success: true, message: 'Announcement posted', data: announcement });
  } catch (err) {
    next(err);
  }
}

// --- Public / Admin trainer directory -------------------------------------

// GET /api/trainers - public list
export async function listTrainersPublic(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const trainers = await prisma.trainer.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      success: true,
      data: trainers.map((t) => ({
        id: t.id,
        name: t.user.fullName,
        photo: t.photo || t.user.profilePicture,
        experienceYears: t.experienceYears,
        expertise: t.expertise,
        bio: t.bio,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/trainers/:id/performance - Super Admin analytics
export async function trainerPerformance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const trainer = await prisma.trainer.findUnique({
      where: { id: req.params.id },
      include: { user: true, internships: { include: { registrations: true, certificates: true } } },
    });
    if (!trainer) throw new AppError('Trainer not found', 404);

    const totalInternships = trainer.internships.length;
    const activeInternships = trainer.internships.filter((i) => i.status === 'ONGOING' || i.status === 'OPEN').length;
    const completedInternships = trainer.internships.filter((i) => i.status === 'COMPLETED').length;
    const totalStudents = trainer.internships.reduce(
      (sum, i) => sum + i.registrations.filter((r) => r.status === 'APPROVED').length,
      0
    );
    const certificatesIssued = trainer.internships.reduce(
      (sum, i) => sum + i.certificates.filter((c) => c.status === 'ISSUED').length,
      0
    );

    // Average attendance across all sessions for this trainer's internships.
    const sessions = await prisma.attendanceSession.findMany({
      where: { internshipId: { in: trainer.internships.map((i) => i.id) } },
      include: { records: true },
    });
    let totalRecords = 0;
    let presentRecords = 0;
    for (const s of sessions) {
      totalRecords += s.records.length;
      presentRecords += s.records.filter((r) => r.status === 'PRESENT').length;
    }
    const avgAttendance = totalRecords ? Math.round((presentRecords / totalRecords) * 100) : 0;

    res.json({
      success: true,
      data: {
        trainer: { id: trainer.id, name: trainer.user.fullName, photo: trainer.photo },
        totalInternships,
        activeInternships,
        completedInternships,
        totalStudents,
        certificatesIssued,
        averageAttendancePercentage: avgAttendance,
        lastActive: trainer.user.lastLoginAt,
      },
    });
  } catch (err) {
    next(err);
  }
}
