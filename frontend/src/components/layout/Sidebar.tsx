import { NavLink } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { classNames } from '../../utils/helpers';

export interface SidebarLink {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

export default function Sidebar({ links, title }: { links: SidebarLink[]; title: string }) {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-navy-900 text-navy-200 min-h-screen sticky top-0">
      <div className="px-6 py-6 border-b border-white/10">
        <span className="text-2xl font-extrabold">
          <span className="text-white">ASK</span>
          <span className="text-orange-500">IT</span>
        </span>
        <p className="text-xs text-navy-400 mt-1 font-semibold uppercase tracking-wide">{title}</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              classNames(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition',
                isActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'text-navy-300 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <link.icon className="w-4 h-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
