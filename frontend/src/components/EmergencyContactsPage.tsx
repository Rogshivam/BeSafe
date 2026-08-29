import { useEffect, useMemo, useState, useRef } from "react";
import {
  Phone,
  UserPlus,
  AlertTriangle,
  Send,
  X,
  Search,
  Trash2,
  Pencil,
  MessageCircle,
  Check,
  CheckCheck,
  MoreVertical,
  User,
  Users,
  Shield,
  ShieldAlert,
  HeartPulse,
  Flame,
  Lock,
  LifeBuoy,
  Car,
  Copy,
  PhoneCall,
  Sparkles,
  Building2,
  Radio,
  ExternalLink
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardSidebar } from "./DashboardSidebar";
import { communicationAPI, chatRequestAPI } from "@/services/api";
import { toast } from "sonner";

interface SearchUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  userType?: string;
  age?: number;
  profileImage?: string;
}

interface EmergencyContact {
  _id: string;
  memberId: {
    _id: string;
    name: string;
    phone: string;
    email: string;
    profileImage?: string;
    userType?: string;
  };
  relation: "Parent" | "Friend" | "Guardian" | "Spouse" | "Sibling" | "Other";
  priority: "High" | "Medium" | "Low";
  createdAt?: string;
}

interface PublicEmergencyService {
  id: string;
  name: string;
  category: 'Police & Crime' | 'Medical' | 'Fire & Rescue' | 'Women & Child' | 'Cyber & Theft' | 'Disaster & Safety';
  number: string;
  description: string;
  icon: any;
  color: string;
  badge: string;
}

const PUBLIC_EMERGENCY_SERVICES: PublicEmergencyService[] = [
  {
    id: 'national-emergency',
    name: 'National Emergency Helpline (All-in-One)',
    category: 'Police & Crime',
    number: '112',
    description: 'Unified single emergency response for Police, Fire, Medical, and Disaster distress.',
    icon: ShieldAlert,
    color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    badge: 'Unified 24/7'
  },
  {
    id: 'police',
    name: 'Police Control Room & Thief Report',
    category: 'Police & Crime',
    number: '100',
    description: 'Immediate police squad dispatch, theft reporting, robbery, violence, and criminal incidents.',
    icon: Shield,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    badge: 'Police & Crime'
  },
  {
    id: 'ambulance',
    name: 'Ambulance & Medical Emergency',
    category: 'Medical',
    number: '108',
    description: 'Critical healthcare trauma, cardiac emergency, acute illness, and rapid ambulance dispatch.',
    icon: HeartPulse,
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    badge: 'Medical EMT'
  },
  {
    id: 'fire',
    name: 'Fire & Rescue Brigade',
    category: 'Fire & Rescue',
    number: '101',
    description: 'Fire breakouts, building rescue, gas leaks, electrical fires, and hazard containment.',
    icon: Flame,
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    badge: 'Fire Brigade'
  },
  {
    id: 'cyber-crime',
    name: 'Cyber Crime & Financial Theft Helpline',
    category: 'Cyber & Theft',
    number: '1930',
    description: 'National portal for reporting online theft, bank fraud, account hacking, and digital extortion.',
    icon: Lock,
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    badge: 'Cyber Fraud'
  },
  {
    id: 'women-helpline',
    name: 'Women Distress & Safety Helpline',
    category: 'Women & Child',
    number: '1091',
    description: '24/7 rapid emergency assistance for women in distress, harassment, stalking, or domestic abuse.',
    icon: Users,
    color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
    badge: 'Women Safety'
  },
  {
    id: 'child-helpline',
    name: 'Child Protection & Safety Helpline',
    category: 'Women & Child',
    number: '1098',
    description: 'Child distress response, missing children, physical violence, and emergency care.',
    icon: LifeBuoy,
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    badge: 'Child Care'
  },
  {
    id: 'disaster-ndrf',
    name: 'Disaster Management & Relief (NDRF)',
    category: 'Disaster & Safety',
    number: '1078',
    description: 'National Disaster Response Force for floods, earthquakes, building collapse, and storms.',
    icon: AlertTriangle,
    color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    badge: 'NDRF Relief'
  },
  {
    id: 'road-accident',
    name: 'Road Accident & Highway Emergency',
    category: 'Medical',
    number: '1073',
    description: 'Highway rescue, road accident trauma response, and emergency vehicle assistance.',
    icon: Car,
    color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    badge: 'Highway Patrol'
  }
];

