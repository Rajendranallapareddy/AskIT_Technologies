import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { sanitizeUser, paginate, buildMeta } from '../utils/helpers';
import { PASSWORD_REGEX } from '../utils/constants';
import { logActivity } from '../services/audit.service';

// ---------------------------------------------------------------------------
// SUB ADMIN MANAGEMENT
// ---------------------------------------------------------------------------

// POST /api/superadmin/sub-admins
export async function createSubAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { fullName, email, mobileNumber, password, permissions } = req.body;

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { fullName, email, mobileNumber, passwordHash, role: 'SUB_ADMIN', isEmailVerified: true },
    });

    const perms = await prisma.subAdminPermission.create({
      data: { userId: user.id, ...(permissions || {}) },
    });

    await logActivity({
      actorId: req.user!.id,
      action: 'SUBADMIN_CREATE',
      description: `Created Sub Admin account for ${fullName}`,
      newValue: { user: sanitizeUser(user), permissions: perms },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'Sub Admin created successfully', data: { user: sanitizeUser(user), permissions: perms } });
  } catch (err) {
    next(err);
  }
}

// GET /api/superadmin/sub-admins
export async function listSubAdmins(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const subAdmins = await prisma.user.findMany({
      where: { role: 'SUB_ADMIN' },
      include: { subAdminPermissions: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: subAdmins.map((s) => ({ ...sanitizeUser(s), subAdminPermissions: s.subAdminPermissions })) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/superadmin/sub-admins/:id
export async function updateSubAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const allowed = ['fullName', 'email', 'mobileNumber'];
    const data: Record<string, any> = {};
    for (const key of allowed) if (req.body[key] !== undefined) data[key] = req.body[key];

    const updated = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json({ success: true, message: 'Sub Admin updated', data: sanitizeUser(updated) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/superadmin/sub-admins/:id/permissions
export async function updateSubAdminPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const permissions = await prisma.subAdminPermission.upsert({
      where: { userId: req.params.id },
      update: req.body,
      create: { userId: req.params.id, ...req.body },
    });

    await logActivity({
      actorId: req.user!.id,
      action: 'PERMISSIONS_UPDATE',
      description: `Updated permissions for Sub Admin ${req.params.id}`,
      newValue: permissions,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Permissions updated successfully', data: permissions });
  } catch (err) {
    next(err);
  }
}

// PUT /api/superadmin/sub-admins/:id/activate
export async function activateSubAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const updated = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: true } });
    res.json({ success: true, message: 'Sub Admin activated', data: sanitizeUser(updated) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/superadmin/sub-admins/:id/deactivate
export async function deactivateSubAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const updated = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Sub Admin deactivated', data: sanitizeUser(updated) });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/superadmin/sub-admins/:id
export async function deleteSubAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('Sub Admin not found', 404);
    await prisma.user.delete({ where: { id: target.id } });

    await logActivity({ actorId: req.user!.id, action: 'SUBADMIN_DELETE', description: `Deleted Sub Admin ${target.fullName}`, ipAddress: req.ip });

    res.json({ success: true, message: 'Sub Admin deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/superadmin/sub-admins/:id/reset-password
export async function resetSubAdminPassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || !PASSWORD_REGEX.test(newPassword)) {
      throw new AppError(
        'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.',
        400
      );
    }
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('Sub Admin not found', 404);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
    await logActivity({
      actorId: req.user!.id,
      action: 'SUB_ADMIN_PASSWORD_RESET',
      description: `Reset password for Sub Admin ${target.fullName}`,
      ipAddress: req.ip,
    });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

// GET /api/superadmin/sub-admins/:id/activity
export async function subAdminActivity(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const logs = await prisma.activityLog.findMany({
      where: { actorId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// SUPER ADMIN PROFILE
// ---------------------------------------------------------------------------

// PUT /api/superadmin/profile - only the Super Admin can update their own account
export async function updateOwnProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const allowed = ['fullName', 'email', 'mobileNumber'];
    const data: Record<string, any> = {};
    for (const key of allowed) if (req.body[key] !== undefined) data[key] = req.body[key];

    if (req.body.newPassword) {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      const valid = await bcrypt.compare(req.body.currentPassword || '', user!.passwordHash);
      if (!valid) throw new AppError('Current password is incorrect', 400);
      data.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    }

    const updated = await prisma.user.update({ where: { id: req.user!.id }, data });
    res.json({ success: true, message: 'Profile updated', data: sanitizeUser(updated) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// ACTIVITY LOGS
// ---------------------------------------------------------------------------

// GET /api/superadmin/activity-logs
export async function listActivityLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const { skip, take } = paginate(page, limit);
    const { search, action } = req.query as Record<string, string>;

    const where: any = {};
    if (action) where.action = action;
    if (search) where.description = { contains: search, mode: 'insensitive' };

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: { actor: { select: { fullName: true, role: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({ success: true, data: logs, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}
