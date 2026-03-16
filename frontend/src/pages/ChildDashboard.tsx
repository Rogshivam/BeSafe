import { useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { EmergencyContacts } from '@/components/EmergencyContacts';
import { SettingsPanel } from '@/components/SettingsPanel';
import { MapPin, Phone, ShieldCheck, AlertTriangle } from 'lucide-react';

const ChildDashboard = () => {
  const [sosTriggered, setSosTriggered] = useState(false);

  const triggerSOS = () => {
    setSosTriggered(true);
    // Call parent
    window.open('tel:+1234567890', '_self');
    // Also try to send SMS
    const msg = encodeURIComponent('🚨 SOS ALERT! Your child needs help immediately!');
    window.open(`sms:+1234567890?body=${msg}`, '_blank');
    setTimeout(() => setSosTriggered(false), 5000);
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
        window.open(`sms:+1234567890?body=${encodeURIComponent(`📍 My location: ${mapUrl}`)}`, '_blank');
      },
      () => alert('Please allow location access')
    );
  };

  const callParent = () => {
    window.open('tel:+1234567890', '_self');
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <DashboardSidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto flex flex-col items-center justify-center">
        <div className="max-w-lg mx-auto text-center space-y-8 w-full">
          {/* Settings */}
          <div className="flex justify-end w-full">
            <SettingsPanel />
          </div>

          {/* Emergency Alert Card */}
          {sosTriggered && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/10 border border-destructive/30 rounded-2xl shadow-depth p-6"
            >
              <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <h2 className="font-bold text-lg text-destructive mb-2">Emergency Alert Sent!</h2>
              <p className="text-sm text-muted-foreground">An SOS alert has been sent to your parents.</p>
            </motion.div>
          )}

          {/* SOS Button */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="relative"
          >
            <button
              onClick={triggerSOS}
              className="relative w-48 h-48 mx-auto rounded-full bg-gradient-to-b from-red-400 to-red-600 shadow-2xl flex flex-col items-center justify-center text-primary-foreground hover:scale-105 transition-transform active:scale-95 group"
            >
              <div className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse-ring" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-b from-red-400 to-red-700 shadow-inner" />
              <div className="relative z-10">
                <span className="text-4xl font-black block">SOS</span>
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">Send Emergency Alert</span>
              </div>
            </button>
          </motion.div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-4">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={shareLocation}
              className="flex flex-col items-center gap-2 p-4 bg-card rounded-2xl shadow-depth hover:shadow-depth-hover transition-all active:scale-95"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground">Share Location</span>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={callParent}
              className="flex flex-col items-center gap-2 p-4 bg-card rounded-2xl shadow-depth hover:shadow-depth-hover transition-all active:scale-95"
            >
              <div className="w-10 h-10 bg-safe/10 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-safe" />
              </div>
              <span className="text-xs font-medium text-foreground">Call Parent</span>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col items-center gap-2 p-4 bg-card rounded-2xl shadow-depth hover:shadow-depth-hover transition-all active:scale-95"
            >
              <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs font-medium text-foreground">Safety Status</span>
            </motion.button>
          </div>

          {/* Emergency Contacts */}
          <EmergencyContacts />
        </div>
      </main>
      <ChatbotWidget role="child" />
    </div>
  );
};

export default ChildDashboard;
