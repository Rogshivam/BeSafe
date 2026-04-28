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
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { motion } from "framer-motion";
import { DashboardSidebar } from "./DashboardSidebar";
import { communicationAPI, chatRequestAPI } from "@/services/api";

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

const relationColors: Record<string, string> = {
  Parent: "bg-primary/10 text-primary",
  Guardian: "bg-[hsl(var(--safe))]/10 text-[hsl(var(--safe))]",
  Friend: "bg-accent/10 text-accent",
  Spouse: "bg-pink-500/10 text-pink-500",
  Sibling: "bg-orange-500/10 text-orange-500",
  Other: "bg-muted text-muted-foreground",
};

export default function EmergencyContactsPage() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alertSent, setAlertSent] = useState(false);

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

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch emergency contacts");
      }

      setContacts(data.data?.emergencyContacts || []);
    } catch (err: any) {
      setError(err.message || "Failed to load emergency contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
    
    // Cleanup interval on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  // Check chat eligibility for all contacts
  useEffect(() => {
    const checkChatEligibility = async () => {
      if (contacts.length === 0) return;
      
      const checks = contacts.map(async (contact) => {
        try {
          setLoadingChatCheck(prev => ({ ...prev, [contact._id]: true }));
          const response = await chatRequestAPI.canChat(contact.memberId._id);
          setCanChatMap(prev => ({ ...prev, [contact._id]: response.data.canChat }));
        } catch (error) {
          console.error('Error checking chat eligibility:', error);
          setCanChatMap(prev => ({ ...prev, [contact._id]: false }));
        } finally {
          setLoadingChatCheck(prev => ({ ...prev, [contact._id]: false }));
        }
      });

      await Promise.all(checks);
    };

    checkChatEligibility();
  }, [contacts]);

  // Fetch pending chat requests
  const fetchPendingRequests = async () => {
    try {
      setLoadingRequests(true);
      const response = await chatRequestAPI.getPendingRequests();
      if (response.success) {
        setPendingRequests(response.data.requests);
      }
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      setError("");

      const res = await fetch(
        `${apiUrl}/users/search?query=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to search users");
      }

      setSearchResults(data.data?.users || []);
    } catch (err: any) {
      setError(err.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const addContact = async () => {
    if (!selectedUser) {
      setError("Please select a user");
      return;
    }

    try {
      setAdding(true);
      setError("");

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

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to add contact");
      }

      setContacts(data.data?.emergencyContacts || []);
      setShowAdd(false);
      setSelectedUser(null);
      setSearchQuery("");
      setSearchResults([]);
      setNewContact({
        relation: "Friend",
        priority: "High",
      });
    } catch (err: any) {
      setError(err.message || "Could not add contact");
    } finally {
      setAdding(false);
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
      setError("");

      const res = await fetch(`${apiUrl}/users/emergency-contacts/${contactId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          relation: editForm.relation,
          priority: editForm.priority,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update contact");
      }

      setContacts(data.data?.emergencyContacts || []);
      setEditingContactId(null);
    } catch (err: any) {
      setError(err.message || "Could not update contact");
    }
  };

  const deleteContact = async (contactId: string) => {
    const confirmed = window.confirm("Remove this emergency contact?");
    if (!confirmed) return;

    try {
      setError("");

      const res = await fetch(`${apiUrl}/users/emergency-contacts/${contactId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to remove contact");
      }

      setContacts(data.data?.emergencyContacts || []);
    } catch (err: any) {
      setError(err.message || "Could not remove contact");
    }
  };

  const callContact = (phone: string) => {
    if (!phone) return;
    window.open(`tel:${phone}`, "_self");
  };

  const sendAlert = (phone: string, name?: string) => {
    if (!phone) return;
    const msg = `🚨 EMERGENCY: I need help immediately! Please respond ASAP.${name ? ` This is an alert from your contact.` : ""}`;
    window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, "_blank");
  };

  const sendBulkAlert = () => {
    if (!contacts.length) return;

    const msg = "🚨 EMERGENCY: I am in danger! Please help immediately!";

    contacts.forEach((c) => {
      const phone = c.memberId?.phone;
      if (phone) {
        window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, "_blank");
      }
    });

    setAlertSent(true);
    setTimeout(() => setAlertSent(false), 3000);
  };

  const closeAddModal = () => {
    setShowAdd(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setNewContact({
      relation: "Friend",
      priority: "High",
    });
  };

  const openChat = async (contact: EmergencyContact) => {
    setSelectedChatContact(contact);
    setShowChat(true);
    setChatHistory([]);
    
    // Load conversation from backend
    await loadConversation(contact.memberId._id);
    
    // Start auto-refresh for new messages
    if (refreshInterval) clearInterval(refreshInterval);
    const interval = setInterval(() => {
      if (selectedChatContact) {
        loadConversation(selectedChatContact.memberId._id);
      }
    }, 3000); // Refresh every 3 seconds
    setRefreshInterval(interval);
  };

  const loadConversation = async (userId: string) => {
    try {
      setLoadingMessages(true);
      const response = await communicationAPI.getConversation(userId);
      console.log('Conversation response:', response);
      if (response.success) {
        console.log('Messages loaded:', response.data.messages);
        setChatHistory(response.data.messages);
        // Scroll to bottom after messages load
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        console.error('Failed to load conversation');
        setChatHistory([]);
      }
    } catch (error: any) {
      console.error('Failed to load conversation:', error);
      if (error.response?.status === 403) {
        console.error('Access denied - users may not be emergency contacts');
      }
      setChatHistory([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const closeChat = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
    setShowChat(false);
    setSelectedChatContact(null);
    setChatMessage("");
    setChatHistory([]);
  };

  const openRequestModal = (contact: EmergencyContact) => {
    setSelectedRequestContact(contact);
    setRequestMessage("");
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
      const response = await chatRequestAPI.sendRequest(
        selectedRequestContact.memberId._id,
        requestMessage
      );

      if (response.success) {
        alert('Chat request sent successfully!');
        closeRequestModal();
        // Re-check chat eligibility
        const checkResponse = await chatRequestAPI.canChat(selectedRequestContact.memberId._id);
        setCanChatMap(prev => ({ ...prev, [selectedRequestContact._id]: checkResponse.data.canChat }));
      }
    } catch (error: any) {
      console.error('Failed to send chat request:', error);
      alert(error.response?.data?.message || 'Failed to send chat request. Please try again.');
    }
  };

  const acceptRequest = async (requestId: string, senderId: string) => {
    try {
      const response = await chatRequestAPI.acceptRequest(requestId);
      if (response.success) {
        alert('Chat request accepted! Contact added to your emergency contacts.');
        fetchPendingRequests();
        fetchContacts(); // Refresh contacts list to show new contact
      }
    } catch (error: any) {
      console.error('Failed to accept request:', error);
      alert('Failed to accept request. Please try again.');
    }
  };

  const declineRequest = async (requestId: string) => {
    try {
      const response = await chatRequestAPI.declineRequest(requestId);
      if (response.success) {
        alert('Chat request declined');
        fetchPendingRequests();
      }
    } catch (error: any) {
      console.error('Failed to decline request:', error);
      alert('Failed to decline request. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!chatMessage.trim() || !selectedChatContact) return;

    const tempMessage = chatMessage;
    setChatMessage("");

    try {
      const response = await communicationAPI.sendMessage({
        receiverId: selectedChatContact.memberId._id,
        messageType: 'Text',
        content: tempMessage,
        priority: 'Normal'
      });

      console.log('Send message response:', response);

      if (response.success) {
        // Refresh conversation to get all messages including the new one
        await loadConversation(selectedChatContact.memberId._id);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setChatMessage(tempMessage); // Restore message on error
      alert('Failed to send message. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <DashboardSidebar />

      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6 pl-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Emergency Contacts
            </h1>
            <p className="text-muted-foreground text-sm">
              Quick access to your safety network
            </p>
          </motion.div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-4 space-y-3 relative">

          {/* Top Right Add Button */}
          <button
            onClick={() => setShowAdd(true)}
            className="absolute top-[-47px] right-[-13.6rem] z-30 w-11 h-11 rounded-full gradient-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <UserPlus className="w-5 h-5" />
          </button>
          <button
            onClick={sendBulkAlert}
            disabled={!contacts.length}
            className="w-full py-3 gradient-emergency text-destructive-foreground rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-depth disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AlertTriangle className="w-4 h-4" />
            Send Alert to All Contacts
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
              className="bg-card rounded-2xl shadow-depth p-4"
            >
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                Chat Requests ({pendingRequests.length})
              </h3>
              <div className="space-y-3">
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
                        className="px-3 py-2 rounded-lg bg-[hsl(var(--safe))]/10 text-[hsl(var(--safe))] hover:bg-[hsl(var(--safe))]/20 transition-colors text-sm font-medium"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => declineRequest(request._id)}
                        className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm font-medium"
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
            <div className="bg-card rounded-2xl shadow-depth p-6 text-center text-sm text-muted-foreground">
              Loading contacts...
            </div>
          ) : contacts.length === 0 ? (
            <div className="bg-card rounded-2xl shadow-depth p-6 text-center text-sm text-muted-foreground">
              No emergency contacts added yet.
            </div>
          ) : (
            contacts.map((contact, i) => (
              <motion.div
                key={contact._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl shadow-depth p-4"
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
                      <p className="text-xs text-muted-foreground">
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
                          {contact.priority}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => callContact(contact.memberId?.phone)}
                      className="w-10 h-10 rounded-full bg-[hsl(var(--safe))]/10 text-[hsl(var(--safe))] flex items-center justify-center hover:bg-[hsl(var(--safe))]/20 transition-colors"
                      title="Call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>

                    {loadingChatCheck[contact._id] ? (
                      <div className="w-10 h-10 rounded-full bg-muted/10 text-muted flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : canChatMap[contact._id] ? (
                      <button
                        onClick={() => openChat(contact)}
                        className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center hover:bg-accent/20 transition-colors"
                        title="Chat"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => openRequestModal(contact)}
                        className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                        title="Request Chat"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() =>
                        sendAlert(contact.memberId?.phone, contact.memberId?.name)
                      }
                      className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                      title="Send Alert"
                    >
                      <Send className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => startEdit(contact)}
                      className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => deleteContact(contact._id)}
                      className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {editingContactId === contact._id && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    <select
                      value={editForm.relation}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          relation: e.target.value as any,
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground"
                    >
                      <option value="Parent">Parent</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Friend">Friend</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Other">Other</option>
                    </select>

                    <select
                      value={editForm.priority}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          priority: e.target.value as any,
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>

                    <div className="flex gap-2">
                      <button
                        onClick={() => updateContact(contact._id)}
                        className="flex-1 py-3 gradient-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90"
                      >
                        Save
                      </button>

                      <button
                        onClick={() => setEditingContactId(null)}
                        className="flex-1 py-3 bg-secondary text-foreground rounded-xl font-bold text-sm hover:opacity-90"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {showAdd && (
          <>
            <div
              className="fixed inset-0 bg-foreground/30 z-50"
              onClick={closeAddModal}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="max-w-lg mx-auto w-full flex flex-col h-full space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg text-foreground">Add Contact</h2>
                    <button
                      onClick={closeAddModal}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, email, or phone"
                      className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={searchUsers}
                      className="px-4 py-3 rounded-xl gradient-primary text-primary-foreground hover:opacity-90"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>

                  {searching && (
                    <p className="text-sm text-muted-foreground">Searching...</p>
                  )}

                  {searchResults.length > 0 && (
                    <div className="max-h-52 overflow-auto space-y-2">
                      {searchResults.map((user) => (
                        <button
                          key={user._id}
                          onClick={() => setSelectedUser(user)}
                          className={`w-full text-left p-3 rounded-xl border transition ${selectedUser?._id === user._id
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background"
                            }`}
                        >
                          <p className="font-semibold text-sm text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.phone}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                          {user.userType && (
                            <p className="text-[10px] mt-1 text-muted-foreground uppercase">
                              {user.userType}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedUser && (
                    <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                      <p className="text-sm font-semibold text-foreground">
                        Selected: {selectedUser.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{selectedUser.phone}</p>
                      <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                    </div>
                  )}

                  <select
                    value={newContact.relation}
                    onChange={(e) =>
                      setNewContact((prev) => ({
                        ...prev,
                        relation: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="Parent">Parent</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Friend">Friend</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </select>

                  <select
                    value={newContact.priority}
                    onChange={(e) =>
                      setNewContact((prev) => ({
                        ...prev,
                        priority: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  <div className="p-4 pb-20 border-t border-border bg-card">
                    <button
                      onClick={addContact}
                      disabled={adding || !selectedUser}
                      className="w-full py-3 gradient-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {adding ? "Adding..." : "Add Contact"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {showRequestModal && selectedRequestContact && (
          <>
            <div
              className="fixed inset-0 bg-foreground/30 z-50"
              onClick={closeRequestModal}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-foreground">Send Chat Request</h2>
                  <button
                    onClick={closeRequestModal}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-4 p-3 bg-secondary/30 rounded-xl">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {selectedRequestContact.memberId?.name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{selectedRequestContact.memberId?.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedRequestContact.relation}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Message (optional)
                  </label>
                  <textarea
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Add a message to your request..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeRequestModal}
                    className="flex-1 px-4 py-3 rounded-xl border border-border text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendChatRequest}
                    className="flex-1 px-4 py-3 rounded-xl gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Send Request
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {showChat && selectedChatContact && (
          <>
            <div
              className="fixed inset-0 bg-foreground/30 z-50 "
              onClick={closeChat}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col pb-20"
            >
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div className="max-w-lg mx-auto w-full flex flex-col h-full space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {selectedChatContact.memberId?.name?.[0] || "?"}
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-foreground">{selectedChatContact.memberId?.name}</h2>
                        <p className="text-xs text-muted-foreground">{selectedChatContact.relation}</p>
                      </div>
                    </div>
                    <button
                      onClick={closeChat}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto space-y-2 min-h-[300px] max-h-[400px] p-3 bg-[#efeae2] rounded-xl">
                    {loadingMessages ? (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        Loading messages...
                      </div>
                    ) : chatHistory.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm py-8">
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
                                className={`max-w-[75%] px-3 py-2 rounded-lg shadow-sm ${
                                  isSent
                                    ? 'bg-[#dcf8c6] text-foreground'
                                    : 'bg-white text-foreground'
                                }`}
                              >
                                <p className="text-sm break-words">{msg.content}</p>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                  <span className="text-[10px] text-muted-foreground">
                                    {messageTime}
                                  </span>
                                  {isSent && (
                                    <span className="text-[10px]">
                                      {msg.isRead ? (
                                        <CheckCheck className="w-3 h-3 text-blue-500" />
                                      ) : msg.delivered ? (
                                        <CheckCheck className="w-3 h-3 text-muted-foreground" />
                                      ) : (
                                        <Check className="w-3 h-3 text-muted-foreground" />
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
                  <div className="flex gap-2 pt-2 items-end">
                    <div className="flex-1 relative">
                      <input
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                        className="w-full px-4 py-3 rounded-full border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 pr-12"
                      />
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!chatMessage.trim()}
                      className="w-12 h-12 rounded-full bg-[#00a884] text-white hover:bg-[#008f6f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    >
                      <Send className="w-5 h-5" />
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
