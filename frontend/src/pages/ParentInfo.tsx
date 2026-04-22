import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { relationshipAPI, usersAPI, getCurrentUser } from '@/services/api';
import { Search, Plus, X, UserPlus, Check, XCircle, Clock, Send } from 'lucide-react';
import { LiveMap } from '@/components/LiveMap';
import { BottomNav } from '@/components/BottomNav';
import { profile } from 'console';
import { DashboardSidebar } from '@/components/DashboardSidebar';

interface Parent {
  id: string;
  relationshipId: string; // Add relationship ID for termination
  name: string;
  email: string;
  phone: string;
  type: 'parent';
  permissions: {
    locationTracking: boolean;
    emergencyAlerts: boolean;
    communication: boolean;
    manageSettings: boolean;
  };
  status: 'active' | 'pending' | 'rejected';
}

const ParentInfo = () => {
  const { userName: currentUser, role: currentUserRole } = useAuth();
  const [activeParents, setActiveParents] = useState<Parent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [showAddParent, setShowAddParent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  // const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [selectedParent, setSelectedParent] = useState<any | null>(null);
  const [manualParent, setManualParent] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const [requestMessage, setRequestMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [childLocations, setChildLocations] = useState<any[]>([]);

  useEffect(() => {
    fetchActiveParents();
    fetchPendingRequests();
    fetchSentRequests();
    if (currentUserRole === 'parent') {
      fetchChildLocations();
    }
  }, [currentUserRole]);

  const fetchChildLocations = async () => {
    try {
      const response = await relationshipAPI.getChildLocations();
      if (response.success) {
        setChildLocations(response.data.childLocations || []);
      }
    } catch (error) {
      console.error('Failed to fetch child locations:', error);
    }
  };

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

  const fetchActiveParents = async () => {
    try {
      console.log('Fetching active parents for user role:', currentUserRole);
      const response = await relationshipAPI.getActiveRelationships();
      if (response.success) {
        // console.log('All active relationships from backend:', response.data.activeRelationships.map((rel: any) => ({
        //   _id: rel._id,
        //   parentId: rel.parentId?._id,
        //   childId: rel.childId?._id,
        //   status: rel.status,
        //   relationshipType: rel.relationshipType
        // })));
        
        // For children/adults: filter relationships where they are the childId and extract parentId
        // For parents: filter relationships where they are the parentId and extract childId (if needed)
        const parents = response.data.activeRelationships
          .filter((rel: any) => {
            // For child/adult users, show relationships where they are the child
            if (currentUserRole === 'child' || currentUserRole === 'adult' || currentUserRole === 'individual') {
              return rel.childId && rel.childId._id && rel.parentId && rel.parentId._id;
            }
            // For parent users, show relationships where they are the parent
            return rel.parentId && rel.parentId._id && rel.childId && rel.childId._id;
          })
          .map((rel: any) => ({
            id: rel.parentId._id, // Always show the parent as the "parent" in this view
            relationshipId: rel._id, // Include relationship ID for termination
            name: rel.parentId.name || 'Unknown Parent',
            email: rel.parentId.email || '',
            phone: rel.parentId.phone || '',
            type: 'parent' as const,
            permissions: rel.permissions || {},
            status: 'active' as const
          }));
        
        // console.log('Active parents fetched:', parents.length);
        // console.log('Parents with relationshipIds:', parents.map((parent: any) => ({
        //   id: parent.id,
        //   relationshipId: parent.relationshipId,
        //   name: parent.name
        // })));
        setActiveParents(parents);
      }
    } catch (error) {
      console.error('Failed to fetch active parents:', error);
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

  const sendParentRequest = async (targetUserId: string) => {
    try {
      // console.log('sendParentRequest called with targetUserId:', targetUserId);
      // console.log('Current user role:', currentUserRole);
      // console.log('Relationship type:', getRelationshipType());
      // console.log('Current active parents:', activeParents.map(p => ({ id: p.id, name: p.name })));
      
      // Prevent self-requests
      const currentUser = getCurrentUser() as any;
      if (currentUser && (currentUser.id === targetUserId || currentUser._id === targetUserId)) {
        alert('Cannot send relationship request to yourself');
        return;
      }

      if (activeParents.some(p => p.id === targetUserId)) {
        alert('Already added as parent');
        return;
      }

      setLoading(true);

      // console.log('Sending relationship request...');
      await relationshipAPI.sendRelationshipRequest({
        targetUserId,
        relationshipType: getRelationshipType(), // Adult to parent relationship
        requestMessage,
        permissions: {
          locationTracking: true,
          emergencyAlerts: true,
          communication: true,
          manageSettings: false
        }
      });

      setShowAddParent(false);
      setSearchQuery('');
      setSearchResults([]);
      setManualParent({ name: '', email: '', phone: '' });
      setRequestMessage('');

      // Refresh pending requests, active parents, and sent requests
      fetchPendingRequests();
      fetchActiveParents();
      fetchSentRequests();

      alert('Parent request sent successfully!');
    } catch (error) {
      console.error('Failed to send parent request:', error);
      alert('Failed to send parent request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (relationshipId: string) => {
    try {
      await relationshipAPI.acceptRelationship(relationshipId, 'Accepted by child/adult');
      fetchPendingRequests();
      fetchSentRequests();
      fetchActiveParents();
      alert('Request accepted successfully!');
    } catch (error) {
      console.error('Failed to accept request:', error);
      alert('Failed to accept request. Please try again.');
    }
  };

  const rejectRequest = async (relationshipId: string) => {
    try {
      await relationshipAPI.rejectRelationship(relationshipId, 'Rejected by child/adult');
      fetchPendingRequests();
      fetchSentRequests();
      fetchActiveParents();
      alert('Request rejected successfully!');
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert('Failed to reject request. Please try again.');
    }
  };

  const removeParent = async (relationshipId: string) => {
    if (!confirm('Are you sure you want to remove this parent? This will terminate the relationship.')) {
      return;
    }

    try {
      // Verify relationship exists in current state before terminating
      const relationshipExists = activeParents.some(parent => parent.relationshipId === relationshipId);
      if (!relationshipExists) {
        alert('This relationship no longer exists. Refreshing data...');
        await fetchActiveParents();
        return;
      }

      await relationshipAPI.terminateRelationship(relationshipId, 'Removed by child/adult');
      
      // Remove from local state immediately
      setActiveParents(prev => prev.filter(parent => parent.relationshipId !== relationshipId));
      
      // Then refresh from server to ensure sync
      await fetchActiveParents();
      
      alert('Parent removed successfully!');
    } catch (error) {
      console.error('Failed to remove parent:', error);
      alert('Failed to remove parent. Please try again.');
      
      // Refresh data on error to ensure sync
      await fetchActiveParents();
    }
  };
const getRelationshipType = () => {
  if (currentUserRole === 'child') return 'parent-child';
  if (currentUserRole === 'adult' || currentUserRole === 'individual') {
    return 'guardian-adult';
  }
  if (currentUserRole === 'parent') {
    return 'parent-child'; // Parent to child
  }
  return null;
};

  if (loading) {
    return (
      <div className="flex min-h-screen bg-secondary/30">
        <DashboardSidebar />

        <main className="flex-1 p-6 lg:p-8 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground">Loading settings...</p>
          </div>
        </main>

        <BottomNav />
      </div>
    );
  };

  return (
    <div className=" flex min-h-screen bg-background ">
      <DashboardSidebar />

      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">Parent Information</h1>
          <p className="text-muted-foreground">Manage your parent relationships and add new parents</p>
        </motion.div>

        {/* Child Locations for Parents */}
        {currentUserRole === 'parent' && childLocations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card rounded-xl p-6 shadow-lg mb-6"
          >
            <h2 className="text-xl font-semibold text-foreground mb-4">Child Locations</h2>
            <LiveMap
              latitude={0}
              longitude={0}
              isParent={true}
              childLocations={childLocations}
              status="safe"
            />
          </motion.div>
        )}

        {/* Active Parents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-6 shadow-lg mb-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">Active Parents</h2>
            <button
              onClick={() => setShowAddParent(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Parent
            </button>
          </div>

          {activeParents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No active parents</p>
              <p className="text-sm">Add a parent to enable location sharing and emergency features</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeParents.map((parent) => (
                <motion.div
                  key={parent.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-background border rounded-lg p-4 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{parent.name}</h3>
                      <p className="text-sm text-muted-foreground">{parent.email}</p>
                      <p className="text-sm text-muted-foreground">{parent.phone}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      <Check className="w-3 h-3" />
                      Active
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {parent.permissions.locationTracking && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Location Tracking</span>
                      )}
                      {parent.permissions.emergencyAlerts && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Emergency Alerts</span>
                      )}
                      {parent.permissions.communication && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">Communication</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeParent(parent.relationshipId)}
                      className="w-full mt-3 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Remove Parent
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl p-6 shadow-lg mb-6"
          >
            <h2 className="text-xl font-semibold text-foreground mb-4">Pending Requests</h2>
            <div className="space-y-3">
              {pendingRequests.map((request: any) => (
                <div key={request._id} className="bg-background border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {request.initiatedBy === 'parent' ? 'Parent Request' : 'Child/Adult Request'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        From: {request.initiatedBy === 'parent' ? request.parentId?.name : request.childId?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.requestMessage}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                      <Clock className="w-3 h-3" />
                      Pending
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptRequest(request._id)}
                      className="flex-1 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => rejectRequest(request._id)}
                      className="flex-1 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Sent Requests */}
        {sentRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-xl p-6 shadow-lg mb-6"
          >
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Send className="w-6 h-6 text-info" />
              Sent Requests ({sentRequests.length})
            </h2>
            <div className="space-y-3">
              {sentRequests.map((request) => (
                <div key={request._id} className="bg-background border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {request.initiatedBy === 'parent' ? request.childId?.name : request.parentId?.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {request.relationshipType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Status: <span className={`font-medium ${request.status === 'pending' ? 'text-warning' :
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
          </motion.div>
        )}

        {/* Add Parent Modal */}
        {showAddParent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowAddParent(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card rounded-xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-foreground">Add Parent</h3>
                <button
                  onClick={() => setShowAddParent(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Existing User */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Search Existing User
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by email or name..."
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={searchUsers}
                    disabled={loading}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-3 max-h-40 overflow-y-auto border rounded-lg">
                    {searchResults.map((user: any) => {
                      const currentUser = getCurrentUser() as any;
                      const isCurrentUser = currentUser && (currentUser.id === user._id || currentUser._id === user._id);
                      
                      return (
                        <div
                          key={user._id}
                          onClick={() => {
                            if (isCurrentUser) {
                              alert('Cannot select yourself');
                              return;
                            }
                            
                            if (selectedParent?._id === user._id) {
                              setSelectedParent(null); // deselect
                            } else {
                              setSelectedParent(user); // select
                            }

                            setSearchResults([]);
                            setSearchQuery('');
                          }}
                          className={`p-3 border-b last:border-b-0 cursor-pointer ${
                            isCurrentUser 
                              ? 'opacity-50 bg-gray-100 cursor-not-allowed' 
                              : 'hover:bg-muted'
                          }`}
                        >
                          <div className="font-medium text-foreground">
                            {user.name} {isCurrentUser && '(You)'}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {selectedParent && (
                <div className="mt-3 p-3 border rounded-lg bg-green-50">
                  <p className="text-sm font-medium text-green-800">
                    Selected: {selectedParent.name}
                  </p>
                  <p className="text-xs text-green-600">
                    {selectedParent.email}
                  </p>
                  <button
                    onClick={() => setSelectedParent(null)}
                    className="mt-2 text-xs text-red-500 hover:underline"
                  >
                    Remove selected parent
                  </button>
                </div>
              )}
              {/* Manual Entry */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Or Enter Parent Details Manually
                </label>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={manualParent.name}
                    onChange={(e) => setManualParent({ ...manualParent, name: e.target.value })}
                    placeholder="Parent Name"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="email"
                    value={manualParent.email}
                    onChange={(e) => setManualParent({ ...manualParent, email: e.target.value })}
                    placeholder="Parent Email"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="tel"
                    value={manualParent.phone}
                    onChange={(e) => setManualParent({ ...manualParent, phone: e.target.value })}
                    placeholder="Parent Phone"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Request Message */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Request Message
                </label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Please add me as your child to enable safety features..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddParent(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedParent?._id) {
                      const targetUser = selectedParent;

                      // Allow children and adults to send requests to parents
                      // Remove validation that was blocking requests
                      // if (currentUserRole === 'child' && targetRole !== 'parent') {
                      //   alert('Children can only add parents');
                      //   return;
                      // }

                      // if (currentUserRole === 'adult' && targetRole !== 'parent') {
                      //   alert('Adults can only add guardians (parents)');
                      //   return;
                      // }

                      sendParentRequest(selectedParent._id);
                    } else if (manualParent.name && manualParent.email) {
                      alert('Manual parent flow not implemented yet');
                    } else {
                      alert('Please select a parent or fill details');
                    }
                  }}
//                   onClick={() => {
//                     if (selectedParent?._id) {
//   sendParentRequest(selectedParent._id);
// } else if (manualParent.name && manualParent.email) {
//   alert('Manual parent flow not implemented yet');
// } else {
//   alert('Please select a parent or fill details');
// }
//                   }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ParentInfo;
