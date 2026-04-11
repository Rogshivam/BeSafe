import { useState } from 'react';
import { Plus, X, MapPin, Clock, CheckCircle, AlertCircle, Upload, Image, Video } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSidebar } from './DashboardSidebar';
interface Incident {
  id: string;
  title: string;
  description: string;
  location?: string;
  timestamp: string;
  status: 'Open' | 'Resolved';
  mediaType?: 'image' | 'video';
  mediaName?: string;
}

const dummyIncidents: Incident[] = [
  { id: '1', title: 'Suspicious Person Near School', description: 'An unknown individual was seen loitering near the school entrance for over 30 minutes.', location: 'Lincoln Elementary School', timestamp: '2026-04-10T09:15:00', status: 'Open' },
  { id: '2', title: 'Broken Street Light', description: 'The street light on Oak Avenue is broken, making the area very dark at night.', location: 'Oak Avenue & 5th St', timestamp: '2026-04-09T18:30:00', status: 'Open' },
  { id: '3', title: 'Verbal Harassment at Park', description: 'Was verbally harassed by a group while jogging. Reported to local authorities.', location: 'Riverside Park', timestamp: '2026-04-08T07:45:00', status: 'Resolved' },
  { id: '4', title: 'Lost Child Found', description: 'A 6-year-old was found alone near the mall. Reunited with parents after contacting security.', timestamp: '2026-04-07T14:20:00', status: 'Resolved' },
];

export default function IncidentReport() {
  const [incidents, setIncidents] = useState<Incident[]>(dummyIncidents);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', location: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = () => {
    if (!form.title || !form.description) return;
    const newIncident: Incident = {
      id: Date.now().toString(),
      title: form.title,
      description: form.description,
      location: form.location || undefined,
      timestamp: new Date().toISOString(),
      status: 'Open',
      mediaType: selectedFile?.type.startsWith('video') ? 'video' : selectedFile ? 'image' : undefined,
      mediaName: selectedFile?.name,
    };
    setIncidents(prev => [newIncident, ...prev]);
    setForm({ title: '', description: '', location: '' });
    setSelectedFile(null);
    setShowForm(false);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
      <div className="flex min-h-screen bg-secondary/30">
      <DashboardSidebar />

      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6 pl-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-bold text-foreground mb-1 ">Incident Reports</h1>
            <p className="text-muted-foreground text-sm">Track and report safety incidents</p>
          </motion.div>
          </div>

      {/* Incidents List */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {incidents.map((inc, i) => (
          <motion.div
            key={inc.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl shadow-depth p-4 space-y-2"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-sm text-foreground leading-tight flex-1">{inc.title}</h3>
              <span className={`ml-2 shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                inc.status === 'Open'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-[hsl(var(--safe))]/10 text-[hsl(var(--safe))]'
              }`}>
                {inc.status === 'Open' ? <AlertCircle className="w-3 h-3 inline mr-0.5 -mt-0.5" /> : <CheckCircle className="w-3 h-3 inline mr-0.5 -mt-0.5" />}
                {inc.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{inc.description}</p>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(inc.timestamp)}</span>
              {inc.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{inc.location}</span>}
            </div>
            {inc.mediaName && (
              <div className="flex items-center gap-1.5 text-[10px] text-primary font-medium">
                {inc.mediaType === 'video' ? <Video className="w-3 h-3" /> : <Image className="w-3 h-3" />}
                {inc.mediaName}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full gradient-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* New Report Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/30 z-50" onClick={() => setShowForm(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="max-w-lg mx-auto p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg text-foreground">New Report</h2>
                  <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                </div>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Incident Title" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe what happened..." rows={3} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Location (optional)" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{selectedFile ? selectedFile.name : 'Upload image or video'}</span>
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                </label>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Auto-timestamped: {new Date().toLocaleString()}</span>
                </div>

                <button onClick={handleSubmit} className="w-full py-3 gradient-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all">
                  Submit Report
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
      </main>
    </div>
  );
}
