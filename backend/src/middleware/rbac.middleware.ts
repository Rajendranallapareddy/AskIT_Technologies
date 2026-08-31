import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { prisma } from '../config/db';

// Restrict a route to one or more roles.
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }
    next();
  };
}

// Sub Admins only get access to a route if the Super Admin has explicitly
// granted the named permission. Super Admins always pass.
export function requirePermission(permissionKey: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (req.user.role === 'SUPER_ADMIN') return next();
    if (req.user.role !== 'SUB_ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const perms = await prisma.subAdminPermission.findUnique({ where: { userId: req.user.id } });
    if (!perms || !(perms as any)[permissionKey]) {
      return res.status(403).json({
        success: false,
        message: `You don't have the "${permissionKey}" permission. Ask a Super Admin to grant it under Admin → Permissions.`,
      });
    }
    next();
  };
}

// Ensures the resource being modified belongs to the authenticated user,
// unless the caller is an admin.
export function requireSelfOrAdmin(getUserId: (req: AuthRequest) => string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const isAdmin = ['SUPER_ADMIN', 'SUB_ADMIN'].includes(req.user.role);
    if (isAdmin || getUserId(req) === req.user.id) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'You can only access your own data' });
  };
}