const relationColors: Record<string, string> = {
  Parent: "bg-primary/10 text-primary border border-primary/20",
  Guardian: "bg-[hsl(var(--safe))]/10 text-[hsl(var(--safe))] border border-[hsl(var(--safe))]/20",
  Friend: "bg-accent/10 text-accent border border-accent/20",
  Spouse: "bg-pink-500/10 text-pink-500 border border-pink-500/20",
  Sibling: "bg-orange-500/10 text-orange-500 border border-orange-500/20",
  Other: "bg-muted text-muted-foreground",
};

export default function EmergencyContactsPage() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alertSent, setAlertSent] = useState(false);

  // Search & Filter State
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'public'>('all');

  // Add Contact Modal State
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [adding, setAdding] = useState(false);

  const [newContact, setNewContact] = useState({
    relation: "Friend",
    priority: "High",
  });

  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    relation: "Friend",
    priority: "High",
  });

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [selectedChatContact, setSelectedChatContact] = useState<EmergencyContact | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chat request state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequestContact, setSelectedRequestContact] = useState<EmergencyContact | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [canChatMap, setCanChatMap] = useState<{ [key: string]: boolean }>({});
  const [loadingChatCheck, setLoadingChatCheck] = useState<{ [key: string]: boolean }>({});
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${apiUrl}/users/emergency-contacts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load contacts");

      setContacts(data.data.emergencyContacts || []);

      // Check chat status for each contact
      if (data.data.emergencyContacts) {
        data.data.emergencyContacts.forEach((contact: EmergencyContact) => {
          checkChatPermission(contact.memberId._id, contact._id);
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await chatRequestAPI.getPendingRequests();
      setPendingRequests(res.data?.requests || []);
    } catch (err: any) {
      console.error("Failed to fetch pending requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchPendingRequests();
  }, []);

  // Filtered Personal Contacts based on search query
  const filteredPersonalContacts = useMemo(() => {
    const q = contactSearchQuery.toLowerCase().trim();
    if (!q) return contacts;

    return contacts.filter((c) => {
      const nameMatch = (c.memberId?.name || '').toLowerCase().includes(q);
      const phoneMatch = (c.memberId?.phone || '').toLowerCase().includes(q);
      const relationMatch = (c.relation || '').toLowerCase().includes(q);
      const priorityMatch = (c.priority || '').toLowerCase().includes(q);
      return nameMatch || phoneMatch || relationMatch || priorityMatch;
    });
  }, [contacts, contactSearchQuery]);

  // Filtered Public Emergency Services based on search query
  const filteredPublicServices = useMemo(() => {
    const q = contactSearchQuery.toLowerCase().trim();
    if (!q) return PUBLIC_EMERGENCY_SERVICES;

    return PUBLIC_EMERGENCY_SERVICES.filter((service) => {
      const nameMatch = service.name.toLowerCase().includes(q);
      const numberMatch = service.number.toLowerCase().includes(q);
      const catMatch = service.category.toLowerCase().includes(q);
      const descMatch = service.description.toLowerCase().includes(q);
      const badgeMatch = service.badge.toLowerCase().includes(q);
      return nameMatch || numberMatch || catMatch || descMatch || badgeMatch;
    });
  }, [contactSearchQuery]);

  // Copy phone number helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} (${text}) to clipboard`);
  };

  const checkChatPermission = async (memberId: string, contactId: string) => {
    try {
      setLoadingChatCheck(prev => ({ ...prev, [contactId]: true }));
      const res = await chatRequestAPI.canChatWithUser(memberId);
      setCanChatMap(prev => ({ ...prev, [contactId]: res.data?.canChat || false }));
    } catch (err) {
      console.error("Failed to check chat permission:", err);
      setCanChatMap(prev => ({ ...prev, [contactId]: false }));
    } finally {
      setLoadingChatCheck(prev => ({ ...prev, [contactId]: false }));
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const res = await fetch(
        `${apiUrl}/users/search?query=${encodeURIComponent(searchQuery)}`,
        { headers: authHeaders }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to search users");
      setSearchResults(data.data.users || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const addContact = async () => {
    if (!selectedUser) return;

    try {
      setAdding(true);
      const res = await fetch(`${apiUrl}/users/emergency-contacts`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          memberId: selectedUser._id,
          relation: newContact.relation,
          priority: newContact.priority,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add contact");

      toast.success("Emergency contact added successfully");
      setShowAdd(false);
      setSelectedUser(null);
      setSearchQuery("");
      setSearchResults([]);
      setNewContact({ relation: "Friend", priority: "High" });
      fetchContacts();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to add contact");
    } finally {
      setAdding(false);
    }
  };

  const deleteContact = async (contactId: string) => {
    if (!confirm("Are you sure you want to remove this emergency contact?")) return;

    try {
      const res = await fetch(`${apiUrl}/users/emergency-contacts/${contactId}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete contact");

      toast.success("Contact removed");
      setContacts((prev) => prev.filter((c) => c._id !== contactId));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete contact");
    }
  };

  const startEdit = (contact: EmergencyContact) => {
    setEditingContactId(contact._id);
    setEditForm({
      relation: contact.relation,
      priority: contact.priority,
    });
  };

  const updateContact = async (contactId: string) => {
    try {
      const res = await fetch(`${apiUrl}/users/emergency-contacts/${contactId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update contact");

      toast.success("Contact updated");
      setEditingContactId(null);
      fetchContacts();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update contact");
    }
  };

  const sendAlert = (phone?: string, name?: string) => {
    if (!phone) {
      toast.error("No phone number available");
      return;
    }
    const message = encodeURIComponent(
      `🚨 EMERGENCY ALERT: I need immediate assistance! Please check on me.`
    );
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${message}`, "_blank");
    toast.success(`Emergency alert sent to ${name || phone}`);
  };

  const sendBulkAlert = () => {
    if (!contacts.length) return;
    contacts.forEach((c) => {
      if (c.memberId?.phone) {
        const message = encodeURIComponent(
          `🚨 EMERGENCY ALERT: I need immediate assistance! Please check on me.`
        );
        window.open(
          `https://wa.me/${c.memberId.phone.replace(/[^0-9]/g, "")}?text=${message}`,
          "_blank"
        );
      }
    });
    setAlertSent(true);
    toast.success("Emergency alerts triggered for all contacts");
    setTimeout(() => setAlertSent(false), 4000);
  };

  const callContact = (phone?: string) => {
    if (!phone) {
      toast.error("No phone number available");
      return;
    }
    window.open(`tel:${phone}`, "_self");
  };

  const closeAddModal = () => {
    setShowAdd(false);
    setSelectedUser(null);
    setSearchQuery("");
    setSearchResults([]);
    setNewContact({ relation: "Friend", priority: "High" });
  };

  // Chat Request Handlers
  const openRequestModal = (contact: EmergencyContact) => {
    setSelectedRequestContact(contact);
    setRequestMessage(`Hi ${contact.memberId?.name}, I'd like to connect on BeSafe chat.`);
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedRequestContact(null);
    setRequestMessage("");
  };

  const sendChatRequest = async () => {
    if (!selectedRequestContact) return;

    try {
      await chatRequestAPI.sendRequest(selectedRequestContact.memberId._id, requestMessage);
      toast.success("Chat request sent successfully");
      closeRequestModal();
    } catch (err: any) {
      console.error("Failed to send chat request:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to send chat request");
    }
  };

  const acceptRequest = async (requestId: string, senderId: string) => {
    try {
      await chatRequestAPI.respondToRequest(requestId, "Accepted");
      toast.success("Chat request accepted");
      fetchPendingRequests();

      const matchingContact = contacts.find(c => c.memberId._id === senderId);
      if (matchingContact) {
        setCanChatMap(prev => ({ ...prev, [matchingContact._id]: true }));
      }
    } catch (err: any) {
      console.error("Failed to accept request:", err);
      toast.error(err.response?.data?.message || "Failed to accept chat request");
    }
  };

  const declineRequest = async (requestId: string) => {
    try {
      await chatRequestAPI.respondToRequest(requestId, "Declined");
      toast.success("Chat request declined");
      fetchPendingRequests();
    } catch (err: any) {
      console.error("Failed to decline request:", err);
      toast.error(err.response?.data?.message || "Failed to decline chat request");
    }
  };

  // Chat Window Handlers
  const openChat = async (contact: EmergencyContact) => {
    setSelectedChatContact(contact);
    setShowChat(true);
    setChatMessage("");
    await fetchChatHistory(contact.memberId._id);

    if (refreshInterval) clearInterval(refreshInterval);
    const interval = setInterval(() => {
      fetchChatHistory(contact.memberId._id, false);
    }, 4000);
    setRefreshInterval(interval);
  };

  const closeChat = () => {
    setShowChat(false);
    setSelectedChatContact(null);
    setChatMessage("");
    setChatHistory([]);
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  const fetchChatHistory = async (memberId: string, showLoading = true) => {
    try {
      if (showLoading) setLoadingMessages(true);
      const res = await communicationAPI.getMessages(memberId);
      setChatHistory(res.data?.messages || []);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedChatContact || !chatMessage.trim()) return;

    const tempMessage = chatMessage;
    setChatMessage("");

    try {
      const response = await communicationAPI.sendMessage(selectedChatContact.memberId._id, tempMessage);
      setChatHistory(prev => [...prev, response.data.message]);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      setChatMessage(tempMessage);
      toast.error('Failed to send message');
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
                <Users className="w-6 h-6 text-primary" /> Emergency Contacts & Helplines
              </h1>
              <p className="text-muted-foreground text-sm">
                Quick access to your personal safety circle and verified public emergency services
              </p>
            </div>

            {/* Add Contact Button */}
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md hover:scale-105 active:scale-95 transition-all shrink-0"
            >
              <UserPlus className="w-4 h-4" /> Add Personal Contact
            </button>
          </motion.div>

          {/* Search Bar & View Tabs */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Real-time Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search contacts, police, ambulance, fire, theft..."
                value={contactSearchQuery}
                onChange={(e) => setContactSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 outline-none shadow-sm transition-all"
              />
              {contactSearchQuery && (
                <button
                  onClick={() => setContactSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Filter Tabs */}
            <div className="flex gap-1 p-1 bg-card border border-border rounded-xl text-xs font-medium shadow-sm overflow-x-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${activeTab === 'all'
                  ? 'gradient-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  }`}
              >
                All ({filteredPersonalContacts.length + filteredPublicServices.length})
              </button>
              <button
                onClick={() => setActiveTab('personal')}
                className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${activeTab === 'personal'
                  ? 'gradient-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  }`}
              >
                Personal Contacts ({filteredPersonalContacts.length})
              </button>
              <button
                onClick={() => setActiveTab('public')}
                className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${activeTab === 'public'
                  ? 'gradient-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  }`}
              >
                Public Helplines ({filteredPublicServices.length})
              </button>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-6xl mx-auto space-y-8 pt-5">

          {/* SECTION 1: PERSONAL EMERGENCY CONTACTS */}
          {(activeTab === 'all' || activeTab === 'personal') && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-base text-foreground">
                    Personal Emergency Network
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  {filteredPersonalContacts.length} personal contacts
                </span>
              </div>

              {/* Bulk Alert Banner */}
              <div className="max-w-xl mx-auto space-y-3">
                <button
                  onClick={sendBulkAlert}
                  disabled={!contacts.length}
                  className="w-full py-3 gradient-emergency text-destructive-foreground rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-depth disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Send Alert to All Personal Contacts
                </button>

                {alertSent && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-[hsl(var(--safe))]/10 text-[hsl(var(--safe))] text-sm font-medium text-center rounded-xl"
                  >
                    ✅ Emergency alert opened for all contacts
                  </motion.div>
                )}

                {/* Pending Chat Requests Section */}
                {pendingRequests.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl shadow-depth p-4 border border-border"
                  >
                    <h3 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm">
                      <UserPlus className="w-4 h-4 text-primary" />
                      Incoming Chat Requests ({pendingRequests.length})
                    </h3>
                    <div className="space-y-2.5">
                      {pendingRequests.map((request) => (
                        <div
                          key={request._id}
                          className="flex items-center justify-between gap-3 p-3 bg-secondary/30 rounded-xl"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                              {request.senderId?.name?.[0] || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">
                                {request.senderId?.name}
                              </p>
                              {request.message && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {request.message}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => acceptRequest(request._id, request.senderId._id)}
                              className="px-3 py-1.5 rounded-lg bg-[hsl(var(--safe))]/10 text-[hsl(var(--safe))] hover:bg-[hsl(var(--safe))]/20 transition-colors text-xs font-semibold"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => declineRequest(request._id)}
                              className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-semibold"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm font-medium text-center rounded-xl">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="bg-card rounded-2xl shadow-depth p-8 text-center text-sm text-muted-foreground animate-pulse">
                    Loading personal contacts...
                  </div>
                ) : filteredPersonalContacts.length === 0 ? (
                  <div className="bg-card rounded-2xl shadow-depth border border-border p-8 text-center space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {contactSearchQuery
                        ? `No personal contacts match "${contactSearchQuery}".`
                        : "No personal emergency contacts added yet."}
                    </p>
                    <button
                      onClick={() => setShowAdd(true)}
                      className="px-4 py-2 gradient-primary text-primary-foreground rounded-xl text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 mt-2"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add Your First Contact
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPersonalContacts.map((contact, i) => (
                      <motion.div
                        key={contact._id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="bg-card rounded-2xl shadow-depth border border-border p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                              {contact.memberId?.name?.[0] || "?"}
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">
                                {contact.memberId?.name}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {contact.memberId?.phone}
                              </p>

                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${relationColors[contact.relation] || "bg-muted text-muted-foreground"
                                    }`}
                                >
                                  {contact.relation}
                                </span>

                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-foreground">
                                  {contact.priority} Priority
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => callContact(contact.memberId?.phone)}
                              className="w-9 h-9 rounded-xl bg-[hsl(var(--safe))]/10 text-[hsl(var(--safe))] flex items-center justify-center hover:bg-[hsl(var(--safe))]/20 transition-colors"
                              title="Call"
                            >
                              <Phone className="w-4 h-4" />
                            </button>

                            {loadingChatCheck[contact._id] ? (
                              <div className="w-9 h-9 rounded-xl bg-muted/10 text-muted flex items-center justify-center">
                                <div className="w-4 h-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : canChatMap[contact._id] ? (
                              <button
                                onClick={() => openChat(contact)}
                                className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center hover:bg-accent/20 transition-colors"
                                title="Chat"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => openRequestModal(contact)}
                                className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                                title="Request Chat"
                              >
                                <UserPlus className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => sendAlert(contact.memberId?.phone, contact.memberId?.name)}
                              className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                              title="Send WhatsApp Alert"
                            >
                              <Send className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => startEdit(contact)}
                              className="w-9 h-9 rounded-xl bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors"
                              title="Edit Contact"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => deleteContact(contact._id)}
                              className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                              title="Delete Contact"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Edit Inline Form */}
                        {editingContactId === contact._id && (
                          <div className="mt-4 pt-4 border-t border-border space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Relation</label>
                                <select
                                  value={editForm.relation}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      relation: e.target.value as any,
                                    }))
                                  }
                                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground"
                                >
                                  <option value="Parent">Parent</option>
                                  <option value="Guardian">Guardian</option>
                                  <option value="Friend">Friend</option>
                                  <option value="Spouse">Spouse</option>
                                  <option value="Sibling">Sibling</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Priority</label>
                                <select
                                  value={editForm.priority}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      priority: e.target.value as any,
                                    }))
                                  }
                                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground"
                                >
                                  <option value="High">High</option>
                                  <option value="Medium">Medium</option>
                                  <option value="Low">Low</option>
                                </select>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => updateContact(contact._id)}
                                className="flex-1 py-2 gradient-primary text-primary-foreground rounded-xl font-bold text-xs hover:opacity-90"
                              >
                                Save Changes
                              </button>

                              <button
                                onClick={() => setEditingContactId(null)}
                                className="flex-1 py-2 bg-secondary text-foreground rounded-xl font-bold text-xs hover:bg-secondary/80"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* SECTION 2: PUBLIC EMERGENCY SERVICES & HELPLINES */}
          {(activeTab === 'all' || activeTab === 'public') && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-base text-foreground">
                    Public Emergency Helplines & Authorities
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  {filteredPublicServices.length} helplines available
                </span>
              </div>

              {filteredPublicServices.length === 0 ? (
                <div className="bg-card rounded-2xl border border-border p-6 text-center text-xs text-muted-foreground">
                  No public emergency services match "{contactSearchQuery}".
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPublicServices.map((service) => {
                    const Icon = service.icon;
                    return (
                      <div
                        key={service.id}
                        className="bg-card rounded-2xl shadow-depth border border-border p-4 flex flex-col justify-between hover:shadow-depth-hover hover:-translate-y-0.5 transition-all space-y-3"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className={`p-2.5 rounded-xl border ${service.color} flex items-center justify-center shrink-0`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${service.color}`}>
                              {service.badge}
                            </span>
                          </div>

                          <h3 className="font-bold text-sm text-foreground leading-snug">
                            {service.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-base font-black font-mono text-primary tracking-wide">
                              {service.number}
                            </span>
                            <button
                              onClick={() => copyToClipboard(service.number, service.name)}
                              title="Copy Number"
                              className="p-1 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                            {service.description}
                          </p>
                        </div>

                        {/* Call Action Button */}
                        <div className="pt-2 border-t border-border/50 flex gap-2">
                          <button
                            onClick={() => callContact(service.number)}
                            className="flex-1 py-2 gradient-emergency text-destructive-foreground rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                          >
                            <PhoneCall className="w-3.5 h-3.5" /> Call {service.number}
                          </button>
                          <button
                            onClick={() => copyToClipboard(service.number, service.name)}
                            className="px-3 py-2 bg-secondary rounded-xl text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                            title="Copy Number"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}


        </div>

        {/* Add Contact Modal */}
        {showAdd && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={closeAddModal}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="max-w-lg mx-auto w-full flex flex-col h-full space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" /> Add Emergency Contact
                    </h2>
                    <button
                      onClick={closeAddModal}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                      placeholder="Search member by name, phone, or email"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={searchUsers}
                      className="px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>

                  {searching && (
                    <p className="text-xs text-muted-foreground animate-pulse">Searching users...</p>
                  )}

                  {searchResults.length > 0 && (
                    <div className="max-h-52 overflow-auto space-y-2">
                      {searchResults.map((user) => (
                        <button
                          key={user._id}
                          onClick={() => setSelectedUser(user)}
                          className={`w-full text-left p-3 rounded-xl border transition ${selectedUser?._id === user._id
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border bg-background hover:bg-secondary/40"
                            }`}
                        >
                          <p className="font-semibold text-sm text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{user.phone}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                          {user.userType && (
                            <span className="text-[10px] mt-1 inline-block px-2 py-0.5 rounded bg-secondary text-foreground uppercase font-semibold">
                              {user.userType}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedUser && (
                    <div className="p-3 rounded-xl border border-primary/30 bg-primary/5">
                      <p className="text-xs font-semibold text-foreground">
                        Selected: <span className="text-primary">{selectedUser.name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{selectedUser.phone}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Relationship</label>
                      <select
                        value={newContact.relation}
                        onChange={(e) =>
                          setNewContact((prev) => ({
                            ...prev,
                            relation: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="Parent">Parent</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Friend">Friend</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Priority</label>
                      <select
                        value={newContact.priority}
                        onChange={(e) =>
                          setNewContact((prev) => ({
                            ...prev,
                            priority: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 pb-16">
                    <button
                      onClick={addContact}
                      disabled={adding || !selectedUser}
                      className="w-full py-3 gradient-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                      {adding ? "Adding..." : "Add to Emergency Network"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Send Request Modal */}
        {showRequestModal && selectedRequestContact && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={closeRequestModal}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h2 className="text-base font-bold text-foreground">Send Chat Request</h2>
                  <button
                    onClick={closeRequestModal}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {selectedRequestContact.memberId?.name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{selectedRequestContact.memberId?.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedRequestContact.relation}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Message (optional)
                  </label>
                  <textarea
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Add a message to your request..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={closeRequestModal}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-foreground font-semibold text-xs hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendChatRequest}
                    className="flex-1 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity"
                  >
                    Send Request
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Live Chat Drawer */}
        {showChat && selectedChatContact && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={closeChat}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col pb-20 border-t border-border"
            >
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div className="max-w-lg mx-auto w-full flex flex-col h-full space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {selectedChatContact.memberId?.name?.[0] || "?"}
                      </div>
                      <div>
                        <h2 className="font-bold text-base text-foreground">{selectedChatContact.memberId?.name}</h2>
                        <p className="text-xs text-muted-foreground">{selectedChatContact.relation}</p>
                      </div>
                    </div>
                    <button
                      onClick={closeChat}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto space-y-2 min-h-[300px] max-h-[400px] p-3 bg-secondary/20 rounded-2xl border border-border/50">
                    {loadingMessages ? (
                      <div className="text-center text-muted-foreground text-xs py-8">
                        Loading messages...
                      </div>
                    ) : chatHistory.length === 0 ? (
                      <div className="text-center text-muted-foreground text-xs py-8">
                        No messages yet. Start the conversation!
                      </div>
                    ) : (
                      <>
                        {chatHistory.map((msg, i) => {
                          const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                          const isSent = msg.senderId._id === currentUser.id || msg.senderId === currentUser.id;
                          const messageTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                          return (
                            <div
                              key={msg._id || i}
                              className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[78%] px-3.5 py-2 rounded-2xl shadow-sm text-xs ${isSent
                                  ? 'gradient-primary text-primary-foreground rounded-br-none'
                                  : 'bg-card text-foreground border border-border rounded-bl-none'
                                  }`}
                              >
                                <p className="break-words leading-relaxed">{msg.content}</p>
                                <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                  <span>{messageTime}</span>
                                  {isSent && (
                                    <span>
                                      {msg.isRead ? (
                                        <CheckCheck className="w-3 h-3 text-white" />
                                      ) : msg.delivered ? (
                                        <CheckCheck className="w-3 h-3 opacity-70" />
                                      ) : (
                                        <Check className="w-3 h-3 opacity-70" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="flex gap-2 pt-2 items-center">
                    <input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type an emergency message..."
                      className="flex-1 px-4 py-2.5 rounded-full border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!chatMessage.trim()}
                      className="w-10 h-10 rounded-full gradient-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shrink-0 shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}

        <BottomNav />
      </main>
    </div>
  );
}
