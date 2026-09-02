import {
  Request,
  Response,
  NextFunction,
} from 'express';

import { prisma } from '../config/db';

import {
  notifyAdmins,
} from '../services/notify.service';

// ---------------------------------------------------------------------------
// PUBLIC STATS
// GET /api/public/stats
// ---------------------------------------------------------------------------

export async function getPublicStats(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const [
      studentsCount,
      internshipsCount,
      trainersCount,
      coursesCount,
      placedCount,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          role: 'USER',
        },
      }),

      prisma.internship.count(),

      prisma.trainer.count(),

      prisma.course.count(),

      prisma.certificate.count({
        where: {
          status: 'ISSUED',
        },
      }),
    ]);

    res.json({
      success: true,

      data: {
        studentsTrained:
          studentsCount || 1200,

        internshipsConducted:
          internshipsCount || 85,

        trainers:
          trainersCount || 12,

        courses:
          coursesCount || 6,

        placementSuccessRate: 92,

        hiringCompanies: 48,

        certificatesIssued:
          placedCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PUBLIC COURSES
// GET /api/public/courses
// ---------------------------------------------------------------------------

export async function getCourses(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const courses =
      await prisma.course.findMany({
        where: {
          isActive: true,
        },

        orderBy: {
          createdAt: 'asc',
        },
      });

    res.json({
      success: true,
      data: courses,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// TESTIMONIALS
// GET /api/public/testimonials
// ---------------------------------------------------------------------------

export async function getTestimonials(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const testimonials =
      await prisma.testimonial.findMany({
        where: {
          isPublished: true,
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    res.json({
      success: true,
      data: testimonials,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GALLERY
// GET /api/public/gallery
// ---------------------------------------------------------------------------

export async function getGallery(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const images =
      await prisma.galleryImage.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });

    res.json({
      success: true,
      data: images,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// CONTACT FORM
// POST /api/public/contact
//
// Flow:
// 1. Visitor submits Contact Us form.
// 2. Request is stored in database.
// 3. Super Admin + active Sub Admins receive:
//    - AskIT website notification
//    - Browser/mobile push notification
//    - Email notification
//
// Notification delivery failure must NOT prevent the contact request
// from being stored successfully.
// ---------------------------------------------------------------------------

export async function submitContactForm(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      name,
      email,
      phone,
      subject,
      message,
    } = req.body;

    // -----------------------------------------------------------------------
    // VALIDATION
    // -----------------------------------------------------------------------

    const cleanName =
      String(name || '').trim();

    const cleanEmail =
      String(email || '')
        .trim()
        .toLowerCase();

    const cleanPhone =
      phone
        ? String(phone).trim()
        : null;

    const cleanSubject =
      subject
        ? String(subject).trim()
        : null;

    const cleanMessage =
      String(message || '').trim();

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: 'Name is required.',
      });
    }

    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(cleanEmail)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid email address.',
      });
    }

    if (!cleanMessage) {
      return res.status(400).json({
        success: false,
        message:
          'Message is required.',
      });
    }

    if (
      cleanName.length > 150
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Name is too long.',
      });
    }

    if (
      cleanEmail.length > 254
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Email is too long.',
      });
    }

    if (
      cleanPhone &&
      cleanPhone.length > 30
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Phone number is too long.',
      });
    }

    if (
      cleanSubject &&
      cleanSubject.length > 250
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Subject is too long.',
      });
    }

    if (
      cleanMessage.length > 5000
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Message cannot exceed 5000 characters.',
      });
    }

    // -----------------------------------------------------------------------
    // SAVE CONTACT REQUEST
    // -----------------------------------------------------------------------

    const contact =
      await prisma.contactRequest.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          subject: cleanSubject,
          message: cleanMessage,
        },
      });

    // -----------------------------------------------------------------------
    // NOTIFY SUPER ADMIN + SUB ADMINS
    //
    // This is intentionally best-effort.
    //
    // If SMTP or Web Push temporarily fails, the visitor's Contact Us
    // request must remain saved in the database and the frontend should
    // still receive a successful response.
    // -----------------------------------------------------------------------

    try {
      const subjectText =
        contact.subject ||
        'General Enquiry';

      const phoneText =
        contact.phone
          ? ` | Mobile: ${contact.phone}`
          : '';

      await notifyAdmins({
        type: 'SYSTEM',

        title:
          'New Contact Request',

        message:
          `${contact.name} submitted a new contact request. ` +
          `Subject: "${subjectText}" | ` +
          `Email: ${contact.email}${phoneText}`,

        link:
          '/admin/contacts',

        // Normal Android / Chrome / browser push notification
        push: true,

        // Registered Super Admin/Sub Admin email
        email: true,

        // We are using normal website push as the main phone notification.
        // Keep WhatsApp disabled unless you specifically want WhatsApp too.
        whatsapp: false,
      });
    } catch (notificationError) {
      console.error(
        '[CONTACT] Admin notification failed:',
        notificationError
      );
    }

    // -----------------------------------------------------------------------
    // RESPONSE
    // -----------------------------------------------------------------------

    return res.status(201).json({
      success: true,

      message:
        "Thanks for reaching out! We'll get back to you shortly.",

      data: contact,
    });
  } catch (err) {
    next(err);
  }
}