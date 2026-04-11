import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { RiskMeter } from '@/components/RiskMeter';
import { ActivityLog } from '@/components/ActivityLog';
import { QuickActions } from '@/components/QuickActions';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { EmergencyContacts } from '@/components/EmergencyContacts';
import { SettingsPanel } from '@/components/SettingsPanel';
import { AlertTriangle, Phone } from 'lucide-react';

const AdultDashboard = () => {
  const callPolice = () => {
    window.open('tel:911', '_self');
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <DashboardSidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6 pl-10">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Adult Dashboard</h1>
              <p className="text-muted-foreground text-sm">AI & Manual Monitoring • Safety Control Center</p>
            </div>
            <SettingsPanel />
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {['Dashboard', 'Emergency Alert', 'Audio Monitoring'].map((tab, i) => (
              <button key={tab} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${i === 0 ? 'gradient-primary text-primary-foreground' : 'bg-card text-foreground shadow-depth hover:bg-secondary'}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Risk + Emergency */}
          <div className="grid lg:grid-cols-2 gap-6">
            <RiskMeter value={78} label="Suspicious" />

            <div className="gradient-dark text-primary-foreground p-6 rounded-2xl shadow-depth">
              <h3 className="text-sm font-semibold opacity-60 uppercase tracking-wider mb-2">Audio Monitoring</h3>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-xs opacity-60">Status: <span className="text-primary font-bold">Active</span></p>
                  <p className="text-xs opacity-60">Last Capture: 12:15 PM</p>
                </div>
              </div>
              <div className="text-5xl font-bold text-primary text-center my-6">78%</div>
              <p className="text-center text-sm">Threat Level: <span className="text-warning font-bold">Suspicious</span></p>

              <button
                onClick={callPolice}
                className="w-full mt-6 py-3 gradient-emergency text-destructive-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95"
              >
                <AlertTriangle className="w-5 h-5" /> Call Police (911)
              </button>
              <button
                onClick={() => window.open('tel:911', '_self')}
                className="w-full mt-2 py-3 bg-destructive text-destructive-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95"
              >
                <Phone className="w-5 h-5" /> Emergency Services
              </button>
            </div>
          </div>

          {/* Emergency Contacts */}
          <EmergencyContacts />

          {/* Activity Log */}
          <ActivityLog />

          {/* Quick Actions */}
          <QuickActions />
        </div>
      </main>
      <ChatbotWidget role="adult" />
    </div>
  );
};

export default AdultDashboard;
