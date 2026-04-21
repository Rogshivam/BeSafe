import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { Camera, Mic, Monitor, Eye, Download, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { evidenceAPI } from '@/services/api';

const getIcon = (type: string) => {
  switch (type) {
    case 'Photo':
      return Camera;
    case 'Audio':
      return Mic;
    case 'Screen':
      return Monitor;
    default:
      return Camera;
  }
};

const getColor = (type: string) => {
  switch (type) {
    case 'Photo':
      return 'bg-blue-100 text-blue-600';
    case 'Audio':
      return 'bg-orange-100 text-orange-600';
    case 'Screen':
      return 'bg-purple-100 text-purple-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

const EvidenceLocker = () => {
  const { role } = useAuth();

  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvidence = async () => {
      try {
        const res = await evidenceAPI.getAll();
        setEvidence(res.data || []);
      } catch (err) {
        console.error('Error fetching evidence:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvidence();
  }, []);

  const handleView = (fileUrl: string) => {
    window.open(`${BASE_URL}${fileUrl}`, '_blank');
  };
  const BASE_URL = import.meta.env.VITE_API_URL.replace('/api', '');


  const handleDownload = (fileUrl: string) => {
    const link = document.createElement('a');
    link.href = `${BASE_URL}${fileUrl}`;
    link.download = 'evidence';
    link.click();
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <DashboardSidebar />

      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6 pl-10">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Evidence Locker
            </h1>
            <p className="text-muted-foreground text-sm">
              Securely stored evidence files
            </p>
          </motion.div>

          {/* Loading */}
          {loading && (
            <p className="text-sm text-muted-foreground">Loading evidence...</p>
          )}

          {/* Empty State */}
          {!loading && evidence.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No evidence found.
            </p>
          )}

          {/* Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {evidence.map((item, i) => {
              const Icon = getIcon(item.type);

              return (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-background rounded-2xl shadow-depth overflow-hidden hover:shadow-depth-hover hover:-translate-y-1 transition-all"
                >
                  {/* Icon */}
                  <div className="h-40 bg-secondary/50 flex items-center justify-center">
                    <div className={`w-16 h-16 rounded-2xl ${getColor(item.type)} flex items-center justify-center`}>
                      <Icon className="w-8 h-8" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-foreground">
                          {item.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(item.fileUrl)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-secondary rounded-xl text-xs font-medium text-foreground hover:bg-secondary/80"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>

                      <button
                        onClick={() => handleDownload(item.fileUrl)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 gradient-primary text-primary-foreground rounded-xl text-xs font-medium"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      <ChatbotWidget role={(role === 'adult' || role === 'parent' || role === 'child') ? role : 'adult'} />
    </div>
  );
};

export default EvidenceLocker;