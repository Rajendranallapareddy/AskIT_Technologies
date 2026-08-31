import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, LogOut, LayoutDashboard, User as UserIcon } from 'lucide-react';
import { NAV_LINKS, ROLE_HOME, BRAND } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import { initials } from '../../utils/formatters';
import { getImageUrl } from '../../utils/imageUrl';
import logo from '../../assets/logo.jpeg';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur shadow-md' : 'bg-white/70 backdrop-blur'
      }`}
    >
      <nav className="container-page flex items-center justify-between h-20">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img src={logo} alt="ASK IT Technologies logo" className="h-12 w-auto" />
          <span className="hidden sm:block text-xl md:text-2xl font-extrabold tracking-tight text-navy-800">
            AskIT <span className="text-orange-500">   Technologies</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  isActive ? 'text-orange-600 bg-orange-50' : 'text-navy-700 hover:text-orange-600 hover:bg-orange-50'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-navy-200 hover:border-orange-300 transition"
              >
                <span className="w-8 h-8 rounded-full bg-navy-700 text-white text-xs font-bold flex items-center justify-center overflow-hidden shrink-0">
                  {user.profilePicture ? (
                    <img src={getImageUrl(user.profilePicture) ?? undefined} alt={user.fullName} className="w-full h-full object-cover"/>
                  ) : (
                    initials(user.fullName)
                  )}
                </span>
                <span className="text-sm font-semibold text-navy-800 max-w-[110px] truncate">{user.fullName}</span>
                <ChevronDown className="w-4 h-4 text-navy-400" />
              </button>
              {profileOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-navy-100 py-2 animate-fade-up"
                  onMouseLeave={() => setProfileOpen(false)}
                >
                  <Link
                    to={ROLE_HOME[user.role]}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
                    onClick={() => setProfileOpen(false)}
                  >
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                  {user.role === 'USER' && (
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
                      onClick={() => setProfileOpen(false)}
                    >
                      <UserIcon className="w-4 h-4" /> My Profile
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-outline !py-2.5">Login</Link>
              <Link to="/register" className="btn-primary !py-2.5">Enroll Now</Link>
            </>
          )}
        </div>

        <button className="lg:hidden text-navy-800" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-navy-100 px-5 py-4 space-y-1 animate-fade-up">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-navy-700 hover:bg-orange-50"
            >
              {link.label}
            </NavLink>
          ))}
          <div className="pt-3 flex gap-2">
            {isAuthenticated && user ? (
              <>
                <Link to={ROLE_HOME[user.role]} className="btn-secondary flex-1" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                <button onClick={handleLogout} className="btn-outline flex-1">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline flex-1" onClick={() => setMobileOpen(false)}>Login</Link>
                <Link to="/register" className="btn-primary flex-1" onClick={() => setMobileOpen(false)}>Enroll</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
