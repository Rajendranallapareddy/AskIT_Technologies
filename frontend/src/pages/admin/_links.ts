import {
  LayoutDashboard, Users, Briefcase, ClipboardList, GraduationCap,
  CalendarCheck, Award, Megaphone, Mail, ShieldCheck, KeyRound, FileClock,
  CreditCard, RotateCcw, Tag, Settings, Landmark, Image as ImageIcon, Home, User,
} from 'lucide-react';
import type { SidebarLink } from '../../components/layout/Sidebar';
import { useAuth } from '../../hooks/useAuth';

// Each link (besides Dashboard) is tagged with the Sub Admin permission key
// that guards it server-side. A Sub Admin only sees links they can actually
// open — this is what stops them from clicking into a page that just spins
// forever behind a 403. Super Admin always sees everything.
interface AdminLink extends SidebarLink {
  permission?: string;
}

const ALL_LINKS: AdminLink[] = [
  { label: 'Home', to: '/', icon: Home, end: true },
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard, end: true },
  { label: 'My Account', to: '/admin/account', icon: User },
  { label: 'Users', to: '/admin/users', icon: Users, permission: 'manageUsers' },
  { label: 'Internships', to: '/admin/internships', icon: Briefcase, permission: 'manageInternships' },
  { label: 'Registrations', to: '/admin/registrations', icon: ClipboardList, permission: 'manageRegistrations' },
  { label: 'Trainers', to: '/admin/trainers', icon: GraduationCap, permission: 'manageTrainers' },
  { label: 'Attendance', to: '/admin/attendance', icon: CalendarCheck, permission: 'manageAttendance' },
  { label: 'Certificates', to: '/admin/certificates', icon: Award, permission: 'manageCertificates' },
  { label: 'Payments', to: '/admin/payments', icon: CreditCard, permission: 'managePayments' },
  { label: 'Refunds', to: '/admin/refunds', icon: RotateCcw, permission: 'manageRefunds' },
  { label: 'Coupons', to: '/admin/coupons', icon: Tag, permission: 'manageCoupons' },
  { label: 'Payment Settings', to: '/admin/payment-settings', icon: Settings, permission: 'managePayments' },
  { label: 'Announcements', to: '/admin/announcements', icon: Megaphone, permission: 'manageAnnouncements' },
  { label: 'Gallery', to: '/admin/gallery', icon: ImageIcon, permission: 'manageGallery' },
  { label: 'Contacts', to: '/admin/contacts', icon: Mail, permission: 'manageContactRequests' },
];

const SUPER_ADMIN_ONLY_LINKS: AdminLink[] = [
  { label: 'Sub Admins', to: '/admin/sub-admins', icon: ShieldCheck },
  { label: 'Permissions', to: '/admin/permissions', icon: KeyRound },
  { label: 'Payment Accounts', to: '/admin/payment-accounts', icon: Landmark },
  { label: 'Activity Logs', to: '/admin/activity-logs', icon: FileClock },
];

export function useAdminLinks(): SidebarLink[] {
  const { user } = useAuth();

  if (user?.role === 'SUPER_ADMIN') {
    return [...ALL_LINKS, ...SUPER_ADMIN_ONLY_LINKS];
  }

  // Sub Admin: only show links with no permission requirement (Dashboard) or
  // ones explicitly granted by the Super Admin on the Permissions page.
  const granted = user?.subAdminPermissions || {};
  return ALL_LINKS.filter((link) => !link.permission || (granted as Record<string, boolean>)[link.permission]);
}
