import { prisma } from '../config/db';

interface LogParams {
  actorId?: string | null;
  action: string;
  description: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string | null;
}

// Records an entry in the immutable activity log used by Super Admin auditing.
export async function logActivity(params: LogParams) {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: params.actorId || null,
        action: params.action,
        description: params.description,
        previousValue: params.previousValue ?? undefined,
        newValue: params.newValue ?? undefined,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    // Auditing must never break the primary request flow.
    console.error('Failed to write activity log:', err);
  }
}
