import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { slugify, paginate, buildMeta, sanitizeUser } from '../utils/helpers';
import { PASSWORD_REGEX } from '../utils/constants';
import { logActivity } from '../services/audit.service';

// GET /api/admin/dashboard
export async function getAdminDashboard(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalUsers, activeUsers, totalTrainers, totalCourses,
      activeInternships, completedInternships, pendingRegistrations, todaysAttendance,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'USER', isActive: true } }),
      prisma.trainer.count(),
      prisma.course.count(),
      prisma.internship.count({ where: { status: { in: ['OPEN', 'ONGOING'] } } }),
      prisma.internship.count({ where: { status: 'COMPLETED' } }),
      prisma.registration.count({ where: { status: 'PENDING' } }),
      prisma.attendance.count({ where: { markedAt: { gte: startOfDay } } }),
    ]);

    const recentActivity = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { actor: { select: { fullName: true, role: true } } },
    });

    const recentContacts = await prisma.contactRequest.findMany({
      where: { status: 'NEW' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers, activeUsers, totalTrainers, totalCourses,
          activeInternships, completedInternships, pendingRegistrations, todaysAttendance,
        },
        recentActivity,
        recentContacts,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// USER MANAGEMENT
// ---------------------------------------------------------------------------

// GET /api/admin/users
export async function listUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { skip, take } = paginate(page, limit);
    const { search, role, isActive } = req.query as Record<string, string>;

    const where: any = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: users.map(sanitizeUser), meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users/:id
export async function getUserDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        registrations: { include: { internship: true } },
        attendanceRecords: true,
        certificates: { include: { internship: true } },
      },
    });
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: { ...sanitizeUser(user) } });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/users
export async function createUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const bcrypt = require('bcryptjs');
    const { fullName, email, mobileNumber, password, role } = req.body;

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { fullName, email, mobileNumber, passwordHash, role: role || 'USER', isEmailVerified: true },
    });

    // A TRAINER role is meaningless without a linked Trainer profile — every
    // trainer-facing endpoint (dashboard, participants, attendance, etc.)
    // looks the profile up by userId and 404s if it's missing. Creating it
    // here means a trainer account works immediately no matter which admin
    // screen (Users or the dedicated Trainers page) was used to create it.
    if (user.role === 'TRAINER') {
      await prisma.trainer.create({ data: { userId: user.id, expertise: [], experienceYears: 0 } });
    }

    await logActivity({ actorId: req.user!.id, action: 'USER_CREATE', description: `Created user ${fullName}`, newValue: sanitizeUser(user), ipAddress: req.ip });

    res.status(201).json({ success: true, message: 'User created successfully', data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/users/:id
export async function updateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('User not found', 404);
    if (target.isProtected) throw new AppError('This account is protected and cannot be modified', 403);

    const allowed = ['fullName', 'email', 'mobileNumber', 'city', 'state', 'country'];
    const data: Record<string, any> = {};
    for (const key of allowed) if (req.body[key] !== undefined) data[key] = req.body[key];

    const updated = await prisma.user.update({ where: { id: req.params.id }, data });

    await logActivity({ actorId: req.user!.id, action: 'USER_UPDATE', description: `Updated user ${updated.fullName}`, previousValue: sanitizeUser(target), newValue: sanitizeUser(updated), ipAddress: req.ip });

    res.json({ success: true, message: 'User updated successfully', data: sanitizeUser(updated) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/users/:id/activate
export async function activateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const updated = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: true } });
    await logActivity({ actorId: req.user!.id, action: 'USER_ACTIVATE', description: `Activated user ${updated.fullName}`, ipAddress: req.ip });
    res.json({ success: true, message: 'User activated', data: sanitizeUser(updated) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/users/:id/deactivate
export async function deactivateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('User not found', 404);
    if (target.isProtected) throw new AppError('This account is protected and cannot be deactivated', 403);

    const updated = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    await logActivity({ actorId: req.user!.id, action: 'USER_DEACTIVATE', description: `Deactivated user ${updated.fullName}`, ipAddress: req.ip });
    res.json({ success: true, message: 'User deactivated', data: sanitizeUser(updated) });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/users/:id
export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('User not found', 404);
    if (target.isProtected) throw new AppError('This account is protected and cannot be deleted', 403);

    // A user with any payment or registration history can't be hard-deleted
    // — that history has to stay intact for financial records, audit trails,
    // and refund tracking. Check for it up front so the admin gets a clear,
    // specific answer instead of a raw database error.
    const [paymentCount, registrationCount] = await Promise.all([
      prisma.payment.count({ where: { userId: target.id } }),
      prisma.registration.count({ where: { userId: target.id } }),
    ]);
    if (paymentCount > 0 || registrationCount > 0) {
      throw new AppError(
        `${target.fullName} has ${paymentCount} payment(s) and ${registrationCount} registration(s) on record. ` +
          'Deleting them would erase that financial/registration history, so this is blocked — deactivate the ' +
          'account instead if you want to prevent them from logging in.',
        409
      );
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    await logActivity({ actorId: req.user!.id, action: 'USER_DELETE', description: `Deleted user ${target.fullName}`, previousValue: sanitizeUser(target), ipAddress: req.ip });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/users/:id/reset-password
export async function adminResetPassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const bcrypt = require('bcryptjs');
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('User not found', 404);
    if (target.isProtected) throw new AppError('This account is protected', 403);

    const { newPassword } = req.body;
    if (!newPassword || !PASSWORD_REGEX.test(newPassword)) {
      throw new AppError(
        'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.',
        400
      );
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: target.id }, data: { passwordHash } });

    await logActivity({ actorId: req.user!.id, action: 'USER_PASSWORD_RESET', description: `Reset password for ${target.fullName}`, ipAddress: req.ip });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// COURSE MANAGEMENT
// ---------------------------------------------------------------------------

export async function createCourse(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, category, description, duration, syllabus, image } = req.body;
    const course = await prisma.course.create({
      data: { title, slug: slugify(title), category, description, duration, syllabus: syllabus || [], image },
    });
    res.status(201).json({ success: true, message: 'Course created', data: course });
  } catch (err) {
    next(err);
  }
}

