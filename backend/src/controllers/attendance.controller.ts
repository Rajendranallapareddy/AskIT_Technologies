import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

// GET /api/users/attendance - the logged-in user's own attendance
export async function getMyAttendance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const records = await prisma.attendance.findMany({
      where: { userId: req.user!.id },
      include: { session: { include: { internship: true } } },
      orderBy: { markedAt: 'desc' },
    });

    const grouped: Record<string, typeof records> = {};
    for (const r of records) {
      const key = r.session.internshipId;
      grouped[key] = grouped[key] || [];
      (grouped[key] as any).push(r);
    }

    const summary = Object.entries(grouped).map(([internshipId, recs]) => {
      const present = recs.filter((r) => r.status === 'PRESENT').length;
      return {
        internshipId,
        internshipTitle: recs[0].session.internship.title,
        totalSessions: recs.length,
        present,
        absent: recs.filter((r) => r.status === 'ABSENT').length,
        percentage: recs.length ? Math.round((present / recs.length) * 100) : 0,
        records: recs,
      };
    });

    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
}

// POST /api/trainer/internships/:internshipId/sessions - create an attendance session (a "class")
export async function createSession(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { date, topic, zoomLink, zoomMeetingId, zoomPasscode } = req.body;
    const session = await prisma.attendanceSession.create({
      data: { internshipId: req.params.internshipId, date: new Date(date), topic, zoomLink, zoomMeetingId, zoomPasscode },
    });

    // Let every approved participant know a new session/class has been
    // scheduled so they can find it under "Available Sessions".
    const registrations = await prisma.registration.findMany({
      where: { internshipId: req.params.internshipId, status: 'APPROVED' },
      select: { userId: true },
    });
    if (registrations.length) {
      await prisma.notification.createMany({
        data: registrations.map((r) => ({
          userId: r.userId,
          type: 'ANNOUNCEMENT' as const,
          title: 'New Class Scheduled',
          message: topic ? `A new session "${topic}" has been scheduled.` : 'A new session has been scheduled.',
        })),
      });
    }

    res.status(201).json({ success: true, message: 'Session created', data: session });
  } catch (err) {
    next(err);
  }
}

// PUT /api/trainer/sessions/:id — update a session's Zoom link/time/topic after creation
export async function updateSession(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { date, topic, zoomLink, zoomMeetingId, zoomPasscode } = req.body;
    const data: Record<string, any> = {};
    if (date !== undefined) data.date = new Date(date);
    if (topic !== undefined) data.topic = topic;
    if (zoomLink !== undefined) data.zoomLink = zoomLink;
    if (zoomMeetingId !== undefined) data.zoomMeetingId = zoomMeetingId;
    if (zoomPasscode !== undefined) data.zoomPasscode = zoomPasscode;

    const session = await prisma.attendanceSession.update({ where: { id: req.params.id }, data });
    res.json({ success: true, message: 'Session updated', data: session });
  } catch (err) {
    next(err);
  }
}

// GET /api/trainer/internships/:internshipId/sessions
export async function listSessions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sessions = await prisma.attendanceSession.findMany({
      where: { internshipId: req.params.internshipId },
      include: { records: { include: { user: true } } },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
}

// POST /api/trainer/sessions/:sessionId/mark - bulk mark attendance
// body: { records: [{ userId, status }] }
export async function markAttendance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { records } = req.body as { records: { userId: string; status: string }[] };
    if (!Array.isArray(records) || records.length === 0) {
      throw new AppError('At least one attendance record is required', 400);
    }

    const session = await prisma.attendanceSession.findUnique({ where: { id: req.params.sessionId } });
    if (!session) throw new AppError('Session not found', 404);

    const results = await prisma.$transaction(
      records.map((r) =>
        prisma.attendance.upsert({
          where: { sessionId_userId: { sessionId: session.id, userId: r.userId } },
          update: { status: r.status as any, markedBy: req.user!.id, markedAt: new Date() },
          create: {
            sessionId: session.id,
            userId: r.userId,
            status: r.status as any,
            markedBy: req.user!.id,
          },
        })
      )
    );

    res.json({ success: true, message: 'Attendance marked successfully', data: results });
  } catch (err) {
    next(err);
  }
}

// PUT /api/trainer/attendance/:id
export async function updateAttendanceRecord(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    const updated = await prisma.attendance.update({
      where: { id: req.params.id },
      data: { status, markedBy: req.user!.id, markedAt: new Date() },
    });
    res.json({ success: true, message: 'Attendance updated', data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/trainer/attendance/:id
export async function deleteAttendanceRecord(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.attendance.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/internships/:internshipId/attendance-report
export async function attendanceReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sessions = await prisma.attendanceSession.findMany({
      where: { internshipId: req.params.internshipId },
      include: { records: { include: { user: true } } },
      orderBy: { date: 'asc' },
    });

    const userMap: Record<string, { name: string; present: number; total: number }> = {};
    for (const session of sessions) {
      for (const record of session.records) {
        userMap[record.userId] = userMap[record.userId] || { name: record.user.fullName, present: 0, total: 0 };
        userMap[record.userId].total += 1;
        if (record.status === 'PRESENT') userMap[record.userId].present += 1;
      }
    }

    const report = Object.entries(userMap).map(([userId, v]) => ({
      userId,
      name: v.name,
      present: v.present,
      total: v.total,
      percentage: v.total ? Math.round((v.present / v.total) * 100) : 0,
    }));

    res.json({ success: true, data: { sessions: sessions.length, report } });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/sessions — every scheduled class/session (with Zoom link,
// if set) across every internship the student is approved for, grouped by
// internship, newest first within each group.
export async function getMyAvailableSessions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const approvedRegistrations = await prisma.registration.findMany({
      where: { userId: req.user!.id, status: { in: ['APPROVED', 'COMPLETED'] } },
      select: { internshipId: true, internship: { select: { id: true, title: true } } },
    });
    const internshipIds = approvedRegistrations.map((r) => r.internshipId);
    if (internshipIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const sessions = await prisma.attendanceSession.findMany({
      where: { internshipId: { in: internshipIds } },
      orderBy: { date: 'desc' },
    });

    const grouped = approvedRegistrations.map((r) => ({
      internshipId: r.internship.id,
      internshipTitle: r.internship.title,
      sessions: sessions.filter((s) => s.internshipId === r.internship.id),
    }));

    res.json({ success: true, data: grouped });
  } catch (err) {
    next(err);
  }
}
