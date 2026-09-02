import {
  ReactNode,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  Menu,
  X,
  LogOut,
} from 'lucide-react';

import Sidebar, {
  SidebarLink,
} from './Sidebar';

import NotificationBell from './NotificationBell';

import EnableNotifications from '../EnableNotifications';

import {
  useAuth,
} from '../../hooks/useAuth';

import {
  initials,
} from '../../utils/formatters';

import {
  getImageUrl,
} from '../../utils/imageUrl';

interface DashboardLayoutProps {
  children: ReactNode;
  links: SidebarLink[];
  title: string;
  pageTitle: string;
}

export default function DashboardLayout({
  children,
  links,
  title,
  pageTitle,
}: DashboardLayoutProps) {
  const [
    mobileNavOpen,
    setMobileNavOpen,
  ] = useState(false);

  const {
    user,
    logout,
  } = useAuth();

  const navigate =
    useNavigate();

  const handleLogout =
    async () => {
      await logout();

      navigate('/');
    };

  return (
    <div className="flex min-h-screen bg-navy-50/50">
      <Sidebar
        links={links}
        title={title}
      />

      {/* Mobile sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-900/60"
            onClick={() =>
              setMobileNavOpen(
                false
              )
            }
          />

          <div className="absolute bottom-0 left-0 top-0 w-72 bg-navy-900">
            <div className="flex justify-end p-4">
              <button
                type="button"
                onClick={() =>
                  setMobileNavOpen(
                    false
                  )
                }
                className="text-white"
                aria-label="Close navigation"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="px-3">
              {links.map(
                (link) => (
                  <Link
                    key={
                      link.to
                    }
                    to={
                      link.to
                    }
                    onClick={() =>
                      setMobileNavOpen(
                        false
                      )
                    }
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      px-4
                      py-3
                      text-sm
                      font-semibold
                      text-navy-200
                      transition
                      hover:bg-white/5
                    "
                  >
                    <link.icon className="h-4 w-4" />

                    {
                      link.label
                    }
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main dashboard area */}
      <div className="min-w-0 flex-1">
        <header
          className="
            sticky
            top-0
            z-30
            flex
            h-16
            items-center
            justify-between
            border-b
            border-navy-100
            bg-white
            px-5
            lg:px-8
          "
        >
          {/* Left side */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="shrink-0 text-navy-700 lg:hidden"
              onClick={() =>
                setMobileNavOpen(
                  true
                )
              }
              aria-label="Open navigation"
            >
              <Menu className="h-6 w-6" />
            </button>

            <h1
              className="
                min-w-0
                truncate
                text-lg
                font-bold
                text-navy-900
              "
              title={
                pageTitle
              }
            >
              {
                pageTitle
              }
            </h1>
          </div>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <NotificationBell />

            <div className="flex min-w-0 items-center gap-2">
              <span
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-full
                  bg-navy-700
                  text-xs
                  font-bold
                  text-white
                "
              >
                {user?.profilePicture ? (
                  <img
                    src={
                      getImageUrl(
                        user.profilePicture
                      ) ??
                      undefined
                    }
                    alt={
                      user.fullName
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user
                    ? initials(
                        user.fullName
                      )
                    : '—'
                )}
              </span>

              <div className="hidden min-w-0 max-w-[180px] sm:block">
                <p
                  title={
                    user?.fullName ||
                    ''
                  }
                  className="
                    truncate
                    text-sm
                    font-semibold
                    leading-tight
                    text-navy-800
                  "
                >
                  {
                    user?.fullName
                  }
                </p>

                <p
                  className="
                    truncate
                    text-xs
                    leading-tight
                    text-navy-400
                  "
                >
                  {
                    user?.role
                      ?.replace(
                        /_/g,
                        ' '
                      )
                  }
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="
                shrink-0
                text-navy-400
                transition
                hover:text-red-500
              "
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="p-5 lg:p-8">
          {/* Mobile / Browser Push Notifications */}
          <div className="mb-5">
            <EnableNotifications />
          </div>

          {/* Current dashboard page */}
          {
            children
          }
        </main>
      </div>
    </div>
  );
}