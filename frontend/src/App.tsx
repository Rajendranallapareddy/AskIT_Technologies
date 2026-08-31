import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import BackToTop from './components/common/BackToTop';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { useNotificationStore } from './store/notificationStore';

// Public pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import CoursesPage from './pages/public/Courses';
import InternshipsPage from './pages/public/Internships';
import InternshipDetail from './pages/public/InternshipDetail';
import TrainersPage from './pages/public/Trainers';
import Placements from './pages/public/Placements';
import GalleryPage from './pages/public/Gallery';
import SuccessStories from './pages/public/SuccessStories';
import ContactPage from './pages/public/Contact';
import FAQPage from './pages/public/FAQ';
import PrivacyPolicy from './pages/public/PrivacyPolicy';
import Terms from './pages/public/Terms';
import VerifyReceipt from './pages/public/VerifyReceipt';
import VerifyCertificate from './pages/public/VerifyCertificate';
import NotFound from './pages/public/NotFound';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';

// User pages
import UserDashboard from './pages/user/Dashboard';
import UserProfile from './pages/user/Profile';
import MyInternships from './pages/user/MyInternships';
import MyAttendance from './pages/user/MyAttendance';
import MyCertificates from './pages/user/MyCertificates';
import UserNotifications from './pages/user/Notifications';
import UserHistory from './pages/user/History';
import PaymentHistory from './pages/user/PaymentHistory';
import MyMaterials from './pages/user/Materials';
import Sessions from './pages/user/Sessions';

// Trainer pages
import TrainerDashboard from './pages/trainer/Dashboard';
import TrainerAccount from './pages/trainer/Account';
import TrainerParticipants from './pages/trainer/Participants';
import TrainerAttendance from './pages/trainer/Attendance';
import TrainerMaterials from './pages/trainer/Materials';
import TrainerAnnouncements from './pages/trainer/Announcements';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminAccount from './pages/admin/Account';
import UsersHub from './pages/admin/UsersHub';
import UsersStudents from './pages/admin/UsersStudents';
import UsersStudentDetail from './pages/admin/UsersStudentDetail';
import UsersSubAdmins from './pages/admin/UsersSubAdmins';
import UsersTrainers from './pages/admin/UsersTrainers';
import UsersTrainerDetail from './pages/admin/UsersTrainerDetail';
import AdminInternships from './pages/admin/Internships';
import AdminRegistrations from './pages/admin/Registrations';
import AdminTrainers from './pages/admin/Trainers';
import AdminAttendance from './pages/admin/Attendance';
import AdminCertificates from './pages/admin/Certificates';
import AdminAnnouncements from './pages/admin/Announcements';
import AdminGallery from './pages/admin/Gallery';
import AdminContacts from './pages/admin/Contacts';
import SubAdmins from './pages/admin/SubAdmins';
import Permissions from './pages/admin/Permissions';
import ActivityLogs from './pages/admin/ActivityLogs';
import AdminPayments from './pages/admin/Payments';
import AdminRefunds from './pages/admin/Refunds';
import AdminCoupons from './pages/admin/Coupons';
import PaymentAccounts from './pages/admin/PaymentAccounts';
import PaymentSettings from './pages/admin/PaymentSettings';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

// Renders the marketing chrome (Navbar/Footer) around public pages, but not
// around dashboard layouts which supply their own chrome via DashboardLayout.
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <BackToTop />
    </>
  );
}

