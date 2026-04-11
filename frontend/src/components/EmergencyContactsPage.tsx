import { useState } from 'react';
import { Phone, MessageSquare, Plus, X, UserPlus, AlertTriangle, Send } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { motion } from 'framer-motion';
import { DashboardSidebar } from './DashboardSidebar';

interface Contact {
  id: string;
  name: string;
  phone: string;
  relation: 'Parent' | 'Friend' | 'Guardian' | string;
}

const dummyContacts: Contact[] = [
  { id: '1', name: 'Sarah Johnson', phone: '+1 (555) 123-4567', relation: 'Parent' },
  { id: '2', name: 'Mike Davis', phone: '+1 (555) 987-6543', relation: 'Guardian' },
  { id: '3', name: 'Emily Chen', phone: '+1 (555) 456-7890', relation: 'Friend' },
  { id: '4', name: 'Emergency Services', phone: '911', relation: 'Emergency' },
];

const relationColors: Record<string, string> = {
  Parent: 'bg-primary/10 text-primary',
  Guardian: 'bg-[hsl(var(--safe))]/10 text-[hsl(var(--safe))]',
  Friend: 'bg-accent/10 text-accent',
  Emergency: 'bg-destructive/10 text-destructive',
};

export default function EmergencyContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(dummyContacts);
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: 'Friend' });
  const [alertSent, setAlertSent] = useState(false);

  const addContact = () => {
    if (!newContact.name || !newContact.phone) return;
    setContacts(prev => [...prev, { ...newContact, id: Date.now().toString() }]);
    setNewContact({ name: '', phone: '', relation: 'Friend' });
    setShowAdd(false);
  };

  const callContact = (phone: string) => window.open(`tel:${phone}`, '_self');

  const sendAlert = (phone: string, name: string) => {
    window.open(`sms:${phone}?body=${encodeURIComponent('🚨 EMERGENCY: I need help immediately! Please respond ASAP.')}`, '_blank');
  };

  const sendBulkAlert = () => {
    contacts.forEach(c => {
      window.open(`sms:${c.phone}?body=${encodeURIComponent('🚨 EMERGENCY: I am in danger! Please help immediately!')}`, '_blank');
    });
    setAlertSent(true);
    setTimeout(() => setAlertSent(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
        <DashboardSidebar/>
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">Emergency Contacts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Quick access to your safety network</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Bulk Alert */}
        <button onClick={sendBulkAlert} className="w-full py-3 gradient-emergency text-destructive-foreground rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-depth">
          <AlertTriangle className="w-4 h-4" /> Send Alert to All Contacts
        </button>

        {alertSent && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-[hsl(var(--safe))]/10 text-[hsl(var(--safe))] text-sm font-medium text-center rounded-xl">
            ✅ Emergency alert sent to all contacts!
          </motion.div>
        )}

        {/* Contact List */}
        {contacts.map((contact, i) => (
          <motion.div
            key={contact.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl shadow-depth p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                  {contact.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">{contact.phone}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${relationColors[contact.relation] || 'bg-muted text-muted-foreground'}`}>
                    {contact.relation}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => callContact(contact.phone)} className="w-10 h-10 rounded-full bg-[hsl(var(--safe))]/10 text-[hsl(var(--safe))] flex items-center justify-center hover:bg-[hsl(var(--safe))]/20 transition-colors" title="Call">
                  <Phone className="w-4 h-4" />
                </button>
                <button onClick={() => sendAlert(contact.phone, contact.name)} className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors" title="Send Alert">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Contact FAB */}
      <button onClick={() => setShowAdd(true)} className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full gradient-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
        <UserPlus className="w-5 h-5" />
      </button>

      {/* Add Contact Modal */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-foreground/30 z-50" onClick={() => setShowAdd(false)} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl">
            <div className="max-w-lg mx-auto p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-foreground">Add Contact</h2>
                <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <input value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))} placeholder="Name" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} placeholder="Phone Number" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <select value={newContact.relation} onChange={e => setNewContact(p => ({ ...p, relation: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="Parent">Parent</option>
                <option value="Guardian">Guardian</option>
                <option value="Friend">Friend</option>
              </select>
              <button onClick={addContact} className="w-full py-3 gradient-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all">
                Add Contact
              </button>
            </div>
          </motion.div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
