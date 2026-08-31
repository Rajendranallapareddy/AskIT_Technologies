import { LayoutDashboard, Home, User, Briefcase, CalendarCheck, Award, Bell, History, Receipt, FolderOpen, Video } from 'lucide-react';
import type { SidebarLink } from '../../components/layout/Sidebar';

export const USER_LINKS: SidebarLink[] = [
  { label: 'Home', to: '/', icon: Home, end: true },
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'My Profile', to: '/profile', icon: User },
  { label: 'My Internships', to: '/my-internships', icon: Briefcase },
  { label: 'Sessions', to: '/my-sessions', icon: Video },
  { label: 'Materials', to: '/my-materials', icon: FolderOpen },
  { label: 'Payment History', to: '/payment-history', icon: Receipt },
  { label: 'Attendance', to: '/my-attendance', icon: CalendarCheck },
  { label: 'Certificates', to: '/my-certificates', icon: Award },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'History', to: '/history', icon: History },
];
