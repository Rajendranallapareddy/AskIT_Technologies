import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { sanitizeUser } from '../utils/helpers';
import { logActivity } from '../services/audit.service';

// GET /api/users/dashboard - Summary data for the logged-in user's dashboard.
export async function getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    const [registrations, certificates, notifications, announcements] = await Promise.all([
      prisma.registration.findMany({
        where: { userId },
        include: { internship: { include: { trainer: { include: { user: true } } } } },
        orderBy: { appliedAt: 'desc' },
      }),
      prisma.certificate.findMany({ where: { userId }, include: { internship: true } }),
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.announcement.findMany({
        where: {
          OR: [
            { isGlobal: true },
            { internship: { registrations: { some: { userId } } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const attendanceRecords = await prisma.attendance.findMany({ where: { userId } });
    const presentCount = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
    const attendancePercentage = attendanceRecords.length
      ? Math.round((presentCount / attendanceRecords.length) * 100)
      : 0;

    const upcoming = registrations.filter(
      (r) => r.status === 'APPROVED' && new Date(r.internship.startDate) > new Date()
    );
    const active = registrations.filter(
      (r) => r.status === 'APPROVED' && new Date(r.internship.startDate) <= new Date() && new Date(r.internship.endDate) >= new Date()
    );

    res.json({
      success: true,
      data: {
        registeredInternships: registrations.length,
        upcomingInternships: upcoming,
        activeInternships: active,
        attendancePercentage,
        certificatesEarned: certificates.length,
        certificates,
        notifications,
        announcements,
        registrations,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/profile
export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/profile
export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const allowedFields = [
      'fullName', 'gender', 'dateOfBirth', 'collegeName', 'university',
      'degree', 'branch', 'graduationYear', 'address', 'city', 'state', 'country',
    ];
    const data: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }
    if (data.graduationYear) data.graduationYear = Number(data.graduationYear);
    if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);

    const user = await prisma.user.update({ where: { id: req.user!.id }, data });
    res.json({ success: true, message: 'Profile updated successfully', data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/profile/picture
export async function updateProfilePicture(req: AuthRequest, res: Response, next: NextFunction) {
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

// PUT /api/users/change-password
export async function changePassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError('User not found', 404);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError('Current password is incorrect', 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    await logActivity({ actorId: user.id, action: 'PASSWORD_CHANGE', description: `${user.fullName} changed their password`, ipAddress: req.ip });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/history
export async function getHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const registrations = await prisma.registration.findMany({
      where: { userId },
      include: {
        internship: { include: { trainer: { include: { user: true } } } },
      },
      orderBy: { appliedAt: 'desc' },
    });
    const attendance = await prisma.attendance.findMany({
      where: { userId },
      include: { session: { include: { internship: true } } },
      orderBy: { markedAt: 'desc' },
    });
    const certificates = await prisma.certificate.findMany({
      where: { userId },
      include: { internship: true },
    });

    res.json({ success: true, data: { registrations, attendance, certificates } });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/notifications
export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/notifications/:id/read
export async function markNotificationRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification || notification.userId !== req.user!.id) {
      throw new AppError('Notification not found', 404);
    }
    await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/materials — study materials for every internship the
// student is actually approved for, grouped by internship so they land
// under the right course instead of one flat, unorganized list. Previously
// there was no student-facing way to see materials at all, even though
// trainers could upload them.
export async function getMyMaterials(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const approvedRegistrations = await prisma.registration.findMany({
      where: { userId: req.user!.id, status: { in: ['APPROVED', 'COMPLETED'] } },
      select: { internshipId: true, internship: { select: { id: true, title: true, slug: true } } },
    });

    const internshipIds = approvedRegistrations.map((r) => r.internshipId);
    if (internshipIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const materials = await prisma.material.findMany({
      where: { internshipId: { in: internshipIds } },
      include: { trainer: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const grouped = approvedRegistrations.map((r) => ({
      internshipId: r.internship.id,
      internshipTitle: r.internship.title,
      internshipSlug: r.internship.slug,
      materials: materials.filter((m) => m.internshipId === r.internship.id),
    }));

    res.json({ success: true, data: grouped });
  } catch (err) {
    next(err);
  }
}