export default function App() {
  const { fetchMe, isAuthenticated, user } = useAuth();
  const { init: initNotifications, teardown: teardownNotifications } = useNotificationStore();

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opens (or closes) the real-time notification bell connection whenever
  // auth state changes — covers login, logout, and returning with an
  // already-valid session on page load.
  useEffect(() => {
    if (isAuthenticated && user) {
      initNotifications(localStorage.getItem('askit_access_token'));
    } else {
      teardownNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  return (
    <>
      <Toaster position="top-right" />
      <ScrollToTop />
      <Routes>
        {/* Public site */}
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
        <Route path="/courses" element={<PublicLayout><CoursesPage /></PublicLayout>} />
        <Route path="/internships" element={<PublicLayout><InternshipsPage /></PublicLayout>} />
        <Route path="/internships/:slug" element={<PublicLayout><InternshipDetail /></PublicLayout>} />
        <Route path="/trainers" element={<PublicLayout><TrainersPage /></PublicLayout>} />
        <Route path="/placements" element={<PublicLayout><Placements /></PublicLayout>} />
        <Route path="/gallery" element={<PublicLayout><GalleryPage /></PublicLayout>} />
        <Route path="/success-stories" element={<PublicLayout><SuccessStories /></PublicLayout>} />
        <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
        <Route path="/faq" element={<PublicLayout><FAQPage /></PublicLayout>} />
        <Route path="/privacy-policy" element={<PublicLayout><PrivacyPolicy /></PublicLayout>} />
        <Route path="/terms" element={<PublicLayout><Terms /></PublicLayout>} />
        <Route path="/verify-receipt/:token" element={<PublicLayout><VerifyReceipt /></PublicLayout>} />
        <Route path="/verify-certificate/:certificateNo" element={<PublicLayout><VerifyCertificate /></PublicLayout>} />

        {/* Auth */}
        <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
        <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />
        <Route path="/forgot-password" element={<PublicLayout><ForgotPassword /></PublicLayout>} />
        <Route path="/reset-password" element={<PublicLayout><ResetPassword /></PublicLayout>} />
        <Route path="/verify-email" element={<PublicLayout><VerifyEmail /></PublicLayout>} />

        {/* Student (User) dashboard */}
        <Route path="/dashboard" element={<ProtectedRoute roles={['USER']}><UserDashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute roles={['USER']}><UserProfile /></ProtectedRoute>} />
        <Route path="/my-internships" element={<ProtectedRoute roles={['USER']}><MyInternships /></ProtectedRoute>} />
        <Route path="/my-attendance" element={<ProtectedRoute roles={['USER']}><MyAttendance /></ProtectedRoute>} />
        <Route path="/my-certificates" element={<ProtectedRoute roles={['USER']}><MyCertificates /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute roles={['USER']}><UserNotifications /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute roles={['USER']}><UserHistory /></ProtectedRoute>} />
        <Route path="/payment-history" element={<ProtectedRoute roles={['USER']}><PaymentHistory /></ProtectedRoute>} />
        <Route path="/my-materials" element={<ProtectedRoute roles={['USER']}><MyMaterials /></ProtectedRoute>} />
        <Route path="/my-sessions" element={<ProtectedRoute roles={['USER']}><Sessions /></ProtectedRoute>} />

        {/* Trainer dashboard */}
        <Route path="/trainer/dashboard" element={<ProtectedRoute roles={['TRAINER']}><TrainerDashboard /></ProtectedRoute>} />
        <Route path="/trainer/account" element={<ProtectedRoute roles={['TRAINER']}><TrainerAccount /></ProtectedRoute>} />
        <Route path="/trainer/participants" element={<ProtectedRoute roles={['TRAINER']}><TrainerParticipants /></ProtectedRoute>} />
        <Route path="/trainer/attendance" element={<ProtectedRoute roles={['TRAINER']}><TrainerAttendance /></ProtectedRoute>} />
        <Route path="/trainer/materials" element={<ProtectedRoute roles={['TRAINER']}><TrainerMaterials /></ProtectedRoute>} />
        <Route path="/trainer/announcements" element={<ProtectedRoute roles={['TRAINER']}><TrainerAnnouncements /></ProtectedRoute>} />

        {/* Admin & Super Admin dashboard */}
        <Route path="/admin/dashboard" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/account" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><AdminAccount /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><UsersHub /></ProtectedRoute>} />
        <Route path="/admin/users/students" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><UsersStudents /></ProtectedRoute>} />
        <Route path="/admin/users/students/:id" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><UsersStudentDetail /></ProtectedRoute>} />
        <Route path="/admin/users/trainers" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><UsersTrainers /></ProtectedRoute>} />
        <Route path="/admin/users/trainers/:id" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><UsersTrainerDetail /></ProtectedRoute>} />
        <Route path="/admin/users/subadmins" element={<ProtectedRoute roles={['SUPER_ADMIN']}><UsersSubAdmins /></ProtectedRoute>} />
        <Route path="/admin/internships" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><AdminInternships /></ProtectedRoute>} />
        <Route path="/admin/registrations" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><AdminRegistrations /></ProtectedRoute>} />
        <Route path="/admin/trainers" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><AdminTrainers /></ProtectedRoute>} />
        <Route path="/admin/attendance" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><AdminAttendance /></ProtectedRoute>} />
        <Route path="/admin/certificates" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><AdminCertificates /></ProtectedRoute>} />
        <Route path="/admin/announcements" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><AdminAnnouncements /></ProtectedRoute>} />
        <Route path="/admin/gallery" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><AdminGallery /></ProtectedRoute>} />
        <Route path="/admin/contacts" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><AdminContacts /></ProtectedRoute>} />
        <Route path="/admin/payments" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><AdminPayments /></ProtectedRoute>} />
        <Route path="/admin/refunds" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><AdminRefunds /></ProtectedRoute>} />
        <Route path="/admin/coupons" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><AdminCoupons /></ProtectedRoute>} />
        <Route path="/admin/payment-settings" element={<ProtectedRoute roles={['SUPER_ADMIN', 'SUB_ADMIN']}><PaymentSettings /></ProtectedRoute>} />

        {/* Super Admin exclusive */}
        <Route path="/admin/sub-admins" element={<ProtectedRoute roles={['SUPER_ADMIN']}><SubAdmins /></ProtectedRoute>} />
        <Route path="/admin/permissions" element={<ProtectedRoute roles={['SUPER_ADMIN']}><Permissions /></ProtectedRoute>} />
        <Route path="/admin/activity-logs" element={<ProtectedRoute roles={['SUPER_ADMIN']}><ActivityLogs /></ProtectedRoute>} />
        <Route path="/admin/payment-accounts" element={<ProtectedRoute roles={['SUPER_ADMIN']}><PaymentAccounts /></ProtectedRoute>} />

        <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
      </Routes>
    </>
  );
}
