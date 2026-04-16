import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, X, UserPlus, Send, Phone, MapPin, Shield, ShieldOff, Clock, Check , Mail} from 'lucide-react';
import { relationshipAPI, usersAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { BottomNav } from '@/components/BottomNav';
interface Child {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'child' | 'adult';
  permissions: {
    locationTracking: boolean;
    emergencyAlerts: boolean;
    communication: boolean;
    manageSettings: boolean;
  };
  status: 'active' | 'pending' | 'rejected';
}

const ChildInfo = () => {
  const { userName: currentUser, role: currentUserRole } = useAuth();
  const [activeChildren, setActiveChildren] = useState<Child[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [showAddChild, setShowAddChild] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
const [selectedChild, setSelectedChild] = useState<any | null>(null);
  const [manualChild, setManualChild] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [permissions, setPermissions] = useState({
    locationTracking: true,
    emergencyAlerts: true,
    communication: true,
    manageSettings: false
  });
  const [requestMessage, setRequestMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchActiveChildren();
    fetchPendingRequests();
    fetchSentRequests();
  }, []);

  const fetchSentRequests = async () => {
    try {
      const response = await relationshipAPI.getSentRelationships();
      if (response.success) {
        setSentRequests(response.data.sentRequests || []);
      }
    } catch (error) {
      console.error('Failed to fetch sent requests:', error);
    }
  };

  const fetchActiveChildren = async () => {
    try {
      const response = await relationshipAPI.getActiveRelationships();
      if (response.success) {
        const children = response.data.activeRelationships.map((rel: any) => ({
          id: rel.childId._id,
          name: rel.childId.name,
          email: rel.childId.email,
          phone: rel.childId.phone,
          type: rel.childId.type,
          permissions: rel.permissions,
          status: 'active' as const
        }));
        setActiveChildren(children);
      }
    } catch (error) {
      console.error('Failed to fetch active children:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await relationshipAPI.getPendingRelationships();
      if (response.success) {
        setPendingRequests(response.data.pendingRequests);
      }
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
    }
  };

  const searchUsers = async () => {
  if (!searchQuery.trim()) return;

  try {
    setLoading(true);
    const response = await usersAPI.searchUsers(searchQuery);

    if (response.success) {
      setSearchResults(response.data.users || []);
    }
  } catch (error) {
    console.error('Failed to search users:', error);
  } finally {
    setLoading(false);
  }
};

  // const sendChildRequest = async (targetUserId: string, targetUserType: string) => {
  //   try {
  //     setLoading(true);
  //     const relationshipType = targetUserType === 'child' ? 'parent-child' : 'guardian-adult';
      
  //     await relationshipAPI.sendRelationshipRequest({
  //       targetUserId,
  //       relationshipType,
  //       requestMessage,
  //       permissions
  //     });

  //     setShowAddChild(false);
  //     setSearchQuery('');
  //     setSearchResults([]);
  //     setManualChild({ name: '', email: '', phone: '' });
  //     setRequestMessage('');
      
  //     // Refresh pending requests
  //     fetchPendingRequests();
      
  //     alert('Child request sent successfully!');
  //   } catch (error) {
  //     console.error('Failed to send child request:', error);
  //     alert('Failed to send child request. Please try again.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };
const sendChildRequest = async (targetUserId: string, targetUserType: string) => {
  try {
    setLoading(true);

  const relationshipType =
  targetUserType?.toLowerCase() === 'child'
    ? 'parent-child'
    : 'guardian-adult';

    await relationshipAPI.sendRelationshipRequest({
      targetUserId,
      relationshipType,
      requestMessage,
      permissions
    });

    setShowAddChild(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedChild(null); // ✅ reset
    setManualChild({ name: '', email: '', phone: '' });
    setRequestMessage('');

    fetchPendingRequests();
    fetchSentRequests();

    alert('Child request sent successfully! ✅');
  } catch (error) {
    console.error('Failed to send child request:', error);
    alert('Failed to send child request ❌');
  } finally {
    setLoading(false);
  }
};
  const acceptRequest = async (relationshipId: string) => {
    try {
      await relationshipAPI.acceptRelationship(relationshipId, 'Accepted by parent');
      fetchPendingRequests();
      fetchSentRequests();
      fetchActiveChildren();
      alert('Request accepted successfully!');
    } catch (error) {
      console.error('Failed to accept request:', error);
      alert('Failed to accept request. Please try again.');
    }
  };

  const rejectRequest = async (relationshipId: string) => {
    try {
      await relationshipAPI.rejectRelationship(relationshipId, 'Rejected by parent');
      fetchPendingRequests();
      fetchSentRequests();
      alert('Request rejected!');
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert('Failed to reject request. Please try again.');
    }
  };

  const removeChild = async (relationshipId: string) => {
    if (!confirm('Are you sure you want to remove this child? This will terminate the relationship.')) {
      return;
    }

    try {
      await relationshipAPI.terminateRelationship(relationshipId, 'Removed by parent');
      fetchActiveChildren();
      alert('Child removed successfully!');
    } catch (error) {
      console.error('Failed to remove child:', error);
      alert('Failed to remove child. Please try again.');
    }
  };

  const updateChildPermissions = async (relationshipId: string, newPermissions: any) => {
    try {
      await relationshipAPI.updateRelationshipPermissions(relationshipId, newPermissions);
      fetchActiveChildren();
      alert('Permissions updated successfully!');
    } catch (error) {
      console.error('Failed to update permissions:', error);
      alert('Failed to update permissions. Please try again.');
    }
  };
  if (loading || !currentUser) {
    return (
      <div className="flex min-h-screen bg-secondary/30">
        <DashboardSidebar />
  
        <main className="flex-1 p-6 lg:p-8 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground">Loading Child info...</p>
          </div>
        </main>
  
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <DashboardSidebar />
      <div className="max-w-6xl mx-auto space-y-6 pl-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Child Information</h1>
              <p className="text-muted-foreground mt-1">Manage your children and their permissions</p>
            </div>
            <button
              onClick={() => setShowAddChild(true)}
              className="px-6 py-3 gradient-primary text-primary-foreground rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" /> Add Child
            </button>
          </div>

          {/* Active Children */}
          <div className="bg-card rounded-2xl shadow-depth p-6">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Active Children ({activeChildren.length})
            </h2>
            
            {activeChildren.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No active children yet</p>
                <p className="text-sm text-muted-foreground mt-2">Click "Add Child" to get started</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeChildren.map((child) => (
                  <motion.div
                    key={child.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-background rounded-xl p-4 border border-border"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-foreground">{child.name}</h3>
                        <p className="text-sm text-muted-foreground">{child.type === 'child' ? 'Child' : 'Adult'}</p>
                      </div>
                      <button
                        onClick={() => removeChild(child.id)}
                        className="text-destructive hover:bg-destructive/10 p-1 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{child.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{child.phone}</span>
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="font-medium text-foreground mb-2">Permissions</h4>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={child.permissions.locationTracking}
                            onChange={(e) => updateChildPermissions(child.id, { ...child.permissions, locationTracking: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Location Tracking</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={child.permissions.emergencyAlerts}
                            onChange={(e) => updateChildPermissions(child.id, { ...child.permissions, emergencyAlerts: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Emergency Alerts</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={child.permissions.communication}
                            onChange={(e) => updateChildPermissions(child.id, { ...child.permissions, communication: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Communication</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={child.permissions.manageSettings}
                            onChange={(e) => updateChildPermissions(child.id, { ...child.permissions, manageSettings: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Manage Settings</span>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="bg-card rounded-2xl shadow-depth p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-warning" />
                Pending Requests ({pendingRequests.length})
              </h2>
              
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div key={request._id} className="bg-background rounded-xl p-4 border border-border">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-foreground">
                          {request.initiatedBy === 'parent' ? request.childId?.name : request.parentId?.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {request.initiatedBy === 'parent' ? 'Child' : 'Parent'} Request
                        </p>
                        {request.requestMessage && (
                          <p className="text-sm text-muted-foreground mt-1">"{request.requestMessage}"</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptRequest(request._id)}
                          className="px-3 py-1 bg-safe text-safe-foreground rounded-lg text-sm font-medium hover:bg-safe/90 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => rejectRequest(request._id)}
                          className="px-3 py-1 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sent Requests */}
          {sentRequests.length > 0 && (
            <div className="bg-card rounded-2xl shadow-depth p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Send className="w-6 h-6 text-info" />
                Sent Requests ({sentRequests.length})
              </h2>
              
              <div className="space-y-3">
                {sentRequests.map((request) => (
                  <div key={request._id} className="bg-background rounded-xl p-4 border border-border">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-foreground">
                          {request.initiatedBy === 'parent' ? request.childId?.name : request.parentId?.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {request.relationshipType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Status: <span className={`font-medium ${
                            request.status === 'pending' ? 'text-warning' :
                            request.status === 'active' ? 'text-safe' : 'text-destructive'
                          }`}>{request.status}</span>
                        </p>
                        {request.requestMessage && (
                          <p className="text-sm text-muted-foreground mt-1">"{request.requestMessage}"</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Sent: {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs">
                        {request.status === 'pending' && <Clock className="w-3 h-3" />}
                        {request.status === 'active' && <Check className="w-3 h-3" />}
                        {request.status === 'rejected' && <X className="w-3 h-3" />}
                        {request.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Add Child Modal */}
        {showAddChild && (
          <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-2xl shadow-depth p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-foreground">Add Child</h3>
                <button
                  onClick={() => setShowAddChild(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Option */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Search by Email or Phone</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                      placeholder="Enter email or phone number..."
                      className="flex-1 px-3 py-2 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={searchUsers}
                      disabled={loading}
                      className="px-4 py-2 gradient-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
  <div className="space-y-2 max-h-40 overflow-y-auto">
    {searchResults.map((user) => (
      <div
        key={user._id}
        onClick={() => {
          console.log('Selected child:', user);
          setSelectedChild(user);
          setSearchResults([]);
          setSearchQuery('');
        }}
        className={`p-3 rounded-xl border cursor-pointer transition ${
          selectedChild?._id === user._id
            ? 'border-primary bg-primary/10'
            : 'border-border hover:bg-muted'
        }`}
      >
        <p className="font-medium text-foreground">{user.name}</p>
        <p className="text-sm text-muted-foreground">
          {user.email} • {user.phone}
        </p>
      </div>
    ))}
  </div>
)}

                {/* Manual Add Option */}
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground mb-3">Or add manually (child will need to accept request)</p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={manualChild.name}
                      onChange={(e) => setManualChild({ ...manualChild, name: e.target.value })}
                      placeholder="Child's name"
                      className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      type="email"
                      value={manualChild.email}
                      onChange={(e) => setManualChild({ ...manualChild, email: e.target.value })}
                      placeholder="Child's email"
                      className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      type="tel"
                      value={manualChild.phone}
                      onChange={(e) => setManualChild({ ...manualChild, phone: e.target.value })}
                      placeholder="Child's phone"
                      className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                {/* Request Message */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Request Message (Optional)</label>
                  <textarea
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Add a personal message..."
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                {/* Permissions */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Default Permissions</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.locationTracking}
                        onChange={(e) => setPermissions({ ...permissions, locationTracking: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Location Tracking</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.emergencyAlerts}
                        onChange={(e) => setPermissions({ ...permissions, emergencyAlerts: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Emergency Alerts</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions.communication}
                        onChange={(e) => setPermissions({ ...permissions, communication: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Communication</span>
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddChild(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-xl text-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    // onClick={() => manualChild.email && sendChildRequest(manualChild.email, 'child')}
                    onClick={() => {
  if (selectedChild?._id) {
    sendChildRequest(selectedChild._id, selectedChild.userType || 'Child');
  } else if (manualChild.name && manualChild.email) {
    alert('Manual child flow not implemented yet');
  } else {
    alert('Please select a child or fill details');
  }
}}
                    disabled={loading}
                    className="flex-1 px-4 py-2 gradient-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChildInfo;
