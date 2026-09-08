import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

async function getTrainerRecord(
  userId: string
) {
  let trainer =
    await prisma.trainer.findUnique({
      where: {
        userId,
      },
    });

  if (!trainer) {
    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (
      user?.role ===
      'TRAINER'
    ) {
      trainer =
        await prisma.trainer.create({
          data: {
            userId,
            expertise: [],
            experienceYears: 0,
          },
        });
    } else {
      throw new AppError(
        'Trainer profile not found',
        404
      );
    }
  }

  return trainer;
}

async function ensureTrainerAssignedToInternship(
  userId: string,
  internshipId: string
) {
  const trainer =
    await getTrainerRecord(
      userId
    );

  const assignment =
    await prisma.internshipTrainer.findUnique({
      where: {
        internshipId_trainerId: {
          internshipId,
          trainerId:
            trainer.id,
        },
      },
    });

  if (!assignment) {
    throw new AppError(
      'Internship not found or not assigned to you',
      404
    );
  }

  return trainer;
}

async function ensureTrainerCanManageSession(
  userId: string,
  sessionId: string
) {
  const trainer =
    await getTrainerRecord(
      userId
    );

  const session =
    await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,

        internship: {
          trainerAssignments: {
            some: {
              trainerId:
                trainer.id,
            },
          },
        },
      },
    });

  if (!session) {
    throw new AppError(
      'Session not found or not assigned to you',
      404
    );
  }

  return session;
}

function optionalText(
  value: unknown
): string | null {
  const text =
    String(
      value ?? ''
    ).trim();

  return text || null;
}

