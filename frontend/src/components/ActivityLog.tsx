import { useState, useEffect } from 'react';
import { emergencyAPI, Emergency } from '@/services/api';

interface LogEntry {
  time: string;
  message: string;
  type: 'system' | 'action' | 'warning';
}

interface ActivityLogProps {
  entries?: LogEntry[];
  userId?: string;
}

const defaultEntries: LogEntry[] = [
  { time: '12:02', message: 'AI Monitoring Started', type: 'system' },
  { time: '12:05', message: 'Screenshot Captured', type: 'action' },
  { time: '12:10', message: 'Risk Score Updated', type: 'system' },
  { time: '12:14', message: 'Suspicious Activity Alert', type: 'warning' },
];

export const ActivityLog = ({ entries, userId }: ActivityLogProps) => {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch emergency history if userId is provided
  useEffect(() => {
    if (userId) {
      const fetchEmergencyHistory = async () => {
        try {
          setLoading(true);
          const response = await emergencyAPI.getEmergencyHistory();
          if (response.success) {
            setEmergencies(response.data.emergencies);
          }
        } catch (error) {
          console.error('Failed to fetch emergency history:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchEmergencyHistory();
    }
  }, [userId]);

  // Convert emergencies to log entries
  const emergencyLogEntries: LogEntry[] = emergencies.slice(0, 10).map(emergency => ({
    time: new Date(emergency.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    message: `${emergency.triggeredBy} Emergency - ${emergency.severity}`,
    type: emergency.status === 'Resolved' ? 'action' : 'warning' as const
  }));

  // Use provided entries or emergency history or default entries
  const displayEntries = entries || (emergencyLogEntries.length > 0 ? emergencyLogEntries : defaultEntries);

  return (
  <div className="bg-background rounded-2xl shadow-depth overflow-hidden">
    <div className="p-4 border-b border-border flex justify-between items-center">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <span className="text-lg">📋</span> Activity Log
      </h3>
      <button className="text-xs text-primary font-bold hover:underline">View All</button>
    </div>
    <div className="divide-y divide-border">
      {displayEntries.map((log, i) => (
        <div key={i} className="p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground tabular-nums font-mono">{log.time}</span>
            <div className={`w-2 h-2 rounded-full ${
              log.type === 'warning' ? 'bg-warning' : log.type === 'action' ? 'bg-destructive' : 'bg-primary'
            }`} />
            <span className="text-sm text-foreground font-medium">{log.message}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);
}
