import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Phone, FolderLock, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();

  const dashboardUrl = role ? `/dashboard/${role}` : '/dashboard/adult';

  const navItems = [
    { path: dashboardUrl, label: 'Dashboard', icon: LayoutDashboard },
    { path: '/evidence-locker', label: 'Evidence', icon: FolderLock },
    { path: '/incidents', label: 'Incidents', icon: FileText },
    { path: '/emergency-contacts', label: 'Contacts', icon: Phone },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(item => {
          const isActive = 
            location.pathname === item.path || 
            (item.path.startsWith('/dashboard') && location.pathname.startsWith('/dashboard'));

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.5]' : ''}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
