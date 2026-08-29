import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { BottomNav } from '@/components/BottomNav';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { 
  Camera, 
  Mic, 
  Monitor, 
  Eye, 
  Download, 
  CheckCircle, 
  Users, 
  MapPin, 
  Trash2, 
  X, 
  ExternalLink,
  Volume2,
  Calendar,
  Layers,
  Image as ImageIcon,
  AlertTriangle,
  Search,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { evidenceAPI } from '@/services/api';
import { toast } from 'sonner';

const BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';

// Helper to get the full URL
const getFullUrl = (fileUrl?: string) => {
  if (!fileUrl) return '';
  return fileUrl.startsWith('http') ? fileUrl : `${BASE_URL}${fileUrl}`;
};

// Ultra-fast compressed thumbnail URL (Cloudinary auto-format, quality optimization, and dimension bounds)
const getCompressedImageUrl = (fileUrl?: string) => {
  if (!fileUrl) return '';
  const full = getFullUrl(fileUrl);
  if (full.includes('cloudinary.com') && full.includes('/upload/')) {
    return full.replace('/upload/', '/upload/w_450,c_limit,q_auto:eco,f_auto/');
  }
  return full;
};

const getIcon = (type: string) => {
  switch (type) {
    case 'Photo':
      return Camera;
    case 'Audio':
      return Mic;
    case 'Screen':
      return Monitor;
    case 'Location':
      return MapPin;
    default:
      return Camera;
  }
};

const getColor = (type: string) => {
  switch (type) {
    case 'Photo':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400';
    case 'Audio':
      return 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400';
    case 'Screen':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400';
    case 'Location':
      return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
};

// Component for optimized image thumbnail with lazy loading and fallback
const EvidenceThumbnail = ({ item, onClick }: { item: any; onClick: () => void }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const Icon = getIcon(item.type);

  const isImage = item.type === 'Photo' || item.type === 'Screen' || (item.fileUrl && !item.fileUrl.includes('.wav') && !item.fileUrl.includes('.mp3') && !item.fileUrl.includes('.ogg'));

  if (isImage && item.fileUrl && !imageError) {
    const compressedSrc = getCompressedImageUrl(item.fileUrl);

    return (
      <div 
        onClick={onClick}
        className="relative h-44 bg-secondary/40 overflow-hidden cursor-pointer group flex items-center justify-center"
      >
        {/* Placeholder shimmer while loading */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted/40 animate-pulse flex items-center justify-center">
            <ImageIcon className="w-8 h-8 opacity-30 text-muted-foreground animate-bounce" />
          </div>
        )}

        <img
          src={compressedSrc}
          alt={item.title || 'Evidence'}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Hover zoom overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <div className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white">
            <Eye className="w-5 h-5" />
          </div>
          <span className="text-white text-xs font-semibold">View Preview</span>
        </div>

        {/* Type Badge */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold backdrop-blur-md shadow-sm ${getColor(item.type)}`}>
          {item.type}
        </span>
      </div>
    );
  }

  // Audio preview thumbnail with interactive audio player
  if (item.type === 'Audio' || (item.fileUrl && (item.fileUrl.includes('.wav') || item.fileUrl.includes('.mp3') || item.fileUrl.includes('.ogg')))) {
    return (
      <div className="h-44 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-secondary/40 p-4 flex flex-col justify-between border-b border-border/50">
        <div className="flex items-center justify-between">
          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getColor('Audio')}`}>
            Audio Recording
          </span>
          <Volume2 className="w-5 h-5 text-amber-500 animate-pulse" />
        </div>

        {/* Animated sound wave bars */}
        <div className="flex items-center justify-center gap-1 my-1">
          {[40, 70, 30, 90, 60, 100, 45, 80, 55, 95, 35, 65, 85, 40].map((h, index) => (
            <div
              key={index}
              style={{ height: `${h * 0.28}px` }}
              className="w-1.5 bg-amber-500/70 rounded-full"
            />
          ))}
        </div>

        {/* HTML5 Audio Player */}
        {item.fileUrl && (
          <audio 
            controls 
            preload="metadata"
            src={getFullUrl(item.fileUrl)} 
            className="w-full h-8 mt-1 scale-95 origin-center"
          />
        )}
      </div>
    );
  }

  // Location preview thumbnail
  if (item.type === 'Location' || item.location) {
    const lat = item.location?.latitude;
    const lng = item.location?.longitude;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    return (
      <div className="h-44 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-secondary/40 p-4 flex flex-col justify-between border-b border-border/50">
        <div className="flex items-center justify-between">
          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getColor('Location')}`}>
            GPS Location
          </span>
          <MapPin className="w-5 h-5 text-emerald-500" />
        </div>

        <div className="my-auto text-center px-2">
          <p className="text-xs font-semibold text-foreground truncate">
            {item.location?.address || 'Pinned Location'}
          </p>
          {lat && lng && (
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
              {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
            </p>
          )}
        </div>

        {lat && lng && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-medium hover:bg-emerald-500/25 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open in Google Maps
          </a>
        )}
      </div>
    );
  }

  // Generic fallback
  return (
    <div 
      onClick={onClick}
      className="h-44 bg-secondary/50 flex flex-col items-center justify-center gap-2 cursor-pointer group"
    >
      <div className={`w-14 h-14 rounded-2xl ${getColor(item.type)} flex items-center justify-center group-hover:scale-110 transition-transform`}>
        <Icon className="w-7 h-7" />
      </div>
      <span className="text-xs text-muted-foreground font-medium">{item.type || 'Evidence File'}</span>
    </div>
  );
};

const EvidenceLocker = () => {
  const { role } = useAuth();

  // Initialize from sessionStorage cache for instant 0ms load
  const [evidence, setEvidence] = useState<any[]>(() => {
    try {
      const cached = sessionStorage.getItem(`besafe_evidence_cache_${role || 'user'}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => evidence.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalItem, setActiveModalItem] = useState<any | null>(null);

  // Popup Dialog States for Errors and Confirmations
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string; onRetry?: () => void } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh || evidence.length === 0) {
        setLoading(true);
      }
      setIsRefreshing(true);

      // Fast parallel fetch for parents
      const promises: Promise<any>[] = [];

      if (role === 'parent') {
        promises.push(
          evidenceAPI.getChildren().then(res => {
            const list = res.data?.children || [];
            setChildren(list);
            return list;
          }).catch(err => {
            console.error('Children fetch error:', err);
            return [];
          })
        );
      }

      // Fetch evidence based on selection
      const evidencePromise = (role === 'parent' && selectedChild)
        ? evidenceAPI.getChildEvidence(selectedChild)
        : evidenceAPI.getAll();

      promises.push(evidencePromise);

      const results = await Promise.allSettled(promises);
      const evidenceResult = results[results.length - 1];

      if (evidenceResult.status === 'fulfilled') {
        const data = evidenceResult.value?.data || [];
        setEvidence(data);
        try {
          sessionStorage.setItem(`besafe_evidence_cache_${role || 'user'}_${selectedChild || 'all'}`, JSON.stringify(data));
        } catch {}
      } else {
        throw evidenceResult.reason;
      }
    } catch (err: any) {
      if (evidence.length === 0) {
        setErrorDialog({
          title: 'Evidence Loading Notice',
          message: err.message || 'Could not refresh latest evidence records. Please check your network connection.',
          onRetry: () => fetchData(true)
        });
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [role, selectedChild, evidence.length]);

  useEffect(() => {
    // Check if child-specific cache exists
    try {
      const cached = sessionStorage.getItem(`besafe_evidence_cache_${role || 'user'}_${selectedChild || 'all'}`);
      if (cached) {
        setEvidence(JSON.parse(cached));
        setLoading(false);
      }
    } catch {}
    fetchData();
  }, [role, selectedChild]);

  // Real-time Search and Type Filter
  const filteredEvidence = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return evidence.filter((item) => {
      // Type Filter
      if (selectedType === 'Photos' && item.type !== 'Photo') return false;
      if (selectedType === 'Audio' && item.type !== 'Audio') return false;
      if (selectedType === 'Screenshots' && item.type !== 'Screen') return false;
      if (selectedType === 'Locations' && item.type !== 'Location') return false;

      // Search Query Filter
      if (q) {
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchType = (item.type || '').toLowerCase().includes(q);
        const matchChild = (item.childName || '').toLowerCase().includes(q);
        const matchAddress = (item.location?.address || '').toLowerCase().includes(q);
        const matchDate = new Date(item.createdAt).toLocaleDateString().toLowerCase().includes(q);

        return matchTitle || matchType || matchChild || matchAddress || matchDate;
      }

      return true;
    });
  }, [evidence, selectedType, searchQuery]);

  const handleView = (item: any) => {
    setActiveModalItem(item);
  };

  const handleDownload = (fileUrl?: string, title?: string) => {
    if (!fileUrl) return;
    const fullUrl = getFullUrl(fileUrl);
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = title ? `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}` : 'evidence';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  const promptDelete = (evidenceId: string) => {
    setDeleteTargetId(evidenceId);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    try {
      setIsDeleting(true);
      await evidenceAPI.delete(deleteTargetId);
      toast.success('Evidence deleted successfully');
      setEvidence(prev => {
        const updated = prev.filter(item => item._id !== deleteTargetId);
        try {
          sessionStorage.setItem(`besafe_evidence_cache_${role || 'user'}_${selectedChild || 'all'}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      if (activeModalItem?._id === deleteTargetId) {
        setActiveModalItem(null);
      }
      setDeleteTargetId(null);
    } catch (err: any) {
      setErrorDialog({
        title: 'Delete Failed',
        message: err.message || 'Could not delete the evidence file. Please verify your permissions and try again.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <DashboardSidebar />

      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
                <Layers className="w-6 h-6 text-primary" /> Evidence Locker
              </h1>
              <p className="text-muted-foreground text-sm">
                Real-time captured media, photos, audio recordings, and location records
              </p>
            </div>

            {/* Quick Refresh & Status Widget */}
            <div className="flex items-center gap-3">
              {isRefreshing && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-medium animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing...</span>
                </div>
              )}
              <button
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                title="Refresh Evidence"
                className="p-2.5 bg-card border border-border rounded-xl text-foreground hover:bg-secondary transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              </button>
            </div>
          </motion.div>

          {/* Search Bar & Type Filter Tabs Row */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search evidence by title, date, location, child..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 outline-none shadow-sm transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Type Filter Tabs */}
            <div className="flex gap-1 p-1 bg-card border border-border rounded-xl text-xs font-medium overflow-x-auto shadow-sm">
              {['All', 'Photos', 'Audio', 'Screenshots', 'Locations'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedType(tab)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    selectedType === tab
                      ? 'gradient-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Child Selection Buttons for Parents */}
          {role === 'parent' && children.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl p-4 shadow-depth border border-border"
            >
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Select Family Member</h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedChild(null)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedChild === null
                      ? 'gradient-primary text-primary-foreground shadow-md'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  My Evidence
                </button>

                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChild(child.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedChild === child.id
                        ? 'gradient-primary text-primary-foreground shadow-md'
                        : 'bg-secondary text-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {child.name}
                  </button>
                ))}
              </div>

              {selectedChild && (
                <div className="mt-3 p-2.5 bg-primary/10 border border-primary/20 rounded-xl">
                  <p className="text-xs text-primary font-medium">
                    Showing real captured evidence for: <span className="font-bold underline">
                      {children.find(c => c.id === selectedChild)?.name}
                    </span>
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Search Result Count when searching */}
          {searchQuery && (
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>Found {filteredEvidence.length} matching {filteredEvidence.length === 1 ? 'record' : 'records'} for "{searchQuery}"</span>
              <button 
                onClick={() => setSearchQuery('')}
                className="text-primary hover:underline text-xs"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Loading Skeleton State */}
          {loading && (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-card rounded-2xl p-4 shadow-depth border border-border animate-pulse space-y-3">
                  <div className="h-40 bg-muted/60 rounded-xl" />
                  <div className="h-4 bg-muted/60 rounded w-3/4" />
                  <div className="h-3 bg-muted/40 rounded w-1/2" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-8 bg-muted/60 rounded-xl flex-1" />
                    <div className="h-8 bg-muted/60 rounded-xl flex-1" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredEvidence.length === 0 && (
            <div className="bg-card rounded-2xl shadow-depth border border-border p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-foreground text-lg">No Evidence Found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery 
                  ? `No evidence matches the search query "${searchQuery}".`
                  : selectedType !== 'All' 
                    ? `No evidence items found for filter "${selectedType}".`
                    : 'Capture photos, audio recordings, or screenshots from the dashboard to store evidence here.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-secondary text-foreground rounded-xl text-xs font-semibold hover:bg-secondary/80 mt-2"
                >
                  Reset Search
                </button>
              )}
            </div>
          )}

          {/* Grid of Evidence Cards */}
          {!loading && filteredEvidence.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6">
              {filteredEvidence.map((item, i) => (
                <motion.div
                  key={item._id || i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="bg-card rounded-2xl shadow-depth border border-border overflow-hidden hover:shadow-depth-hover hover:-translate-y-1 transition-all flex flex-col"
                >
                  {/* Media Thumbnail with compressed rendering */}
                  <EvidenceThumbnail item={item} onClick={() => handleView(item)} />

                  {/* Card Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h3 className="font-bold text-foreground text-sm line-clamp-1">
                          {item.title || 'Evidence Entry'}
                        </h3>
                        <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(item.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>

                      {item.childName && (
                        <p className="text-xs text-primary font-medium mt-1">
                          Recorded by: {item.childName}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      <button
                        onClick={() => handleView(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-secondary rounded-xl text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>

                      {item.fileUrl && (
                        <button
                          onClick={() => handleDownload(item.fileUrl, item.title)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 gradient-primary text-primary-foreground rounded-xl text-xs font-medium shadow-sm hover:opacity-90 active:scale-95 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      )}

                      {item._id && (
                        <button
                          onClick={() => promptDelete(item._id)}
                          title="Delete Evidence"
                          className="p-2 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Preview Modal Dialog */}
      <AnimatePresence>
        {activeModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground text-base">
                    {activeModalItem.title || 'Evidence Preview'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activeModalItem.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setActiveModalItem(null)}
                  className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex flex-col items-center justify-center bg-background/50">
                {/* Full Image */}
                {(activeModalItem.type === 'Photo' || activeModalItem.type === 'Screen' || (activeModalItem.fileUrl && !activeModalItem.fileUrl.includes('.wav') && !activeModalItem.fileUrl.includes('.mp3'))) && (
                  <div className="relative max-h-[60vh] rounded-2xl overflow-hidden shadow-lg border border-border bg-black/5">
                    <img
                      src={getFullUrl(activeModalItem.fileUrl)}
                      alt={activeModalItem.title}
                      className="max-h-[60vh] max-w-full object-contain rounded-2xl"
                    />
                  </div>
                )}

                {/* Audio Player in Modal */}
                {(activeModalItem.type === 'Audio' || (activeModalItem.fileUrl && (activeModalItem.fileUrl.includes('.wav') || activeModalItem.fileUrl.includes('.mp3')))) && (
                  <div className="w-full max-w-md p-6 bg-card rounded-2xl border border-border shadow-depth text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto">
                      <Volume2 className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-foreground">{activeModalItem.title}</h4>
                    <audio
                      controls
                      autoPlay
                      src={getFullUrl(activeModalItem.fileUrl)}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Location Details in Modal */}
                {(activeModalItem.type === 'Location' || activeModalItem.location) && (
                  <div className="w-full max-w-md p-6 bg-card rounded-2xl border border-border shadow-depth space-y-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
                      <MapPin className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{activeModalItem.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activeModalItem.location?.address || 'GPS Coordinates Recorded'}
                      </p>
                      {activeModalItem.location?.latitude && (
                        <p className="text-xs font-mono text-foreground/80 mt-2 bg-secondary/60 py-1.5 px-3 rounded-lg inline-block">
                          Lat: {activeModalItem.location.latitude} | Lng: {activeModalItem.location.longitude}
                        </p>
                      )}
                    </div>
                    {activeModalItem.location?.latitude && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${activeModalItem.location.latitude},${activeModalItem.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 gradient-primary text-primary-foreground rounded-xl text-sm font-medium shadow-md"
                      >
                        <ExternalLink className="w-4 h-4" /> Open Full Google Maps
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border bg-card flex justify-end gap-3">
                {activeModalItem.fileUrl && (
                  <>
                    <button
                      onClick={() => window.open(getFullUrl(activeModalItem.fileUrl), '_blank')}
                      className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" /> Open Original
                    </button>
                    <button
                      onClick={() => handleDownload(activeModalItem.fileUrl, activeModalItem.title)}
                      className="flex items-center gap-2 px-4 py-2 gradient-primary text-primary-foreground rounded-xl text-sm font-medium shadow-sm hover:opacity-90 transition-all"
                    >
                      <Download className="w-4 h-4" /> Download
                    </button>
                  </>
                )}
                {activeModalItem._id && (
                  <button
                    onClick={() => promptDelete(activeModalItem._id)}
                    className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-xl text-sm font-medium hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
                <button
                  onClick={() => setActiveModalItem(null)}
                  className="px-4 py-2 bg-secondary/80 rounded-xl text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Themed Error Popup Dialog */}
      <AnimatePresence>
        {errorDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-destructive/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-base">{errorDialog.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{errorDialog.message}</p>
                </div>
                <button
                  onClick={() => setErrorDialog(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                {errorDialog.onRetry && (
                  <button
                    onClick={() => {
                      const retry = errorDialog.onRetry;
                      setErrorDialog(null);
                      retry?.();
                    }}
                    className="px-4 py-2 bg-secondary rounded-xl text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={() => setErrorDialog(null)}
                  className="px-4 py-2 gradient-primary text-primary-foreground rounded-xl text-xs font-semibold shadow-sm hover:opacity-90 transition-all"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Themed Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteTargetId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-base">Delete Evidence File</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Are you sure you want to permanently delete this evidence? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                <button
                  disabled={isDeleting}
                  onClick={() => setDeleteTargetId(null)}
                  className="px-4 py-2 bg-secondary rounded-xl text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isDeleting}
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-xs font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Evidence'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
      <ChatbotWidget role={(role === 'adult' || role === 'parent' || role === 'child') ? role : 'adult'} />
    </div>
  );
};

export default EvidenceLocker;