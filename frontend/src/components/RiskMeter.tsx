import { motion } from 'framer-motion';

interface RiskMeterProps {
  value: number;
  label?: string;
}

export const RiskMeter = ({ value, label = 'Suspicious' }: RiskMeterProps) => {
  const getColor = () => {
    if (value < 40) return 'text-primary';
    if (value < 70) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="bg-background p-6 rounded-2xl shadow-depth">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Risk Score</h3>
      </div>

      <div className="flex items-center justify-center mb-4">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--secondary))" strokeWidth="10" />
            <motion.circle
              cx="60" cy="60" r="50" fill="none"
              stroke="url(#riskGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${value * 3.14} ${314 - value * 3.14}`}
              initial={{ strokeDasharray: "0 314" }}
              animate={{ strokeDasharray: `${value * 3.14} ${314 - value * 3.14}` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22C55E" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#EF4444" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${getColor()}`}>{value}%</span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
          value >= 70 ? 'bg-destructive/10 text-destructive' : value >= 40 ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
        }`}>
          Threat Level: {label}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-3 justify-center">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs text-muted-foreground">AI Monitoring Active</span>
      </div>
    </div>
  );
};