// GET /api/users/attendance
export async function getMyAttendance(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const records =
      await prisma.attendance.findMany({
        where: {
          userId:
            req.user!.id,
        },

        include: {
          session: {
            include: {
              internship:
                true,
            },
          },
        },

        orderBy: {
          markedAt:
            'desc',
        },
      });

    const grouped: Record<
      string,
      typeof records
    > = {};

    for (
      const record of records
    ) {
      const key =
        record.session
          .internshipId;

      grouped[key] =
        grouped[key] ||
        [];

      grouped[
        key
      ].push(record);
    }

    const summary =
      Object.entries(
        grouped
      ).map(
        ([
          internshipId,
          recs,
        ]) => {
          const present =
            recs.filter(
              (record) =>
                record.status ===
                'PRESENT'
            ).length;

          return {
            internshipId,

            internshipTitle:
              recs[0]
                .session
                .internship
                .title,

            totalSessions:
              recs.length,

            present,

            absent:
              recs.filter(
                (record) =>
                  record.status ===
                  'ABSENT'
              ).length,

            percentage:
              recs.length
                ? Math.round(
                    (
                      present /
                      recs.length
                    ) * 100
                  )
                : 0,

            records:
              recs,
          };
        }
      );

    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/trainer/internships/:internshipId/sessions
export async function createSession(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const internshipId =
      req.params
        .internshipId;

    await ensureTrainerAssignedToInternship(
      req.user!.id,
      internshipId
    );

    const {
      date,
      topic,
      meetLink,
      meetingId,
      passcode,
    } = req.body;

    if (!date) {
      throw new AppError(
        'Session date and time are required',
        400
      );
    }

    const sessionDate =
      new Date(date);

    if (
      Number.isNaN(
        sessionDate.getTime()
      )
    ) {
      throw new AppError(
        'Please enter a valid session date and time',
        400
      );
    }

    const session =
      await prisma.attendanceSession.create({
        data: {
          internshipId,

          date:
            sessionDate,

          topic:
            optionalText(
              topic
            ),

          meetLink:
            optionalText(
              meetLink
            ),

          meetingId:
            optionalText(
              meetingId
            ),

          passcode:
            optionalText(
              passcode
            ),
        },
      });

    /*
     * A session is valid even
     * when no students have
     * registered yet.
     */
    const registrations =
      await prisma.registration.findMany({
        where: {
          internshipId,

          status:
            'APPROVED',
        },

        select: {
          userId: true,
        },
      });

    if (
      registrations.length
    ) {
      await prisma.notification.createMany({
        data:
          registrations.map(
            (registration) => ({
              userId:
                registration.userId,

              type:
                'ANNOUNCEMENT' as const,

              title:
                'New Class Scheduled',

              message:
                session.topic
                  ? `A new session "${session.topic}" has been scheduled.`
                  : 'A new session has been scheduled.',

              link:
                '/my-sessions',
            })
          ),
      });
    }

    res.status(201).json({
      success: true,

      message:
        registrations.length
          ? `Session created and ${registrations.length} participant(s) notified`
          : 'Session created successfully. No participants are registered yet.',

      data: session,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/trainer/sessions/:id
export async function updateSession(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await ensureTrainerCanManageSession(
      req.user!.id,
      req.params.id
    );

    const {
      date,
      topic,
      meetLink,
      meetingId,
      passcode,
    } = req.body;

    const data: Record<
      string,
      any
    > = {};

    if (
      date !== undefined
    ) {
      const parsed =
        new Date(date);

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        throw new AppError(
          'Please enter a valid session date and time',
          400
        );
      }

      data.date =
        parsed;
    }

    if (
      topic !== undefined
    ) {
      data.topic =
        optionalText(
          topic
        );
    }

    if (
      meetLink !== undefined
    ) {
      data.meetLink =
        optionalText(
          meetLink
        );
    }

    if (
      meetingId !== undefined
    ) {
      data.meetingId =
        optionalText(
          meetingId
        );
    }

    if (
      passcode !== undefined
    ) {
      data.passcode =
        optionalText(
          passcode
        );
    }

    const session =
      await prisma.attendanceSession.update({
        where: {
          id:
            req.params.id,
        },

        data,
      });

    res.json({
      success: true,
      message:
        'Session updated',
      data: session,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/trainer/internships/:internshipId/sessions
export async function listSessions(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await ensureTrainerAssignedToInternship(
      req.user!.id,
      req.params
        .internshipId
    );

    const sessions =
      await prisma.attendanceSession.findMany({
        where: {
          internshipId:
            req.params
              .internshipId,
        },

        include: {
          records: {
            include: {
              user: true,
            },
          },
        },

        orderBy: {
          date: 'desc',
        },
      });

    res.json({
      success: true,
      data: sessions,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/trainer/sessions/:sessionId/mark
export async function markAttendance(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const session =
      await ensureTrainerCanManageSession(
        req.user!.id,
        req.params
          .sessionId
      );

    const {
      records,
    } = req.body as {
      records: {
        userId: string;
        status: string;
      }[];
    };

    if (
      !Array.isArray(
        records
      ) ||
      records.length === 0
    ) {
      throw new AppError(
        'There are no participants to mark attendance for',
        400
      );
    }

    const allowedStatuses =
      new Set([
        'PRESENT',
        'ABSENT',
        'LATE',
        'EXCUSED',
      ]);

    for (
      const record of records
    ) {
      if (
        !record.userId ||
        !allowedStatuses.has(
          record.status
        )
      ) {
        throw new AppError(
          'Invalid attendance record',
          400
        );
      }
    }

    const approved =
      await prisma.registration.findMany({
        where: {
          internshipId:
            session.internshipId,

          status:
            'APPROVED',

          userId: {
            in:
              records.map(
                (record) =>
                  record.userId
              ),
          },
        },

        select: {
          userId: true,
        },
      });

    const approvedIds =
      new Set(
        approved.map(
          (registration) =>
            registration.userId
        )
      );

    const invalidUser =
      records.find(
        (record) =>
          !approvedIds.has(
            record.userId
          )
      );

    if (invalidUser) {
      throw new AppError(
        'Attendance can only be marked for approved participants',
        400
      );
    }

    const results =
      await prisma.$transaction(
        records.map(
          (record) =>
            prisma.attendance.upsert({
              where: {
                sessionId_userId:
                  {
                    sessionId:
                      session.id,

                    userId:
                      record.userId,
                  },
              },

              update: {
                status:
                  record.status as any,

                markedBy:
                  req.user!.id,

                markedAt:
                  new Date(),
              },

              create: {
                sessionId:
                  session.id,

                userId:
                  record.userId,

                status:
                  record.status as any,

                markedBy:
                  req.user!.id,
              },
            })
        )
      );

    res.json({
      success: true,

      message:
        'Attendance marked successfully',

      data: results,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/trainer/attendance/:id
export async function updateAttendanceRecord(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const record =
      await prisma.attendance.findUnique({
        where: {
          id: req.params.id,
        },

        include: {
          session: true,
        },
      });

    if (!record) {
      throw new AppError(
        'Attendance record not found',
        404
      );
    }

    await ensureTrainerCanManageSession(
      req.user!.id,
      record.sessionId
    );

    const {
      status,
    } = req.body;

    if (
      ![
        'PRESENT',
        'ABSENT',
        'LATE',
        'EXCUSED',
      ].includes(
        status
      )
    ) {
      throw new AppError(
        'Invalid attendance status',
        400
      );
    }

    const updated =
      await prisma.attendance.update({
        where: {
          id: req.params.id,
        },

        data: {
          status,

          markedBy:
            req.user!.id,

          markedAt:
            new Date(),
        },
      });

    res.json({
      success: true,
      message:
        'Attendance updated',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/trainer/attendance/:id
export async function deleteAttendanceRecord(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const record =
      await prisma.attendance.findUnique({
        where: {
          id:
            req.params.id,
        },
      });

    if (!record) {
      throw new AppError(
        'Attendance record not found',
        404
      );
    }

    await ensureTrainerCanManageSession(
      req.user!.id,
      record.sessionId
    );

    await prisma.attendance.delete({
      where: {
        id:
          req.params.id,
      },
    });

    res.json({
      success: true,

      message:
        'Attendance record deleted',
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/internships/:internshipId/attendance-report
export async function attendanceReport(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const sessions =
      await prisma.attendanceSession.findMany({
        where: {
          internshipId:
            req.params
              .internshipId,
        },

        include: {
          records: {
            include: {
              user: true,
            },
          },
        },

        orderBy: {
          date: 'asc',
        },
      });

    const userMap: Record<
      string,
      {
        name: string;
        present: number;
        total: number;
      }
    > = {};

    for (
      const session of sessions
    ) {
      for (
        const record of session.records
      ) {
        userMap[
          record.userId
        ] =
          userMap[
            record.userId
          ] || {
            name:
              record.user
                .fullName,

            present: 0,
            total: 0,
          };

        userMap[
          record.userId
        ].total += 1;

        if (
          record.status ===
          'PRESENT'
        ) {
          userMap[
            record.userId
          ].present += 1;
        }
      }
    }

    const report =
      Object.entries(
        userMap
      ).map(
        ([
          userId,
          value,
        ]) => ({
          userId,

          name:
            value.name,

          present:
            value.present,

          total:
            value.total,

          percentage:
            value.total
              ? Math.round(
                  (
                    value.present /
                    value.total
                  ) * 100
                )
              : 0,
        })
      );

    res.json({
      success: true,

      data: {
        sessions:
          sessions.length,

        report,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/sessions
export async function getMyAvailableSessions(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const approvedRegistrations =
      await prisma.registration.findMany({
        where: {
          userId:
            req.user!.id,

          status: {
            in: [
              'APPROVED',
              'COMPLETED',
            ],
          },
        },

        select: {
          internshipId:
            true,

          internship: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

    const internshipIds =
      approvedRegistrations.map(
        (registration) =>
          registration.internshipId
      );

    if (
      internshipIds.length ===
      0
    ) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const sessions =
      await prisma.attendanceSession.findMany({
        where: {
          internshipId: {
            in:
              internshipIds,
          },
        },

        orderBy: {
          date: 'desc',
        },
      });

    const grouped =
      approvedRegistrations.map(
        (registration) => ({
          internshipId:
            registration
              .internship.id,

          internshipTitle:
            registration
              .internship.title,

          sessions:
            sessions.filter(
              (session) =>
                session.internshipId ===
                registration
                  .internship.id
            ),
        })
      );

    res.json({
      success: true,
      data: grouped,
    });
  } catch (err) {
    next(err);
  }
}