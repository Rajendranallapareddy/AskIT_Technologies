import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import * as internshipController from '../controllers/internship.controller';
import * as registrationController from '../controllers/registration.controller';
import * as attendanceController from '../controllers/attendance.controller';
import * as certificateController from '../controllers/certificate.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { uploadProfilePicture } from '../services/upload.service';

const router = Router();

router.use(authenticate, requireRole('USER'));

router.get('/dashboard', userController.getDashboard);
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/profile/picture', uploadProfilePicture.single('picture'), userController.updateProfilePicture);
router.put('/change-password', userController.changePassword);
router.get('/history', userController.getHistory);

router.get('/notifications', userController.getNotifications);
router.put('/notifications/:id/read', userController.markNotificationRead);

router.post('/internships/register', registrationController.registerForInternship);
router.put('/registrations/:id/cancel', registrationController.cancelRegistration);

router.get('/attendance', attendanceController.getMyAttendance);
router.get('/certificates', certificateController.getMyCertificates);
router.get('/materials', userController.getMyMaterials);
router.get('/sessions', attendanceController.getMyAvailableSessions);

export default router;
