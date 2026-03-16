import { useState } from 'react';
import { Settings, X, Bell, Shield, MapPin, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SettingsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    locationSharing: true,
    audioMonitoring: false,
    autoSOS: false,
    darkMode: false,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const settingItems = [
    { key: 'notifications' as const, label: 'Push Notifications', desc: 'Receive safety alerts', icon: Bell },
    { key: 'locationSharing' as const, label: 'Location Sharing', desc: 'Share location with contacts', icon: MapPin },
    { key: 'audioMonitoring' as const, label: 'Audio Monitoring', desc: 'Enable background audio capture', icon: Volume2 },
    { key: 'autoSOS' as const, label: 'Auto SOS', desc: 'Auto-send SOS after 10s shake', icon: Shield },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-card rounded-xl shadow-depth hover:shadow-depth-hover text-sm font-medium text-foreground transition-all hover:-translate-y-0.5"
      >
        <Settings className="w-4 h-4 text-primary" /> Settings
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 bg-foreground/30 z-50" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 right-0 h-full w-80 bg-card shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h2 className="font-bold text-lg text-foreground">Settings</h2>
                <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-1">
                {settingItems.map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggle(item.key)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${settings[item.key] ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-card rounded-full shadow transition-transform ${settings[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
