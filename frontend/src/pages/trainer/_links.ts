import { LayoutDashboard, Home, Users, CalendarCheck, FileUp, Megaphone, User } from 'lucide-react';
import type { SidebarLink } from '../../components/layout/Sidebar';

export const TRAINER_LINKS: SidebarLink[] = [
  { label: 'Home', to: '/', icon: Home, end: true },
  { label: 'Dashboard', to: '/trainer/dashboard', icon: LayoutDashboard, end: true },
  { label: 'My Account', to: '/trainer/account', icon: User },
  { label: 'Participants', to: '/trainer/participants', icon: Users },
  { label: 'Attendance', to: '/trainer/attendance', icon: CalendarCheck },
  { label: 'Materials', to: '/trainer/materials', icon: FileUp },
  { label: 'Announcements', to: '/trainer/announcements', icon: Megaphone },
];
