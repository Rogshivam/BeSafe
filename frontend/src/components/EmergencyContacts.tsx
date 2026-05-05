import { useState, useEffect } from 'react';
import { Phone, MessageSquare, Plus, X, UserPlus, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usersAPI, communicationAPI, EmergencyContact } from '@/services/api';

interface Contact {
  id: string;
  memberId: string;
  name: string;
  phone: string;
  relation: string;
  priority: 'High' | 'Medium' | 'Low';
  isEmergencyContact: boolean;
}

export const EmergencyContacts = () => {
  const { role } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: '', priority: 'Medium' as 'High' | 'Medium' | 'Low' });
  const [bulkMsg, setBulkMsg] = useState('');
  const [showBulkMsg, setShowBulkMsg] = useState(false);
  const [sentAlert, setSentAlert] = useState(false);

  // Fetch emergency contacts from backend
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await usersAPI.getEmergencyContacts();
        if (response.success) {
          // Transform backend contacts to include phone number
          const transformedContacts = response.data.emergencyContacts.map((contact: any) => ({
            id: contact.id,
            memberId: contact.memberId._id || contact.memberId,
            name: contact.memberName || contact.memberId?.name || '',
            phone: contact.memberId?.phone || '',
            relation: contact.relation,
            priority: contact.priority,
            isEmergencyContact: contact.isEmergencyContact,
          }));
          setContacts(transformedContacts);
        }
      } catch (error) {
        console.error('Failed to fetch emergency contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  const addContact = async () => {
    if (!newContact.name || !newContact.phone) return;
    
    try {
      // First search for the user by phone/email
      const searchResponse = await usersAPI.searchUsers(newContact.phone);
      if (searchResponse.success && searchResponse.data.users.length > 0) {
        const user = searchResponse.data.users[0];
        
        // Add as emergency contact
        const addResponse = await usersAPI.addEmergencyContact({
          memberId: user.id,
          relation: newContact.relation,
          priority: newContact.priority
        });
        
        if (addResponse.success) {
          // Refresh contacts
          const contactsResponse = await usersAPI.getEmergencyContacts();
          if (contactsResponse.success) {
            const transformedContacts = contactsResponse.data.emergencyContacts.map((contact: any) => ({
              id: contact.id,
              memberId: contact.memberId._id || contact.memberId,
              name: contact.memberName || contact.memberId?.name || '',
              phone: contact.memberId?.phone || '',
              relation: contact.relation,
              priority: contact.priority,
              isEmergencyContact: contact.isEmergencyContact,
            }));
            setContacts(transformedContacts);
          }
        } else {
          alert('User not found. Please check the phone number or email and try again.');
        }
      } else {
        alert('User not found. Please check the phone number or email and try again.');
      }
    } catch (error) {
      console.error('Failed to add contact:', error);
      alert('Failed to add contact. Please check phone number and try again.');
    }
    
    setNewContact({ name: '', phone: '', relation: '', priority: 'Medium' });
    setShowAdd(false);
  };

  const removeContact = async (memberId: string) => {
    try {
      // Find the contact ID to remove
      const contact = contacts.find(c => c.memberId === memberId);
      if (contact) {
        const response = await usersAPI.removeEmergencyContact(contact.id);
        if (response.success) {
          setContacts(prev => prev.filter(c => c.memberId !== memberId));
        }
      }
    } catch (error) {
      console.error('Failed to remove contact:', error);
      alert('Failed to remove contact. Please try again.');
    }
  };

  const callContact = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const sendBulkDangerMsg = async () => {
    try {
      const message = bulkMsg || '🚨 I AM IN DANGER! Please help me immediately!';
      await communicationAPI.triggerAlarm(message);
      setSentAlert(true);
      setTimeout(() => setSentAlert(false), 3000);
      setShowBulkMsg(false);
      setBulkMsg('');
    } catch (error) {
      console.error('Failed to send bulk message:', error);
      alert('Failed to send emergency alert. Please try again.');
    }
  };

  const sendQuickDanger = async () => {
    try {
      const message = '🚨 EMERGENCY: I AM IN DANGER! Please help me immediately! Send help now!';
      await communicationAPI.triggerAlarm(message);
      setSentAlert(true);
      setTimeout(() => setSentAlert(false), 3000);
    } catch (error) {
      console.error('Failed to send quick danger alert:', error);
      alert('Failed to send emergency alert. Please try again.');
    }
  };

  return (
    <div className="bg-card rounded-2xl shadow-depth overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <span className="text-lg">📞</span> Emergency Contacts
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkMsg(true)}
            className="px-3 py-1.5 gradient-emergency text-destructive-foreground rounded-xl text-xs font-bold flex items-center gap-1 hover:opacity-90 transition-all active:scale-95"
          >
            <AlertTriangle className="w-3 h-3" /> Bulk Alert
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 gradient-primary text-primary-foreground rounded-xl text-xs font-bold flex items-center gap-1 hover:opacity-90 transition-all active:scale-95"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {sentAlert && (
        <div className="p-3 bg-safe/10 text-safe text-sm font-medium text-center animate-fade-in">
          ✅ Emergency alert sent to all contacts!
        </div>
      )}

      {/* Bulk Message Modal */}
      {showBulkMsg && (
        <div className="p-4 bg-destructive/5 border-b border-border space-y-3 animate-fade-in">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-sm text-foreground">Send Bulk Emergency Message</h4>
            <button onClick={() => setShowBulkMsg(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={bulkMsg}
            onChange={(e) => setBulkMsg(e.target.value)}
            placeholder="Custom message (or leave blank for default danger alert)"
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30 resize-none h-20"
          />
          <div className="flex gap-2">
            <button onClick={sendQuickDanger} className="flex-1 py-2 gradient-emergency text-destructive-foreground rounded-xl text-xs font-bold hover:opacity-90 active:scale-95">
              🚨 Quick "I'm in Danger"
            </button>
            <button onClick={sendBulkDangerMsg} className="flex-1 py-2 gradient-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 active:scale-95">
              Send Custom Message
            </button>
          </div>
        </div>
      )}

      {/* Add Contact Form */}
      {showAdd && (
        <div className="p-4 bg-secondary/50 border-b border-border space-y-3 animate-fade-in">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1"><UserPlus className="w-4 h-4" /> Add Contact</h4>
            <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <input 
              value={newContact.name} 
              onChange={e => setNewContact(p => ({...p, name: e.target.value}))} 
              placeholder="Name" 
              className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" 
            />
            <input 
              value={newContact.phone} 
              onChange={e => setNewContact(p => ({...p, phone: e.target.value}))} 
              placeholder="Phone or Email" 
              className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" 
            />
            <input 
              value={newContact.relation} 
              onChange={e => setNewContact(p => ({...p, relation: e.target.value}))} 
              placeholder="Relation" 
              className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" 
            />
            <select 
              value={newContact.priority} 
              onChange={e => setNewContact(p => ({...p, priority: e.target.value as 'High' | 'Medium' | 'Low'}))} 
              className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <button onClick={addContact} className="w-full py-2 gradient-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 active:scale-95">
            Add Contact
          </button>
        </div>
      )}

      <div className="divide-y divide-border">
        {contacts.map(contact => (
          <div key={contact.memberId} className="p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                {contact.name?.[0] || '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{contact.name}</p>
                <p className="text-xs text-muted-foreground">{contact.relation} • {contact.phone} • {contact.priority}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => callContact(contact.phone)}
                className="w-9 h-9 rounded-full bg-safe/10 text-safe flex items-center justify-center hover:bg-safe/20 transition-colors"
                title="Call"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => window.open(`sms:${contact.phone}?body=${encodeURIComponent('I need help!')}`, '_blank')}
                className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                title="Message"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => removeContact(contact.memberId)}
                className="w-9 h-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors opacity-0 group-hover:opacity-100"
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
