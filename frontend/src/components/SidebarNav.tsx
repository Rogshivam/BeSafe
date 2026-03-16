import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, User, Users, Settings, LogOut, Menu, X, Bell, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userType: "child" | "adult";
  onUserTypeChange: (type: "child" | "adult") => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Shield },
  { id: "contacts", label: "Emergency Contacts", icon: Users },
  { id: "chatbot", label: "AI Assistant", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

const SidebarNav = ({ activeTab, onTabChange, userType, onUserTypeChange }: SidebarNavProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-card shadow-card"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-40 flex flex-col",
          "md:translate-x-0 transition-transform",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground">Be-Safe</h1>
              <p className="text-xs text-muted-foreground">Safety Monitor</p>
            </div>
          </div>
        </div>

        {/* User Type Toggle */}
        <div className="p-4">
          <div className="flex rounded-lg bg-muted p-1">
            <button
              onClick={() => onUserTypeChange("child")}
              className={cn(
                "flex-1 text-xs font-medium py-2 rounded-md transition-all",
                userType === "child"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              👶 Child
            </button>
            <button
              onClick={() => onUserTypeChange("adult")}
              className={cn(
                "flex-1 text-xs font-medium py-2 rounded-md transition-all",
                userType === "adult"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              🧑 Adult
            </button>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                setMobileOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === item.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
              {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
              <User className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Demo User</p>
              <p className="text-xs text-muted-foreground">
                {userType === "child" ? "Child Account" : "Adult Account"}
              </p>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default SidebarNav;
