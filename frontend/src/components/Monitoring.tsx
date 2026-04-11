import { useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { MapWidget } from '@/components/MapWidget';
import { MonitoringCard } from '@/components/MonitoringCard';
import { Eye, Bell, Filter } from 'lucide-react';
import { toast } from 'sonner';

const monitoredPersons = [
  { id: 1, name: 'Emma', role: 'child' as const, location: 'School', status: 'safe' as const, lastActive: '5 min ago', battery: 82, avatar: '👧', phone: '+1234567890' },
  { id: 2, name: 'Liam', role: 'child' as const, location: 'Home', status: 'safe' as const, lastActive: '2 min ago', battery: 45, avatar: '👦', phone: '+1234567891' },
  { id: 3, name: 'Grandma Rose', role: 'adult' as const, location: 'Park', status: 'warning' as const, lastActive: '15 min ago', battery: 18, avatar: '👵', phone: '+1234567892' },
];

const activityFeed = [
  { time: '2:30 PM', person: 'Emma', event: 'Arrived at School', type: 'safe' },
  { time: '2:15 PM', person: 'Liam', event: 'Entered Home Safe Zone', type: 'safe' },
  { time: '1:50 PM', person: 'Grandma Rose', event: 'Left Safe Zone — Near Park Boundary', type: 'warning' },
  { time: '1:30 PM', person: 'Emma', event: 'Morning check-in completed', type: 'safe' },
  { time: '12:45 PM', person: 'Liam', event: 'Low battery alert (45%)', type: 'warning' },
  { time: '12:00 PM', person: 'Grandma Rose', event: 'Battery critically low (18%)', type: 'alert' },
];

const alertHistory = [
  { time: '1:50 PM', msg: 'Grandma Rose near park boundary', severity: 'warning' },
  { time: '12:00 PM', msg: 'Grandma Rose battery critically low', severity: 'alert' },
  { time: '11:30 AM', msg: 'Liam left school zone', severity: 'warning' },
];

const Monitoring = () => {
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'child' | 'adult'>('all');

  const filtered = filter === 'all' ? monitoredPersons : monitoredPersons.filter(p => p.role === filter);

  const handleCall = (person: typeof monitoredPersons[0]) => {
    window.open(`tel:${person.phone}`, '_self');
  };

  const handleMessage = (person: typeof monitoredPersons[0]) => {
    const msg = encodeURIComponent(`Hi ${person.name}, just checking in. Are you safe?`);
    window.open(`sms:${person.phone}?body=${msg}`, '_self');
  };

  const handleLocate = (person: typeof monitoredPersons[0]) => {
    setSelectedPerson(person.name);
    toast.success(`Tracking ${person.name}`, { description: `Current location: ${person.location}` });
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <DashboardSidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Eye className="w-6 h-6 text-primary" /> Monitoring Center
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Track and protect your loved ones in real-time</p>
            </div>
            <div className="flex gap-2">
              {(['all', 'child', 'adult'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${filter === f ? 'gradient-primary text-primary-foreground' : 'bg-card text-foreground shadow-depth'}`}
                >
                  {f === 'all' ? 'All' : f === 'child' ? '👶 Children' : '👤 Adults'}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Person Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(person => (
              <MonitoringCard
                key={person.id}
                {...person}
                onCall={() => handleCall(person)}
                onMessage={() => handleMessage(person)}
                onLocate={() => handleLocate(person)}
              />
            ))}
          </div>

          {/* Map + Activity */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MapWidget
                location={selectedPerson ? monitoredPersons.find(p => p.name === selectedPerson)?.location || 'Unknown' : 'All Locations'}
                status={selectedPerson ? 'Tracking' : 'Overview'}
              />
            </div>

            {/* Activity Feed */}
            <div className="bg-card rounded-2xl shadow-depth overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <span className="text-lg">📡</span> Live Feed
                </h3>
                <Filter className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {activityFeed.map((item, i) => (
                  <div key={i} className="p-3 flex items-start gap-3 hover:bg-secondary/50 transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      item.type === 'alert' ? 'bg-emergency' : item.type === 'warning' ? 'bg-warning' : 'bg-safe'
                    }`} />
                    <div>
                      <p className="text-sm text-foreground"><span className="font-semibold">{item.person}</span> — {item.event}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alert History */}
          <div className="bg-card rounded-2xl shadow-depth overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Bell className="w-5 h-5 text-warning" /> Alert History
              </h3>
              <span className="text-xs text-muted-foreground">{alertHistory.length} alerts today</span>
            </div>
            <div className="divide-y divide-border">
              {alertHistory.map((alert, i) => (
                <div key={i} className="p-4 flex items-center gap-4 hover:bg-secondary/50 transition-colors">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    alert.severity === 'alert' ? 'bg-emergency animate-pulse' : 'bg-warning'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{alert.msg}</p>
                    <p className="text-xs text-muted-foreground">{alert.time}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    alert.severity === 'alert' ? 'bg-emergency/10 text-emergency' : 'bg-warning/10 text-warning'
                  }`}>
                    {alert.severity === 'alert' ? 'Critical' : 'Warning'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <ChatbotWidget role="parent" />
    </div>
  );
};

export default Monitoring;
