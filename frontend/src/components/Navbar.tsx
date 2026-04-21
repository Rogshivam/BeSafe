import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, X, Bell } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { role, logout } = useAuth();
  const location = useLocation();

const isDashboard =
  (location.pathname.startsWith('/dashboard') &&
   location.pathname !== '/dashboard/select') ||
  location.pathname.startsWith('/evidence');

  if (isDashboard) return null;

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="text-primary-foreground w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">Be-Safe</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <Link to="/about" className="hover:text-primary transition-colors">About</Link>
          <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
          {role ? (
            <div className="flex items-center gap-4">
              <Link to="/dashboard/select" className="hover:text-primary transition-colors">Dashboard</Link>
              <Bell className="w-5 h-5 cursor-pointer hover:text-primary transition-colors" />
              <button onClick={logout} className="px-5 py-2 bg-foreground text-background rounded-full hover:opacity-90 transition-all text-sm">Logout</button>
            </div>
          ) : (
            <Link to="/login" className="px-5 py-2 bg-foreground text-background rounded-full hover:opacity-90 transition-all">Login</Link>
          )}
        </div>

        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-background border-b border-border px-6 py-4 space-y-3">
          <Link to="/" className="block py-2 text-foreground" onClick={() => setMobileOpen(false)}>Home</Link>
          <Link to="/about" className="block py-2 text-foreground" onClick={() => setMobileOpen(false)}>About</Link>
          <Link to="/contact" className="block py-2 text-foreground" onClick={() => setMobileOpen(false)}>Contact</Link>
          {role ? (
            <>
              <Link to="/dashboard/select" className="block py-2 text-foreground" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <button onClick={() => { logout(); setMobileOpen(false); }} className="w-full py-2 gradient-primary text-primary-foreground rounded-xl font-bold">Logout</button>
            </>
          ) : (
            <Link to="/login" className="block py-2 text-center gradient-primary text-primary-foreground rounded-xl font-bold" onClick={() => setMobileOpen(false)}>Login</Link>
          )}
        </div>
      )}
    </nav>
  );
};
