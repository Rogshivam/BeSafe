import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, X, MapPin, Clock, CheckCircle,
  AlertCircle, Upload, Image as ImageIcon, Video, Users,
  Volume2, FileText, Eye, Download, Navigation, Search, RefreshCw, Loader2
} from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSidebar } from './DashboardSidebar';
import { emergencyAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';

const getFullUrl = (fileUrl?: string) => {
  if (!fileUrl) return '';
  return fileUrl.startsWith('http') ? fileUrl : `${BASE_URL}${fileUrl}`;
};

// Ultra-fast compressed thumbnail URL for Cloudinary
const getCompressedImageUrl = (fileUrl?: string) => {
  if (!fileUrl) return '';
  const full = getFullUrl(fileUrl);
  if (full.includes('cloudinary.com') && full.includes('/upload/')) {
    return full.replace('/upload/', '/upload/w_450,c_limit,q_auto:eco,f_auto/');
  }
  return full;
};

interface Incident {
  id: string;
  title: string;
  description: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  timestamp: string;
  status: 'Active' | 'Resolved';
  mediaType?: 'image' | 'video' | 'audio' | 'file';
  mediaName?: string;
  image?: string;
  audioRecording?: string;
  childName?: string;
}

export default function IncidentReport() {
  const { role } = useAuth();

  // Initialize from sessionStorage cache for instant 0ms render
  const [incidents, setIncidents] = useState<Incident[]>(() => {
    try {
      const cached = sessionStorage.getItem(`besafe_incidents_cache_${role || 'user'}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => incidents.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Resolved'>('All');

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [editIncident, setEditIncident] = useState<Incident | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; title: string; type: string } | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Child selection state for parents
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  const detectMediaType = (url?: string, explicitType?: string) => {
    if (!url) return null;
    const lower = url.toLowerCase();
    if (
      explicitType === 'image' || 
      lower.includes('/image/') || 
      lower.match(/\.(jpeg|jpg|png|gif|webp|svg|bmp|avif)(\?.*)?$/) ||
      lower.includes('image-')
    ) {
      return 'image';
    }
    if (
      explicitType === 'audio' || 
      lower.includes('/audio/') || 
      lower.match(/\.(mp3|wav|ogg|m4a|aac|webm)(\?.*)?$/) ||
      lower.includes('audio-')
    ) {
      return 'audio';
    }
    if (
      explicitType === 'video' || 
      lower.includes('/video/') || 
      lower.match(/\.(mp4|mov|avi|mkv)(\?.*)?$/) ||
      lower.includes('video-')
    ) {
      return 'video';
    }
    return 'file';
  };

  // Fetch incidents with fast caching
  const fetchIncidents = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh || incidents.length === 0) {
        setLoading(true);
      }
      setIsRefreshing(true);

      if (role === 'parent') {
        emergencyAPI.getChildren().then(res => {
          setChildren(res.data?.children || []);
        }).catch(err => {
          console.error('Error fetching children:', err);
        });
      }

      let res;
      if (role === 'parent' && selectedChild) {
        res = await emergencyAPI.getChildIncidents(selectedChild);
      } else {
        res = await emergencyAPI.getEmergencyHistory();
      }

      const mapped: Incident[] = (res.data?.emergencies || []).map((e: any) => {
        const candidateUrl = e.image || e.audioRecording || e.mediaName || e.mediaUrl;
        const detectedType = detectMediaType(candidateUrl, e.mediaType);

        let image = e.image;
        let audioRecording = e.audioRecording;

        if (!image && detectedType === 'image' && candidateUrl) {
          image = candidateUrl;
        }
        if (!audioRecording && detectedType === 'audio' && candidateUrl) {
          audioRecording = candidateUrl;
        }

        return {
          id: e._id || e.id,
          title: e.title || e.message || "Untitled Incident",
          description: e.description || e.message || "No description provided",
          location: (typeof e.location === 'string' ? e.location : e.location?.address) || e.address || "Unknown Location",
          latitude: e.latitude || e.location?.latitude,
          longitude: e.longitude || e.location?.longitude,
          timestamp: e.createdAt || e.updatedAt || new Date().toISOString(),
          status: (e.status === 'Resolved' ? 'Resolved' : 'Active') as 'Active' | 'Resolved',
          mediaType: detectedType || e.mediaType,
          mediaName: e.mediaName,
          image,
          audioRecording,
          childName: e.childName || e.individualId?.name || undefined
        };
      });

      setIncidents(mapped);
      try {
        sessionStorage.setItem(`besafe_incidents_cache_${role || 'user'}_${selectedChild || 'all'}`, JSON.stringify(mapped));
      } catch {}
    } catch (err: any) {
      console.error('Failed to fetch incidents:', err);
      if (incidents.length === 0) {
        toast.error('Failed to load incident reports');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [role, selectedChild, incidents.length]);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`besafe_incidents_cache_${role || 'user'}_${selectedChild || 'all'}`);
      if (cached) {
        setIncidents(JSON.parse(cached));
        setLoading(false);
      }
    } catch {}
    fetchIncidents();
  }, [role, selectedChild]);

  // Real-time Search and Status Filtering
  const filteredIncidents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return incidents.filter((inc) => {
      if (statusFilter !== 'All' && inc.status !== statusFilter) {
        return false;
      }

      if (q) {
        const matchTitle = (inc.title || '').toLowerCase().includes(q);
        const matchDesc = (inc.description || '').toLowerCase().includes(q);
        const matchLoc = (inc.location || '').toLowerCase().includes(q);
        const matchChild = (inc.childName || '').toLowerCase().includes(q);
        const matchStatus = (inc.status || '').toLowerCase().includes(q);
        const matchDate = new Date(inc.timestamp).toLocaleDateString().toLowerCase().includes(q);

        return matchTitle || matchDesc || matchLoc || matchChild || matchStatus || matchDate;
      }

      return true;
    });
  }, [incidents, statusFilter, searchQuery]);

  // Submit report
  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Please provide both a title and description');
      return;
    }

    try {
      setSubmitting(true);

      await emergencyAPI.triggerEmergency(
        {
          triggeredBy: 'Manual',
          latitude: 28.6139,
          longitude: 77.2090,
          title: form.title,
          description: form.description,
          message: form.description,
          address: form.location || 'Reported Location',
          severity: 'Medium'
        },
        {
          image: selectedFile || undefined
        }
      );

      toast.success('Incident report created successfully');
      await fetchIncidents(true);

      setForm({ title: '', description: '', location: '' });
      setSelectedFile(null);
      setShowForm(false);
    } catch (err: any) {
      console.error('Submit error:', err);
      toast.error(`Failed to submit report: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Add location handler with reverse geocoding
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();

          const address = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

          setForm((prev) => ({
            ...prev,
            location: address,
          }));
          toast.success("Location acquired");
        } catch (err) {
          setForm((prev) => ({
            ...prev,
            location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          }));
        }
      },
      () => {
        toast.error("Location access denied. Please enter manually.");
      }
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleStatus = async (incident: Incident) => {
    try {
      const newStatus = incident.status === 'Active' ? 'Resolved' : 'Active';
      await emergencyAPI.updateEmergencyStatus(incident.id, newStatus);
      toast.success(`Marked as ${newStatus}`);

      setIncidents(prev => {
        const updated = prev.map(i =>
          i.id === incident.id
            ? { ...i, status: newStatus }
            : i
        );
        try {
          sessionStorage.setItem(`besafe_incidents_cache_${role || 'user'}_${selectedChild || 'all'}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (selectedIncident?.id === incident.id) {
        setSelectedIncident(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update incident status');
    }
  };

  const handleEditSave = async () => {
    if (!editIncident) return;

    try {
      const formData = new FormData();
      formData.append('title', editIncident.title);
      formData.append('description', editIncident.description);
      formData.append('location', editIncident.location || '');

      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      await emergencyAPI.updateEmergency(editIncident.id, formData);
      toast.success('Incident updated successfully');

      await fetchIncidents(true);
      setEditIncident(null);
      setSelectedFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save changes');
    }
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <DashboardSidebar />

      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          >
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-primary" /> Incident Reports
              </h1>
              <p className="text-muted-foreground text-sm">
                Track, report, and manage safety incidents
              </p>
            </div>

            {/* Actions & Refresh */}
            <div className="flex items-center gap-2.5">
              {isRefreshing && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-medium animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing...</span>
                </div>
              )}
              <button
                onClick={() => fetchIncidents(true)}
                disabled={isRefreshing}
                title="Refresh Reports"
                className="p-2.5 bg-card border border-border rounded-xl text-foreground hover:bg-secondary transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              </button>

              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md hover:scale-105 active:scale-95 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Incident Report
              </button>
            </div>
          </motion.div>

          {/* Search Bar & Status Filter Tabs */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search incidents by title, description, location..."
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

            {/* Status Filter Tabs */}
            <div className="flex gap-1 p-1 bg-card border border-border rounded-xl text-xs font-medium shadow-sm">
              {(['All', 'Active', 'Resolved'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    statusFilter === tab
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
                  My Incidents
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
                    Showing incidents for: <span className="font-bold underline">
                      {children.find(c => c.id === selectedChild)?.name}
                    </span>
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Search Result Count */}
          {searchQuery && (
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>Found {filteredIncidents.length} matching {filteredIncidents.length === 1 ? 'incident' : 'incidents'} for "{searchQuery}"</span>
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
            <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-card rounded-2xl shadow-depth border border-border p-5 space-y-3 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-5 bg-muted/60 rounded w-1/3" />
                    <div className="h-5 bg-muted/60 rounded-full w-16" />
                  </div>
                  <div className="h-3 bg-muted/40 rounded w-3/4" />
                  <div className="h-3 bg-muted/30 rounded w-1/2" />
                  <div className="h-36 bg-muted/50 rounded-xl mt-2" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredIncidents.length === 0 && (
            <div className="bg-card rounded-2xl shadow-depth border border-border p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-foreground text-lg">No Incidents Found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? `No incident reports match "${searchQuery}".`
                  : statusFilter !== 'All'
                    ? `No incidents currently marked as "${statusFilter}".`
                    : 'Click "Add Incident Report" above to file a new incident.'}
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

          {/* Incident Cards List */}
          {!loading && filteredIncidents.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
              {filteredIncidents.map((inc, i) => (
                <motion.div
                  key={inc.id || i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  onClick={() => setSelectedIncident(inc)}
                  className="bg-card rounded-2xl shadow-depth border border-border p-5 space-y-3 hover:shadow-depth-hover hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-base text-foreground leading-snug">{inc.title}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStatus(inc);
                        }}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1 shrink-0 transition-colors ${
                          inc.status === 'Active'
                            ? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                        }`}
                      >
                        {inc.status === 'Active'
                          ? <AlertCircle className="w-3.5 h-3.5" />
                          : <CheckCircle className="w-3.5 h-3.5" />}
                        {inc.status}
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{inc.description}</p>

                    {inc.childName && (
                      <p className="text-xs text-primary font-medium">
                        Reported by: {inc.childName}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(inc.timestamp)}
                      </span>

                      {inc.location && (
                        <a
                          href={
                            inc.latitude && inc.longitude
                              ? `https://www.google.com/maps?q=${inc.latitude},${inc.longitude}`
                              : undefined
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:underline text-primary truncate max-w-[200px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{inc.location}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Attached Media Wrapped Cleanly under a Title Tag */}
                  {inc.image && (
                    <div className="mt-2 pt-2.5 border-t border-border/60">
                      <div className="flex items-center justify-between gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Image Evidence</span>
                        </div>
                        <span className="text-[11px] font-normal text-muted-foreground">Click to enlarge</span>
                      </div>

                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewMedia({ type: 'image', url: inc.image!, title: inc.title });
                        }}
                        className="relative rounded-xl overflow-hidden border border-border bg-secondary/30 h-44 w-full group cursor-pointer"
                      >
                        <img 
                          src={getCompressedImageUrl(inc.image)} 
                          alt={inc.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                          <Eye className="w-4 h-4" /> View Full Image
                        </div>
                      </div>
                    </div>
                  )}

                  {inc.audioRecording && (
                    <div className="mt-2 pt-2.5 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5">
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Audio Recording</span>
                      </div>
                      <audio 
                        controls 
                        preload="metadata" 
                        src={getFullUrl(inc.audioRecording)} 
                        className="w-full h-8"
                      />
                    </div>
                  )}

                  {inc.mediaName && !inc.image && !inc.audioRecording && (
                    <div className="mt-2 pt-2.5 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Attached Document</span>
                        </div>
                        <a 
                          href={getFullUrl(inc.mediaName)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> View File
                        </a>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Create Incident Modal */}
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-primary" /> Report an Incident
                  </h2>
                  <button 
                    onClick={() => setShowForm(false)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Title</label>
                    <input
                      placeholder="e.g., Suspicious activity near park"
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
                    <textarea
                      placeholder="Describe what happened in detail..."
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Location</label>
                    <div className="relative">
                      <input
                        placeholder="Enter location or use GPS..."
                        value={form.location}
                        onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                      />
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        title="Get current GPS location"
                        className="absolute right-2.5 top-2.5 p-1 text-primary hover:text-primary/80"
                      >
                        <Navigation className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Attach Photo Evidence</label>
                    <div className="border border-dashed border-border rounded-xl p-3 text-center bg-secondary/20 hover:bg-secondary/40 transition-colors">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                      />
                      {selectedFile && (
                        <p className="text-xs text-primary font-medium mt-1.5 truncate">
                          Selected: {selectedFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 bg-secondary rounded-xl text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="px-5 py-2.5 gradient-primary text-primary-foreground rounded-xl text-xs font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Selected Incident Details & Edit Modal */}
        <AnimatePresence>
          {selectedIncident && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-start border-b border-border pb-3">
                  <div>
                    <h2 className="font-bold text-lg text-foreground">{selectedIncident.title}</h2>
                    <p className="text-xs text-muted-foreground">{formatDate(selectedIncident.timestamp)}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedIncident(null)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Description</span>
                    <p className="text-foreground mt-0.5 whitespace-pre-wrap">{selectedIncident.description}</p>
                  </div>

                  {selectedIncident.location && (
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Location</span>
                      <p className="text-foreground mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        {selectedIncident.location}
                      </p>
                    </div>
                  )}

                  {/* Attached Media in Details */}
                  {selectedIncident.image && (
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1.5 mb-1.5">
                        <ImageIcon className="w-4 h-4" /> Image Evidence
                      </span>
                      <div className="rounded-2xl overflow-hidden border border-border max-h-60 bg-black/5">
                        <img 
                          src={getFullUrl(selectedIncident.image)} 
                          alt={selectedIncident.title}
                          className="w-full max-h-60 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {selectedIncident.audioRecording && (
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1.5 mb-1.5">
                        <Volume2 className="w-4 h-4" /> Audio Evidence
                      </span>
                      <audio controls src={getFullUrl(selectedIncident.audioRecording)} className="w-full" />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => toggleStatus(selectedIncident)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                      selectedIncident.status === 'Active'
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-destructive text-white hover:bg-destructive/90'
                    }`}
                  >
                    Mark as {selectedIncident.status === 'Active' ? 'Resolved' : 'Active'}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditIncident(selectedIncident);
                        setSelectedIncident(null);
                      }}
                      className="flex-1 py-2.5 bg-secondary rounded-xl text-xs font-semibold text-foreground hover:bg-secondary/80"
                    >
                      Edit Report
                    </button>
                    <button
                      onClick={() => setSelectedIncident(null)}
                      className="px-4 py-2.5 bg-secondary/60 rounded-xl text-xs font-semibold text-foreground hover:bg-secondary"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Report Modal */}
        <AnimatePresence>
          {editIncident && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border w-full max-w-lg p-6 rounded-3xl space-y-4 shadow-2xl"
              >
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <h2 className="font-bold text-lg text-foreground">Edit Incident Report</h2>
                  <button onClick={() => setEditIncident(null)}>
                    <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Title</label>
                    <input
                      value={editIncident.title}
                      onChange={(e) => setEditIncident({ ...editIncident, title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
                    <textarea
                      value={editIncident.description}
                      onChange={(e) => setEditIncident({ ...editIncident, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Location</label>
                    <input
                      value={editIncident.location}
                      onChange={(e) => setEditIncident({ ...editIncident, location: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Replace Photo Evidence</label>
                    <div className="border border-dashed border-border p-3 rounded-xl bg-secondary/20">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-muted-foreground file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground cursor-pointer"
                      />
                      {selectedFile && (
                        <p className="text-xs text-primary font-medium mt-1 truncate">
                          New file: {selectedFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => setEditIncident(null)}
                    className="px-4 py-2.5 bg-secondary rounded-xl text-xs font-semibold text-foreground hover:bg-secondary/80"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditSave}
                    className="px-5 py-2.5 gradient-primary text-primary-foreground rounded-xl text-xs font-semibold shadow-md hover:opacity-90"
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Media Lightbox Preview Modal */}
        <AnimatePresence>
          {previewMedia && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
              onClick={() => setPreviewMedia(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative max-w-4xl max-h-[90vh] bg-card border border-border rounded-3xl overflow-hidden shadow-2xl p-4 flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full flex justify-between items-center mb-3">
                  <h3 className="font-bold text-sm text-foreground truncate">{previewMedia.title}</h3>
                  <button 
                    onClick={() => setPreviewMedia(null)}
                    className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <img 
                  src={getFullUrl(previewMedia.url)} 
                  alt={previewMedia.title}
                  className="max-h-[70vh] max-w-full object-contain rounded-2xl"
                />

                <div className="w-full flex justify-end gap-2 mt-3 pt-3 border-t border-border">
                  <a
                    href={getFullUrl(previewMedia.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-secondary rounded-xl text-xs font-semibold text-foreground hover:bg-secondary/80 flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> Open Full Resolution
                  </a>
                  <button
                    onClick={() => setPreviewMedia(null)}
                    className="px-4 py-2 gradient-primary text-primary-foreground rounded-xl text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <BottomNav />
      </main>
    </div>
  );
}