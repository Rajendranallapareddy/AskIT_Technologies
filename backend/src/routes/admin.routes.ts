import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import * as internshipController from '../controllers/internship.controller';
import * as registrationController from '../controllers/registration.controller';
import * as attendanceController from '../controllers/attendance.controller';
import * as certificateController from '../controllers/certificate.controller';
import * as trainerController from '../controllers/trainer.controller';
import * as notificationController from '../controllers/notification.controller';
import * as adminPaymentController from '../controllers/adminPayment.controller';
import * as paymentController from '../controllers/payment.controller';
import * as refundController from '../controllers/refund.controller';
import * as couponController from '../controllers/paymentSettings.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole, requirePermission } from '../middleware/rbac.middleware';
import {
  uploadTrainerPhoto as uploadTrainerPhotoMw,
  uploadGalleryImage as uploadGalleryImageMw,
} from '../services/upload.service';

const router = Router();

// All routes here require Super Admin or Sub Admin; individual routes further
// gate on granular permissions for Sub Admins (Super Admin always passes).
router.use(authenticate, requireRole('SUPER_ADMIN', 'SUB_ADMIN'));

router.get('/dashboard', adminController.getAdminDashboard);
router.get('/notifications/pending-summary', notificationController.pendingSummary);
router.post('/notifications/broadcast', notificationController.broadcastNotification);

// Users
router.get('/users', requirePermission('manageUsers'), adminController.listUsers);
router.get('/users/:id', requirePermission('manageUsers'), adminController.getUserDetail);
router.post('/users', requirePermission('manageUsers'), adminController.createUser);
router.put('/users/:id', requirePermission('manageUsers'), adminController.updateUser);
router.put('/users/:id/activate', requirePermission('manageUsers'), adminController.activateUser);
router.put('/users/:id/deactivate', requirePermission('manageUsers'), adminController.deactivateUser);
router.delete('/users/:id', requirePermission('manageUsers'), adminController.deleteUser);
router.put('/users/:id/reset-password', requirePermission('manageUsers'), adminController.adminResetPassword);

// Courses
router.post('/courses', requirePermission('manageCourses'), adminController.createCourse);
router.put('/courses/:id', requirePermission('manageCourses'), adminController.updateCourse);
router.delete('/courses/:id', requirePermission('manageCourses'), adminController.deleteCourse);

// Internships
router.get('/internships', requirePermission('manageInternships'), internshipController.adminListInternships);
router.post('/internships', requirePermission('manageInternships'), internshipController.createInternship);
router.put('/internships/:id', requirePermission('manageInternships'), internshipController.updateInternship);
router.delete('/internships/:id', requirePermission('manageInternships'), internshipController.deleteInternship);
router.put('/internships/:id/archive', requirePermission('manageInternships'), internshipController.archiveInternship);
router.post('/internships/:id/duplicate', requirePermission('manageInternships'), internshipController.duplicateInternship);

// Registrations
router.get('/internships/:internshipId/registrations', requirePermission('manageRegistrations'), registrationController.listRegistrationsForInternship);
router.put('/registrations/:id/approve', requirePermission('manageRegistrations'), registrationController.approveRegistration);
router.put('/registrations/:id/reject', requirePermission('manageRegistrations'), registrationController.rejectRegistration);
router.delete('/registrations/:id', requirePermission('manageRegistrations'), registrationController.removeRegistration);

// Trainers
router.get('/trainers', requirePermission('manageTrainers'), adminController.listAllTrainers);
router.get('/trainers/:id', requirePermission('manageTrainers'), adminController.getTrainerDetail);
router.post('/trainers', requirePermission('manageTrainers'), adminController.createTrainer);
// IMPORTANT: literal-path routes (/assign, /:id/photo, /:id/performance) must
// be registered before the bare '/trainers/:id' route below — Express
// matches routes in registration order, and ':id' would otherwise greedily
// match the literal word "assign" as an id, calling the wrong controller.
router.put('/trainers/assign', requirePermission('manageTrainers'), adminController.assignTrainer);
router.put('/trainers/:id/photo', requirePermission('manageTrainers'), uploadTrainerPhotoMw.single('photo'), adminController.uploadTrainerPhoto);
router.get('/trainers/:id/performance', requirePermission('manageTrainers'), trainerController.trainerPerformance);
router.put('/trainers/:id', requirePermission('manageTrainers'), adminController.updateTrainer);
router.delete('/trainers/:id', requirePermission('manageTrainers'), adminController.deleteTrainer);

