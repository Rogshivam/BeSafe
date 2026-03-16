interface LogEntry {
  time: string;
  message: string;
  type: 'system' | 'action' | 'warning';
}

interface ActivityLogProps {
  entries?: LogEntry[];
}

const defaultEntries: LogEntry[] = [
  { time: '12:02', message: 'AI Monitoring Started', type: 'system' },
  { time: '12:05', message: 'Screenshot Captured', type: 'action' },
  { time: '12:10', message: 'Risk Score Updated', type: 'system' },
  { time: '12:14', message: 'Suspicious Activity Alert', type: 'warning' },
];

export const ActivityLog = ({ entries = defaultEntries }: ActivityLogProps) => (
  <div className="bg-background rounded-2xl shadow-depth overflow-hidden">
    <div className="p-4 border-b border-border flex justify-between items-center">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <span className="text-lg">📋</span> Activity Log
      </h3>
      <button className="text-xs text-primary font-bold hover:underline">View All</button>
    </div>
    <div className="divide-y divide-border">
      {entries.map((log, i) => (
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
