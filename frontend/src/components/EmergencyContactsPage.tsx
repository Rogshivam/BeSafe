import { useEffect, useMemo, useState } from "react";
import {
  Phone,
  UserPlus,
  AlertTriangle,
  Send,
  X,
  Search,
  Trash2,
  Pencil,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { motion } from "framer-motion";
import { DashboardSidebar } from "./DashboardSidebar";

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
            className="absolute right-4 top-0 z-30 w-11 h-11 rounded-full gradient-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
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

        <BottomNav />
      </main>
    </div>
  );
}