export async function updateCourse(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const allowed = ['title', 'category', 'description', 'duration', 'syllabus', 'image', 'isActive'];
    const data: Record<string, any> = {};
    for (const key of allowed) if (req.body[key] !== undefined) data[key] = req.body[key];
    const course = await prisma.course.update({ where: { id: req.params.id }, data });
    res.json({ success: true, message: 'Course updated', data: course });
  } catch (err) {
    next(err);
  }
}

export async function deleteCourse(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.course.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// TRAINER MANAGEMENT
// ---------------------------------------------------------------------------

export async function createTrainer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const bcrypt = require('bcryptjs');
    const { fullName, email, mobileNumber, password, expertise, experienceYears, bio, availability } = req.body;

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { fullName, email, mobileNumber, passwordHash, role: 'TRAINER', isEmailVerified: true },
    });
    const trainer = await prisma.trainer.create({
      data: {
        userId: user.id,
        expertise: expertise || [],
        experienceYears: Number(experienceYears) || 0,
        bio,
        availability,
      },
      include: { user: true },
    });

    await logActivity({ actorId: req.user!.id, action: 'TRAINER_CREATE', description: `Created trainer account for ${fullName}`, ipAddress: req.ip });

    res.status(201).json({ success: true, message: 'Trainer created successfully', data: trainer });
  } catch (err) {
    next(err);
  }
}

export async function updateTrainer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.trainer.findUnique({ where: { id: req.params.id }, include: { user: true } });
    if (!existing) throw new AppError('Trainer not found', 404);

    const trainerFields = ['expertise', 'experienceYears', 'bio', 'availability'];
    const trainerData: Record<string, any> = {};
    for (const key of trainerFields) if (req.body[key] !== undefined) trainerData[key] = req.body[key];
    if (trainerData.experienceYears !== undefined) trainerData.experienceYears = Number(trainerData.experienceYears);

    // Also allow updating the trainer's underlying account details (name,
    // email, mobile) from the same form — previously an admin had to go to
    // the separate Users page to change these, which wasn't obvious.
    const userFields = ['fullName', 'email', 'mobileNumber'];
    const userData: Record<string, any> = {};
    for (const key of userFields) if (req.body[key] !== undefined) userData[key] = req.body[key];

    const [trainer] = await prisma.$transaction([
      prisma.trainer.update({ where: { id: req.params.id }, data: trainerData, include: { user: true } }),
      ...(Object.keys(userData).length ? [prisma.user.update({ where: { id: existing.userId }, data: userData })] : []),
    ]);

    // Re-fetch so the response always reflects both updates together.
    const updated = await prisma.trainer.findUnique({ where: { id: req.params.id }, include: { user: true } });

    await logActivity({ actorId: req.user!.id, action: 'TRAINER_UPDATE', description: `Updated trainer ${existing.user.fullName}`, previousValue: existing, newValue: updated, ipAddress: req.ip });

    res.json({ success: true, message: 'Trainer updated', data: updated });
  } catch (err) {
    next(err);
  }
}

export async function uploadTrainerPhoto(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError('No image uploaded', 400);
    const trainer = await prisma.trainer.update({
      where: { id: req.params.id },
      data: { photo: `/uploads/trainers/${req.file.filename}` },
    });
    res.json({ success: true, message: 'Trainer photo updated', data: trainer });
  } catch (err) {
    next(err);
  }
}

