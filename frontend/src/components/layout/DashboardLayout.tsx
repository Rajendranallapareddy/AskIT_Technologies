import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import Sidebar, { SidebarLink } from './Sidebar';
import NotificationBell from './NotificationBell';
import { useAuth } from '../../hooks/useAuth';
import { initials } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../../utils/imageUrl';

interface DashboardLayoutProps {
  children: ReactNode;
  links: SidebarLink[];
  title: string;
  pageTitle: string;
}

export default function DashboardLayout({ children, links, title, pageTitle }: DashboardLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-navy-50/50">
      <Sidebar links={links} title={title} />

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-900/60" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-navy-900">
            <div className="flex justify-end p-4">
              <button onClick={() => setMobileNavOpen(false)} className="text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="px-3">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-navy-200 hover:bg-white/5"
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-navy-100 px-5 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-navy-700" onClick={() => setMobileNavOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-bold text-lg text-navy-900">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-full bg-navy-700 text-white text-xs font-bold flex items-center justify-center overflow-hidden shrink-0">
                {user?.profilePicture ? (
                  <img src={getImageUrl(user.profilePicture) ?? undefined} alt={user.fullName} className="w-full h-full object-cover"/>
                ) : (
                  user ? initials(user.fullName) : '—'
                )}
              </span>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-navy-800 leading-tight">{user?.fullName}</p>
                <p className="text-xs text-navy-400 leading-tight">{user?.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-navy-400 hover:text-red-500" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
        <main className="p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
