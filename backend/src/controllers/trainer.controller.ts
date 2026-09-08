import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

async function getTrainerRecord(userId: string) {
  let trainer = await prisma.trainer.findUnique({
    where: { userId },
  });

  if (!trainer) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.role === 'TRAINER') {
      trainer = await prisma.trainer.create({
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

async function getAssignedInternship(
  trainerId: string,
  internshipId: string
) {
  const internship =
    await prisma.internship.findFirst({
      where: {
        id: internshipId,
        trainerAssignments: {
          some: {
            trainerId,
          },
        },
      },
    });

  if (!internship) {
    throw new AppError(
      'Internship not found or not assigned to you',
      404
    );
  }

  return internship;
}

// GET /api/trainer/dashboard
export async function getTrainerDashboard(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const trainer =
      await getTrainerRecord(
        req.user!.id
      );

    const internships =
      await prisma.internship.findMany({
        where: {
          trainerAssignments: {
            some: {
              trainerId: trainer.id,
            },
          },
        },

        include: {
          trainerAssignments: {
            include: {
              trainer: {
                include: {
                  user: true,
                },
              },
            },
          },

          _count: {
            select: {
              registrations: true,
            },
          },
        },

        orderBy: {
          startDate: 'desc',
        },
      });

    const active =
      internships.filter(
        (internship) =>
          internship.status ===
            'ONGOING' ||
          internship.status ===
            'OPEN'
      );

    const completed =
      internships.filter(
        (internship) =>
          internship.status ===
          'COMPLETED'
      );

    res.json({
      success: true,

      data: {
        totalInternships:
          internships.length,

        activeInternships:
          active.length,

        completedInternships:
          completed.length,

        internships,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/trainer/internships/:id/participants
export async function getParticipants(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const trainer =
      await getTrainerRecord(
        req.user!.id
      );

    const internship =
      await getAssignedInternship(
        trainer.id,
        req.params.id
      );

    const registrations =
      await prisma.registration.findMany({
        where: {
          internshipId:
            internship.id,

          status:
            'APPROVED',
        },

        include: {
          user: true,
        },

        orderBy: {
          appliedAt: 'asc',
        },
      });

    res.json({
      success: true,
      data: registrations,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/trainer/internships/:id/materials
export async function uploadMaterial(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const trainer =
      await getTrainerRecord(
        req.user!.id
      );

    const internship =
      await getAssignedInternship(
        trainer.id,
        req.params.id
      );

    if (!req.file) {
      throw new AppError(
        'No file uploaded',
        400
      );
    }

    const material =
      await prisma.material.create({
        data: {
          internshipId:
            internship.id,

          trainerId:
            trainer.id,

          title:
            req.body.title ||
            req.file.originalname,

          fileUrl:
            `/uploads/materials/${req.file.filename}`,
        },
      });

    res.status(201).json({
      success: true,
      message:
        'Material uploaded',
      data: material,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/trainer/internships/:id/materials
export async function listMaterials(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const trainer =
      await getTrainerRecord(
        req.user!.id
      );

    await getAssignedInternship(
      trainer.id,
      req.params.id
    );

    const materials =
      await prisma.material.findMany({
        where: {
          internshipId:
            req.params.id,
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    res.json({
      success: true,
      data: materials,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/trainer/materials/:id
export async function deleteMaterial(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const trainer =
      await getTrainerRecord(
        req.user!.id
      );

    const material =
      await prisma.material.findUnique({
        where: {
          id: req.params.id,
        },
      });

    if (
      !material ||
      material.trainerId !==
        trainer.id
    ) {
      throw new AppError(
        'Material not found',
        404
      );
    }

    await prisma.material.delete({
      where: {
        id: material.id,
      },
    });

    res.json({
      success: true,
      message:
        'Material deleted',
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/trainer/internships/:id/announcements
export async function postAnnouncement(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const trainer =
      await getTrainerRecord(
        req.user!.id
      );

    const internship =
      await getAssignedInternship(
        trainer.id,
        req.params.id
      );

    const {
      title,
      message,
    } = req.body;

    if (
      !title ||
      !String(title).trim()
    ) {
      throw new AppError(
        'Announcement title is required',
        400
      );
    }

    if (
      !message ||
      !String(message).trim()
    ) {
      throw new AppError(
        'Announcement message is required',
        400
      );
    }

    const announcement =
      await prisma.announcement.create({
        data: {
          title:
            String(title).trim(),

          message:
            String(message).trim(),

          internshipId:
            internship.id,

          createdById:
            req.user!.id,
        },
      });

    const registrations =
      await prisma.registration.findMany({
        where: {
          internshipId:
            internship.id,

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
      const {
        notifyUsers,
      } = await import(
        '../services/notify.service'
      );

      await notifyUsers(
        registrations.map(
          (registration) =>
            registration.userId
        ),
        {
          type:
            'ANNOUNCEMENT',

          title:
            `New Announcement: ${String(
              title
            ).trim()}`,

          message:
            String(
              message
            ).trim(),

          link:
            '/notifications',

          whatsapp: true,
          email: true,
        }
      );
    }

    res.status(201).json({
      success: true,

      message:
        'Announcement posted',

      data: announcement,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/trainers
export async function listTrainersPublic(
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const trainers =
      await prisma.trainer.findMany({
        include: {
          user: true,
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    res.json({
      success: true,

      data:
        trainers.map(
          (trainer) => ({
            id:
              trainer.id,

            name:
              trainer.user
                .fullName,

            photo:
              trainer.photo ||
              trainer.user
                .profilePicture,

            experienceYears:
              trainer.experienceYears,

            expertise:
              trainer.expertise,

            bio:
              trainer.bio,
          })
        ),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/trainers/:id/performance
export async function trainerPerformance(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const trainer =
      await prisma.trainer.findUnique({
        where: {
          id: req.params.id,
        },

        include: {
          user: true,

          internshipAssignments: {
            include: {
              internship: {
                include: {
                  registrations:
                    true,

                  certificates:
                    true,
                },
              },
            },
          },
        },
      });

    if (!trainer) {
      throw new AppError(
        'Trainer not found',
        404
      );
    }

    const internships =
      trainer.internshipAssignments.map(
        (assignment) =>
          assignment.internship
      );

    const totalInternships =
      internships.length;

    const activeInternships =
      internships.filter(
        (internship) =>
          internship.status ===
            'ONGOING' ||
          internship.status ===
            'OPEN'
      ).length;

    const completedInternships =
      internships.filter(
        (internship) =>
          internship.status ===
          'COMPLETED'
      ).length;

    const totalStudents =
      internships.reduce(
        (
          total,
          internship
        ) =>
          total +
          internship.registrations.filter(
            (registration) =>
              registration.status ===
              'APPROVED'
          ).length,
        0
      );

    const certificatesIssued =
      internships.reduce(
        (
          total,
          internship
        ) =>
          total +
          internship.certificates.filter(
            (certificate) =>
              certificate.status ===
              'ISSUED'
          ).length,
        0
      );

    const internshipIds =
      internships.map(
        (internship) =>
          internship.id
      );

    const sessions =
      internshipIds.length
        ? await prisma.attendanceSession.findMany(
            {
              where: {
                internshipId: {
                  in: internshipIds,
                },
              },

              include: {
                records: true,
              },
            }
          )
        : [];

    let totalRecords = 0;
    let presentRecords = 0;

    for (
      const session of sessions
    ) {
      totalRecords +=
        session.records.length;

      presentRecords +=
        session.records.filter(
          (record) =>
            record.status ===
            'PRESENT'
        ).length;
    }

    const avgAttendance =
      totalRecords
        ? Math.round(
            (
              presentRecords /
              totalRecords
            ) * 100
          )
        : 0;

    res.json({
      success: true,

      data: {
        trainer: {
          id:
            trainer.id,

          name:
            trainer.user
              .fullName,

          photo:
            trainer.photo,
        },

        totalInternships,
        activeInternships,
        completedInternships,
        totalStudents,
        certificatesIssued,

        averageAttendancePercentage:
          avgAttendance,

        lastActive:
          trainer.user
            .lastLoginAt,
      },
    });
  } catch (err) {
    next(err);
  }
}