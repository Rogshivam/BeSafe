import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, FolderLock, FileWarning, FileText, Users, Settings, X, Menu } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const sidebarItems = [
  { title: 'Dashboard', icon: LayoutDashboard, url: '' },          // will expand to `/dashboard/[role]`
  { title: 'Evidence Locker', icon: FolderLock, url: '/evidence-locker' },
  // { title: 'Threat Logs', icon: FileWarning, url: '/thread-logs' },
  { title: 'Incident Reports', icon: FileText, url: '/incidents' },
  { title: 'Emergency Contacts', icon: Users, url: '/emergency-contacts' },
  { title: 'Settings', icon: Settings, url: '/settings' },
];

export const DashboardSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { role, userName, logout } = useAuth();
  const location = useLocation();

  const getUrl = (item: typeof sidebarItems[0]) => {
    if (item.title === "Dashboard") {
      return `/dashboard/${role}`;
    }
    return item.url;
  };

  return (
    <>
      {/* Mobile trigger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 gradient-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-lg"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-foreground/50 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
      className={`fixed lg:static top-0 left-0 z-50 h-screen bg-dash-dark text-primary-foreground transition-all duration-300 flex flex-col
          ${collapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="p-4 flex items-center justify-between border-b border-dash-surface">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            {!collapsed && <span className="font-bold text-lg">Be-Safe</span>}
          </Link>
          <button
            className="hidden lg:block opacity-60 hover:opacity-100"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {!collapsed && (
          <div className="px-4 py-3 border-b border-dash-surface">
            <p className="text-sm opacity-60">Welcome back,</p>
            <p className="font-semibold text-primary">{userName}!</p>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === getUrl(item);
            return (
              <Link
                key={item.title}
                to={getUrl(item)}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-primary-foreground/70 hover:bg-dash-surface hover:text-primary-foreground'}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-dash-surface">
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-primary-foreground/70 hover:bg-dash-surface transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <X className="w-5 h-5" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};