export async function deleteTrainer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const trainer = await prisma.trainer.findUnique({ where: { id: req.params.id } });
    if (!trainer) throw new AppError('Trainer not found', 404);
    await prisma.user.delete({ where: { id: trainer.userId } }); // cascades to trainer
    res.json({ success: true, message: 'Trainer deleted' });
  } catch (err) {
    next(err);
  }
}

export async function assignTrainer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { internshipId, trainerId } = req.body;
    if (!internshipId) throw new AppError('internshipId is required', 400);

    // trainerId is intentionally optional here — passing null unassigns the
    // internship's trainer instead of crashing (previously this endpoint
    // assumed a trainer was always being assigned and threw when it wasn't).
    let trainerUserId: string | null = null;
    if (trainerId) {
      const trainer = await prisma.trainer.findUnique({ where: { id: trainerId } });
      if (!trainer) throw new AppError('Trainer not found', 404);
      trainerUserId = trainer.userId;
    }

    const internship = await prisma.internship.update({
      where: { id: internshipId },
      data: { trainerId: trainerId || null },
    });

    if (trainerUserId) {
      await prisma.notification.create({
        data: {
          userId: trainerUserId,
          type: 'SYSTEM',
          title: 'New Internship Assigned',
          message: `You have been assigned to train "${internship.title}".`,
        },
      });
    }

    await logActivity({
      actorId: req.user!.id,
      action: 'TRAINER_ASSIGN',
      description: trainerId ? `Assigned trainer to "${internship.title}"` : `Removed trainer from "${internship.title}"`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: trainerId ? 'Trainer assigned successfully' : 'Trainer removed from internship', data: internship });
  } catch (err) {
    next(err);
  }
}

export async function listAllTrainers(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const trainers = await prisma.trainer.findMany({
      include: { user: true, _count: { select: { internships: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: trainers });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/trainers/:id — full profile for one trainer (qualification/
// expertise/experience/bio, plus their assigned internships), used by the
// read-only trainer detail view under Admin → Users → Trainers.
export async function getTrainerDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const trainer = await prisma.trainer.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        internships: { orderBy: { createdAt: 'desc' } },
        _count: { select: { internships: true } },
      },
    });
    if (!trainer) throw new AppError('Trainer not found', 404);
    res.json({ success: true, data: { ...trainer, user: sanitizeUser(trainer.user) } });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// ANNOUNCEMENTS (global, admin-created)
// ---------------------------------------------------------------------------

export async function createGlobalAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, message } = req.body;
    const announcement = await prisma.announcement.create({
      data: { title, message, isGlobal: true, createdById: req.user!.id },
    });

    // Broadcast to every active student in real time (+ push if opted in) —
    // this is what makes a Super Admin/Admin announcement show up as a
    // notification for students, per the requirement that authorized
    // announcements reach the relevant students.
    const students = await prisma.user.findMany({ where: { role: 'USER', isActive: true }, select: { id: true } });
    if (students.length) {
      const { notifyUsers } = await import('../services/notify.service');
      await notifyUsers(students.map((s) => s.id), {
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

    res.status(201).json({ success: true, message: 'Announcement published', data: announcement });
  } catch (err) {
    next(err);
  }
}

export async function updateAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, message } = req.body;
    const announcement = await prisma.announcement.update({
      where: { id: req.params.id },
      data: { title, message },
    });
    res.json({ success: true, message: 'Announcement updated', data: announcement });
  } catch (err) {
    next(err);
  }
}

export async function deleteAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
}

export async function listAnnouncements(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const announcements = await prisma.announcement.findMany({
      include: { internship: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: announcements });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// CONTACT MANAGEMENT
// ---------------------------------------------------------------------------

export async function listContactRequests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.query as Record<string, string>;
    const where: any = {};
    if (status) where.status = status;
    const contacts = await prisma.contactRequest.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: contacts });
  } catch (err) {
    next(err);
  }
}

export async function updateContactStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    const contact = await prisma.contactRequest.update({ where: { id: req.params.id }, data: { status } });
    res.json({ success: true, message: 'Contact request updated', data: contact });
  } catch (err) {
    next(err);
  }
}

export async function deleteContactRequest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.contactRequest.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Contact request deleted' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GALLERY MANAGEMENT
// ---------------------------------------------------------------------------

export async function uploadGalleryImage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError('No image uploaded', 400);
    const image = await prisma.galleryImage.create({
      data: {
        imageUrl: `/uploads/gallery/${req.file.filename}`,
        caption: req.body.caption,
        category: req.body.category,
      },
    });
    res.status(201).json({ success: true, message: 'Image uploaded', data: image });
  } catch (err) {
    next(err);
  }
}

export async function deleteGalleryImage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.galleryImage.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Image deleted' });
  } catch (err) {
    next(err);
  }
}