// Attendance
router.get('/internships/:internshipId/attendance-report', requirePermission('manageAttendance'), attendanceController.attendanceReport);

// Certificates
router.get('/certificates', requirePermission('manageCertificates'), certificateController.adminListCertificates);
router.post('/certificates/generate', requirePermission('manageCertificates'), certificateController.generateCertificate);
router.put('/certificates/:id/issue', requirePermission('manageCertificates'), certificateController.issueCertificate);
router.put('/certificates/:id/reissue', requirePermission('manageCertificates'), certificateController.reissueCertificate);

// Announcements
router.get('/announcements', requirePermission('manageAnnouncements'), adminController.listAnnouncements);
router.post('/announcements', requirePermission('manageAnnouncements'), adminController.createGlobalAnnouncement);
router.put('/announcements/:id', requirePermission('manageAnnouncements'), adminController.updateAnnouncement);
router.delete('/announcements/:id', requirePermission('manageAnnouncements'), adminController.deleteAnnouncement);

// Gallery
router.post('/gallery', requirePermission('manageGallery'), uploadGalleryImageMw.single('image'), adminController.uploadGalleryImage);
router.delete('/gallery/:id', requirePermission('manageGallery'), adminController.deleteGalleryImage);

// Contact
router.get('/contacts', requirePermission('manageContactRequests'), adminController.listContactRequests);
router.put('/contacts/:id', requirePermission('manageContactRequests'), adminController.updateContactStatus);
router.delete('/contacts/:id', requirePermission('manageContactRequests'), adminController.deleteContactRequest);

// --- Payments -----------------------------------------------------------
router.get('/payments', requirePermission('managePayments'), adminPaymentController.listPayments);
router.get('/payments/export', requirePermission('managePayments'), adminPaymentController.exportPayments);
router.get('/payments/analytics', requirePermission('managePayments'), adminPaymentController.paymentAnalytics);
router.get('/payments/student/:userId', requirePermission('managePayments'), adminPaymentController.getStudentPaymentHistory);
router.post('/payments/offline', requirePermission('managePayments'), adminPaymentController.recordOfflinePayment);
router.post('/payments/:id/resend-receipt', requirePermission('managePayments'), adminPaymentController.resendReceipt);
// Super Admin final approve/reject for any payment pending approval
// (installment paid online, or UPI/bank-transfer reference submitted).
router.post('/payments/:id/approve', requirePermission('managePayments'), paymentController.approvePendingPayment);
router.post('/payments/:id/reject', requirePermission('managePayments'), paymentController.rejectPendingPayment);
router.patch('/payments/:id/due-date', requirePermission('managePayments'), paymentController.updateInstallmentDueDate);
router.get('/payments/:id', requirePermission('managePayments'), adminPaymentController.getPaymentDetail);

// Course/internship fee management (part of the internship pricing surface)
router.put('/internships/:id/pricing', requirePermission('manageInternships'), couponController.updateInternshipPricing);

// --- Refunds -----------------------------------------------------------
router.get('/refunds', requirePermission('manageRefunds'), refundController.listRefunds);
router.post('/refunds', requirePermission('manageRefunds'), refundController.createRefund);
router.put('/refunds/:id/approve', requirePermission('manageRefunds'), refundController.approveRefund);
router.put('/refunds/:id/reject', requirePermission('manageRefunds'), refundController.rejectRefund);

// --- Coupons -----------------------------------------------------------
router.get('/coupons', requirePermission('manageCoupons'), couponController.listCoupons);
router.post('/coupons', requirePermission('manageCoupons'), couponController.createCoupon);
router.put('/coupons/:id', requirePermission('manageCoupons'), couponController.updateCoupon);
router.delete('/coupons/:id', requirePermission('manageCoupons'), couponController.deleteCoupon);

// --- Payment settings (GST, active gateway, allowed methods) -----------
router.get('/payment-settings', requirePermission('managePayments'), couponController.getSettings);
router.put('/payment-settings', requirePermission('managePayments'), couponController.updateSettings);

export default router;
