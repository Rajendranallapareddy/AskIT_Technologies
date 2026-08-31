import { Router } from 'express';
import * as trainerController from '../controllers/trainer.controller';
import * as attendanceController from '../controllers/attendance.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { uploadMaterial } from '../services/upload.service';

const router = Router();

router.use(authenticate, requireRole('TRAINER'));

router.get('/dashboard', trainerController.getTrainerDashboard);
router.get('/internships/:id/participants', trainerController.getParticipants);

router.post('/internships/:id/materials', uploadMaterial.single('file'), trainerController.uploadMaterial);
router.get('/internships/:id/materials', trainerController.listMaterials);
router.delete('/materials/:id', trainerController.deleteMaterial);

router.post('/internships/:id/announcements', trainerController.postAnnouncement);

router.post('/internships/:internshipId/sessions', attendanceController.createSession);
router.get('/internships/:internshipId/sessions', attendanceController.listSessions);
router.put('/sessions/:id', attendanceController.updateSession);
router.post('/sessions/:sessionId/mark', attendanceController.markAttendance);
router.put('/attendance/:id', attendanceController.updateAttendanceRecord);
router.delete('/attendance/:id', attendanceController.deleteAttendanceRecord);

export default router;
