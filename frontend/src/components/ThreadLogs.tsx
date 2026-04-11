import { FileText, AlertTriangle, MapPin, Clock } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { motion } from 'framer-motion';
import { DashboardSidebar } from './DashboardSidebar';

interface LogEntry {
  id: string;
  type: 'Incident' | 'Alert' | 'Update';
  description: string;
  timestamp: string;
}

const dummyLogs: LogEntry[] = [
  { id: '1', type: 'Incident', description: 'New incident reported: Suspicious Person Near School', timestamp: '2026-04-10T09:15:00' },
  { id: '2', type: 'Alert', description: 'Emergency alert sent to all contacts', timestamp: '2026-04-10T09:20:00' },
  { id: '3', type: 'Update', description: 'Location ping shared with Sarah Johnson', timestamp: '2026-04-10T08:00:00' },
  { id: '4', type: 'Incident', description: 'Incident resolved: Verbal Harassment at Park', timestamp: '2026-04-09T16:30:00' },
  { id: '5', type: 'Alert', description: 'Auto-alert triggered due to inactivity', timestamp: '2026-04-09T12:00:00' },
  { id: '6', type: 'Update', description: 'Location sharing enabled', timestamp: '2026-04-09T07:00:00' },
  { id: '7', type: 'Incident', description: 'New incident reported: Broken Street Light', timestamp: '2026-04-08T18:30:00' },
  { id: '8', type: 'Update', description: 'Profile updated: Emergency contact added', timestamp: '2026-04-08T10:15:00' },
  { id: '9', type: 'Alert', description: 'Emergency alert sent to Mike Davis', timestamp: '2026-04-07T22:45:00' },
  { id: '10', type: 'Incident', description: 'Incident resolved: Lost Child Found', timestamp: '2026-04-07T15:00:00' },
];

const typeConfig = {
  Incident: { icon: FileText, color: 'bg-primary/10 text-primary', dot: 'bg-primary' },
  Alert: { icon: AlertTriangle, color: 'bg-destructive/10 text-destructive', dot: 'bg-destructive' },
  Update: { icon: MapPin, color: 'bg-accent/10 text-accent', dot: 'bg-accent' },
};

export default function ThreadLogs() {
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
        <DashboardSidebar />
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">Thread Logs</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Complete activity timeline</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border" />

          <div className="space-y-1">
            {dummyLogs.map((log, i) => {
              const config = typeConfig[log.type];
              const Icon = config.icon;
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex gap-3 py-3 relative"
                >
                  <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center shrink-0 z-10 ring-4 ring-background`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 bg-card rounded-xl p-3 shadow-depth">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${config.color}`}>{log.type}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{formatDate(log.timestamp)}</span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{log.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}