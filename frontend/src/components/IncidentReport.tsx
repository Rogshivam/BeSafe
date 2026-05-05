import { useState, useEffect } from 'react';
import {
  Plus, X, MapPin, Clock, CheckCircle,
  AlertCircle, Upload, Image, Video, Users
} from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSidebar } from './DashboardSidebar';
import { emergencyAPI } from '@/services/api'; // use your axios layer
import { useAuth } from '@/context/AuthContext';

interface Incident {
  id: string;
  title: string;
  description: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  timestamp: string;
  status: 'Active' | 'Resolved';
  mediaType?: 'image' | 'video';
  mediaName?: string;
  childName?: string;
}

export default function IncidentReport() {
  const { role } = useAuth();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [editIncident, setEditIncident] = useState<Incident | null>(null);
  // const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);

  // Child selection state for parents
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(false);

  // Fetch incidents based on selected child or own incidents
  const fetchIncidents = async () => {
    try {
      // Fetch children if user is a parent
      if (role === 'parent') {
        setLoadingChildren(true);
        try {
          const childrenRes = await emergencyAPI.getChildren();
          setChildren(childrenRes.data?.children || []);
        } catch (err) {
          console.error('Error fetching children:', err);
        } finally {
          setLoadingChildren(false);
        }
      }

      // Fetch incidents based on selected child or own incidents
      let res;
      if (role === 'parent' && selectedChild) {
        res = await emergencyAPI.getChildIncidents(selectedChild);
      } else {
        res = await emergencyAPI.getEmergencyHistory();
      }

      const mapped = res.data.emergencies.map((e: any) => {
        // Use backend-provided data directly
        return {
          id: e._id || e.id,
          title: e.title || e.message || "Untitled Incident",
          description: e.description || "No description",
          location: e.location || "Unknown Location",
          latitude: e.latitude,
          longitude: e.longitude,
          timestamp: e.createdAt || e.updatedAt || new Date().toISOString(),
          status: (e.status === 'Resolved' ? 'Resolved' : 'Active') as 'Active' | 'Resolved',
          mediaType: e.mediaType,
          mediaName: e.mediaName,
          childName: e.childName || undefined
        };
      });
      setIncidents(mapped);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [role, selectedChild]);

  // ✅ Submit → trigger emergency API
  const handleSubmit = async () => {
    if (!form.title || !form.description) return;

    try {
      setLoading(true);

      await emergencyAPI.triggerEmergency(
        {
          triggeredBy: 'Manual',
          latitude: 28.6139,
          longitude: 77.2090,
          title: form.title,
          description: form.description,
          message: form.description,
          address: form.location,
          severity: 'Medium'
        },
        {
          image: selectedFile || undefined
        }
      );;

      await fetchIncidents();

      setForm({ title: '', description: '', location: '' });
      setSelectedFile(null);
      setShowForm(false);
    } catch (err: any) {
      console.error('Submit error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      alert(`Failed to submit report: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Add location handler
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // 🔥 Use reverse geocoding (OpenStreetMap free API)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();

          const address =
            data.display_name ||
            `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

          setForm((prev) => ({
            ...prev,
            location: address,
          }));
        } catch (err) {
          console.error(err);
          setForm((prev) => ({
            ...prev,
            location: `${latitude}, ${longitude}`,
          }));
        }
      },
      (error) => {
        console.error(error);
        alert("Location permission denied. Please enter manually.");
      }
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  // ✅ FIXED STATUS UPDATE (your API route)
  const toggleStatus = async (incident: Incident) => {
    try {
      const newStatus =
        incident.status === 'Active' ? 'Resolved' : 'Active';

      await emergencyAPI.updateEmergencyStatus(incident.id, newStatus);

      setIncidents(prev =>
        prev.map(i =>
          i.id === incident.id
            ? { ...i, status: newStatus }
            : i
        )
      );
    } catch (err) {
      console.error(err);
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

      await fetchIncidents();

      setEditIncident(null);
      setSelectedFile(null);
    } catch (err) {
      console.error(err);
    }
  };
  // console.log("selectedChildinfo" , children.map(child => child.timestamp));


  return (
    <div className="flex min-h-screen bg-secondary/30">
      <DashboardSidebar />

      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6 pl-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-bold text-foreground mb-1">Incident Reports</h1>
            <p className="text-muted-foreground text-sm">Track and report safety incidents</p>
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
                  My Incidents
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
                    Showing incidents for: <span className="font-medium">
                      {children.find(c => c.id === selectedChild)?.name}
                    </span>
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Incident List */}
        <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
          {incidents.map((inc, i) => (
            <motion.div
              key={inc.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedIncident(inc)}
              className="bg-card rounded-2xl shadow-depth p-4 space-y-2"
            >
              <div className="flex justify-between">
                <h3 className="font-semibold text-sm">{inc.title}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStatus(inc);
                  }}
                  className={`px-2 py-0.5 text-[10px] rounded-full ${inc.status === 'Active'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-green-100 text-green-600'
                    }`}>
                  {inc.status === 'Active'
                    ? <AlertCircle className="inline w-3 h-3" />
                    : <CheckCircle className="inline w-3 h-3" />}
                  {inc.status}
                </button>
              </div>

              <p className="text-xs text-muted-foreground">{inc.description}</p>

              {inc.childName && (
                <p className="text-xs text-blue-600 font-medium">
                  Child: {inc.childName}
                </p>
              )}

              <div className="flex gap-3 text-[10px] text-muted-foreground">
                <span className="flex gap-1">
                  <Clock className="w-3 h-3" />
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
                    className="flex gap-1 hover:underline text-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MapPin className="w-3 h-3" />
                    {inc.location === 'Unknown Location'
                      ? 'View on map'
                      : inc.location}
                  </a>
                )}

              </div>

              {inc.mediaName && (
                <div className="flex gap-1 text-primary text-xs">
                  {inc.mediaType === 'video'
                    ? <Video className="w-3 h-3" />
                    : <Image className="w-3 h-3" />}
                  {inc.mediaName}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* FAB */}
        <button
          onClick={() => setShowForm(true)}
          className="absolute right-4 top-10 z-30 w-11 h-11 rounded-full gradient-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus />
        </button>

        {/* Modal */}
        <AnimatePresence>
          {showForm && (
            <AnimatePresence>
              <>
                {/* Overlay */}
                <motion.div
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowForm(false)}
                />

                {/* Modal */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 30 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                  <div
                    className="w-full max-w-md bg-card rounded-2xl shadow-xl p-5 space-y-4"
                    onClick={(e) => e.stopPropagation()} // ✅ prevent close when clicking inside
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-semibold">Add Incident Report</h2>
                      <button onClick={() => setShowForm(false)}>
                        <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>

                    {/* Form */}
                    <div className="space-y-3">
                      <input
                        placeholder="Title"
                        value={form.title}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, title: e.target.value }))
                        }
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                      />

                      <textarea
                        placeholder="Description"
                        value={form.description}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, description: e.target.value }))
                        }
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                        rows={3}
                      />

                      {/* <input
              placeholder="Location"
              value={form.location}
              onChange={(e) =>
                setForm((p) => ({ ...p, location: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
            /> */}
                      <div className="relative">
                        <input
                          placeholder="Location"
                          value={form.location}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, location: e.target.value }))
                          }
                          className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                        />

                        {/* Left Icon */}
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                        {/* Right Clickable Icon */}
                        <button
                          type="button"
                          onClick={getCurrentLocation}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:scale-110"
                        >
                          📍
                        </button>
                      </div>

                      {/* File Upload */}
                      <div className="border border-dashed border-border rounded-xl p-3 text-center text-sm text-muted-foreground">
                        <input
                          type="file"
                          onChange={(e) =>
                            setSelectedFile(e.target.files?.[0] || null)
                          }
                          className="w-full"
                        />
                        {selectedFile && (
                          <p className="mt-1 text-xs text-primary">
                            {selectedFile.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowForm(false)}
                        className="flex-1 py-3 rounded-xl border border-border text-sm"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-3 rounded-xl gradient-primary text-white text-sm hover:opacity-90"
                      >
                        {loading ? 'Submitting...' : 'Submit'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            </AnimatePresence>
          )}

        </AnimatePresence>
        <AnimatePresence>
          {editIncident && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/40 z-40"
                onClick={() => setEditIncident(null)}
              />

              <motion.div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-card w-full max-w-md p-5 rounded-2xl space-y-3">

                  <div className="flex justify-between">
                    <h2 className="font-bold">Edit Report</h2>
                    <button onClick={() => setEditIncident(null)}>
                      <X />
                    </button>
                  </div>

                  <input
                    value={editIncident.title}
                    onChange={(e) =>
                      setEditIncident({
                        ...editIncident,
                        title: e.target.value
                      })
                    }
                    className="w-full p-2 border rounded"
                  />

                  <textarea
                    value={editIncident.description}
                    onChange={(e) =>
                      setEditIncident({
                        ...editIncident,
                        description: e.target.value
                      })
                    }
                    className="w-full p-2 border rounded"
                  />
                  <textarea
                    value={editIncident.location}
                    onChange={(e) =>
                      setEditIncident({
                        ...editIncident,
                        location: e.target.value
                      })
                    }
                    className="w-full p-2 border rounded"
                  />
                  {/* <textarea
                    value={editIncident.mediaName}
                    onChange={(e) =>
                      setEditIncident({
                        ...editIncident,
                        file: e.target.value
                      })
                    }
                    className="w-full p-2 border rounded"
                  /> */}
                  {/* <div className="border border-dashed border-border rounded-xl p-3 text-center text-sm text-muted-foreground">
                        <input
                          type="file"
                          onChange={(e) =>
                            setSelectedFile(e.target.files?.[0] || null)
                          }
                          className="w-full"
                        />
                        {selectedFile && (
                          <p className="mt-1 text-xs text-primary">
                            {selectedFile.name}
                          </p>
                        )}
                      </div> */}
                  <div className="border border-dashed p-3 rounded-xl">
                    <input
                      type="file"
                      onChange={(e) =>
                        setSelectedFile(e.target.files?.[0] || null)
                      }
                    />

                    {selectedFile && (
                      <p className="text-xs text-primary mt-1">
                        {selectedFile.name}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleEditSave}
                    className="w-full py-2 bg-primary text-white rounded-xl"
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {selectedIncident && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/40 z-40"
                onClick={() => setSelectedIncident(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />

              <motion.div
                className="fixed inset-0 flex items-center justify-center z-50 p-4"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="bg-card w-full max-w-md p-5 rounded-2xl space-y-3">
                  {/* ✅ CLOSE BUTTON (FIXED) */}
                  <div className="flex justify-between">
                    <h2 className="font-bold">Edit Incident</h2>
                    <button onClick={() => setSelectedIncident(null)}>
                      <X />
                    </button>
                  </div>


                  <h2 className="text-lg font-bold">
                    {selectedIncident.title}
                  </h2>

                  <p className="text-sm">
                    {selectedIncident.description}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {selectedIncident.location}
                  </p>

                  {/* STATUS TOGGLE */}
                  <button
                    onClick={() => toggleStatus(selectedIncident)}
                    className="w-full py-2 bg-primary text-white rounded-xl"
                  >
                    Mark as {selectedIncident.status === 'Active' ? 'Resolved' : 'Active'}
                  </button>

                  {/* EDIT BUTTON */}
                  <button
                    onClick={() => {
                      setEditIncident(selectedIncident);
                      setSelectedIncident(null); // close first modal
                    }}
                    className="w-full py-2 border rounded-xl"
                  >
                    Edit
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