import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { Camera, Mic, Monitor, Eye, Download, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const evidenceItems = [
  { title: 'Photo Evidence', date: '12 Mar 2026', icon: Camera, color: 'bg-blue-100 text-blue-600' },
  { title: 'Audio Recordings', date: '11 Mar 2026', icon: Mic, color: 'bg-orange-100 text-orange-600' },
  { title: 'Screen Captures', date: '10 Mar 2026', icon: Monitor, color: 'bg-purple-100 text-purple-600' },
];

const EvidenceLocker = () => {
  const { role } = useAuth();

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <DashboardSidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-bold text-foreground mb-1">Evidence Locker</h1>
            <p className="text-muted-foreground text-sm">Securely stored evidence files</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {evidenceItems.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-background rounded-2xl shadow-depth overflow-hidden hover:shadow-depth-hover hover:-translate-y-1 transition-all"
              >
                <div className="h-40 bg-secondary/50 flex items-center justify-center">
                  <div className={`w-16 h-16 rounded-2xl ${item.color} flex items-center justify-center`}>
                    <item.icon className="w-8 h-8" />
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-foreground">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">{item.date}</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1 py-2 bg-secondary rounded-xl text-xs font-medium text-foreground hover:bg-secondary/80">
                      <Eye className="w-3 h-3" /> View
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1 py-2 gradient-primary text-primary-foreground rounded-xl text-xs font-medium">
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <ChatbotWidget role={role || 'adult'} />
    </div>
  );
};

export default EvidenceLocker;
