import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { Camera, Mic, Monitor, Eye, Download, CheckCircle, Users } from 'lucide-react';
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
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch children if user is a parent
        if (role === 'parent') {
          setLoadingChildren(true);
          try {
            const childrenRes = await evidenceAPI.getChildren();
            setChildren(childrenRes.data?.children || []);
          } catch (err) {
            console.error('Error fetching children:', err);
          } finally {
            setLoadingChildren(false);
          }
        }

        // Fetch evidence based on selected child or own evidence with retry logic
        let evidenceRes;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            if (role === 'parent' && selectedChild) {
              evidenceRes = await evidenceAPI.getChildEvidence(selectedChild);
            } else {
              evidenceRes = await evidenceAPI.getAll();
            }
            
            setEvidence(evidenceRes.data || []);
            break; // Success, exit retry loop
          } catch (err: any) {
            console.error(`Error fetching evidence (attempt ${retryCount + 1}):`, err);
            
            // If it's a 429 error, wait and retry
            if (err.message?.includes('Too many requests')) {
              retryCount++;
              const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
              
              if (retryCount < maxRetries) {
                // console.log(`Retrying in ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
              }
            }
            
            // For other errors, don't retry
            setEvidence([]);
            break;
          }
        }
      } catch (err) {
        console.error('Error fetching evidence:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role, selectedChild]);

  const BASE_URL = import.meta.env.VITE_API_URL.replace('/api', '');
  
  const handleView = (fileUrl: string) => {
    // If it's already a full URL (Cloudinary), use it directly
    // Otherwise, prepend the base URL for local files
    const fullUrl = fileUrl?.startsWith('http') ? fileUrl : `${BASE_URL}${fileUrl}`;
    console.log('Opening file URL:', fullUrl);
    console.log('Original fileUrl:', fileUrl);
    window.open(fullUrl, '_blank');
  };


  const handleDownload = (fileUrl: string, title?: string) => {
    const link = document.createElement('a');
    // If it's already a full URL (Cloudinary), use it directly
    // Otherwise, prepend the base URL for local files
    link.href = fileUrl?.startsWith('http') ? fileUrl : `${BASE_URL}${fileUrl}`;
    link.download = title || 'evidence';
    link.target = '_blank';
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

          {/* Child Selection Buttons for Parents */}
          {role === 'parent' && children.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-xl p-4 shadow-lg"
            >
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Select Child</h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedChild(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedChild === null
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                    }`}
                >
                  My Evidence
                </button>

                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChild(child.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedChild === child.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground hover:bg-secondary/80'
                      }`}
                  >
                    {child.name}
                  </button>
                ))}
              </div>

              {selectedChild && (
                <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Showing evidence for: <span className="font-medium">
                      {children.find(c => c.id === selectedChild)?.name}
                    </span>
                  </p>
                </div>
              )}
            </motion.div>
          )}

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
                        
                        {/* {item.childName && (
                          <p className="text-xs text-blue-600 font-medium">
                            Child: {item.childName}
                          </p>
                        )} */}
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
                        onClick={() => handleDownload(item.fileUrl, item.title)}
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