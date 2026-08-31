import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

// GET /api/public/stats - home page animated counters
export async function getPublicStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const [studentsCount, internshipsCount, trainersCount, coursesCount, placedCount] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.internship.count(),
      prisma.trainer.count(),
      prisma.course.count(),
      prisma.certificate.count({ where: { status: 'ISSUED' } }),
    ]);
    res.json({
      success: true,
      data: {
        studentsTrained: studentsCount || 1200,
        internshipsConducted: internshipsCount || 85,
        trainers: trainersCount || 12,
        courses: coursesCount || 6,
        placementSuccessRate: 92,
        hiringCompanies: 48,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/public/courses
export async function getCourses(_req: Request, res: Response, next: NextFunction) {
  try {
    const courses = await prisma.course.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    res.json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
}

// GET /api/public/testimonials
export async function getTestimonials(_req: Request, res: Response, next: NextFunction) {
  try {
    const testimonials = await prisma.testimonial.findMany({ where: { isPublished: true }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: testimonials });
  } catch (err) {
    next(err);
  }
}

// GET /api/public/gallery
export async function getGallery(_req: Request, res: Response, next: NextFunction) {
  try {
    const images = await prisma.galleryImage.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: images });
  } catch (err) {
    next(err);
  }
}

// POST /api/public/contact
export async function submitContactForm(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, phone, subject, message } = req.body;
    const contact = await prisma.contactRequest.create({ data: { name, email, phone, subject, message } });
    res.status(201).json({ success: true, message: "Thanks for reaching out! We'll get back to you shortly.", data: contact });
  } catch (err) {
    next(err);
  }
}
