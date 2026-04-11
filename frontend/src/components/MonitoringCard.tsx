import { motion } from 'framer-motion';
import { Phone, MessageSquare, MapPin, Activity, Battery, BatteryLow, BatteryMedium } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MonitoringCardProps {
  name: string;
  role: 'child' | 'adult';
  location: string;
  status: 'safe' | 'warning' | 'alert';
  lastActive: string;
  battery: number;
  avatar: string;
  onCall: () => void;
  onMessage: () => void;
  onLocate: () => void;
}

const statusConfig = {
  safe: { label: 'Safe', bg: 'bg-safe/10', text: 'text-safe', dot: 'bg-safe' },
  warning: { label: 'Warning', bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
  alert: { label: 'Alert', bg: 'bg-emergency/10', text: 'text-emergency', dot: 'bg-emergency' },
};

export const MonitoringCard = ({ name, role, location, status, lastActive, battery, avatar, onCall, onMessage, onLocate }: MonitoringCardProps) => {
  const s = statusConfig[status];
  const BatteryIcon = battery > 60 ? Battery : battery > 25 ? BatteryMedium : BatteryLow;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl shadow-depth p-5 space-y-4 border border-border"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
          {avatar}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-foreground">{name}</h4>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {role === 'child' ? '👶 Child' : '👤 Adult'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-2 h-2 rounded-full ${s.dot} animate-pulse`} />
            <span className={`text-xs font-medium ${s.text}`}>{s.label}</span>
            <span className="text-xs text-muted-foreground">· {lastActive}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground ml-auto">
          <BatteryIcon className={`w-3.5 h-3.5 ${battery <= 25 ? 'text-emergency' : ''}`} />
          <span className={battery <= 25 ? 'text-emergency font-medium' : ''}>{battery}%</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onCall} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-safe/10 text-safe text-sm font-medium hover:bg-safe/20 transition-colors">
          <Phone className="w-4 h-4" /> Call
        </button>
        <button onClick={onMessage} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
          <MessageSquare className="w-4 h-4" /> Message
        </button>
        <button onClick={onLocate} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-warning/10 text-warning text-sm font-medium hover:bg-warning/20 transition-colors">
          <Activity className="w-4 h-4" /> Track
        </button>
      </div>
    </motion.div>
  );
};
