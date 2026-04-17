import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { LiveMap } from '@/components/LiveMap';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { EmergencyContacts } from '@/components/EmergencyContacts';
import { SettingsPanel } from '@/components/SettingsPanel';
import { Phone, ShieldCheck, AlertTriangle } from 'lucide-react';
import { emergencyAPI, relationshipAPI, locationAPI, getCurrentUser } from '@/services/api';
import socketService from '@/services/socket';

const ChildDashboard = () => {
  const [sosTriggered, setSosTriggered] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);

  useEffect(() => {
    // Get current user and connect to socket
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      socketService.connect(user.id);
    }

    // Get current location for SOS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      });
    }
  }, []);

  const triggerSOS = async () => {
    if (!currentUser || !location) {
      alert('Unable to trigger emergency. Please ensure location is enabled.');
      return;
    }

    try {
      setSosTriggered(true);
      
      // Trigger emergency in backend
      await emergencyAPI.triggerEmergency({
        triggeredBy: 'Manual',
        latitude: location.latitude,
        longitude: location.longitude,
        severity: 'High',
        message: 'SOS Emergency triggered by child'
      });

      setTimeout(() => setSosTriggered(false), 5000);
    } catch (error) {
      console.error('Failed to trigger SOS:', error);
      alert('Failed to trigger emergency. Please try again.');
      setSosTriggered(false);
    }
  };

  const startLocationSharing = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    
    try {
      setIsSharingLocation(true);
      
      // Get current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        address: 'Current Location',
        status: 'safe',
        timestamp: new Date().toISOString()
      };

      // Update local state
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });

      // Send to backend
      await locationAPI.updateLocation(locationData);
      
      alert('Location sharing started! Your location will be updated every 15 minutes.');
    } catch (error) {
      console.error('Failed to start location sharing:', error);
      alert('Failed to start location sharing. Please try again.');
      setIsSharingLocation(false);
    }
  };

  const stopLocationSharing = () => {
    setIsSharingLocation(false);
    alert('Location sharing stopped.');
  };

  const callParent = () => {
    // Get active parent to call
    const callParentFunc = async () => {
      try {
        const parentsResponse = await relationshipAPI.getActiveRelationships();
        if (parentsResponse.success && parentsResponse.data.activeRelationships.length > 0) {
          const firstParent = parentsResponse.data.activeRelationships[0];
          if (firstParent.parentId?.phone) {
            window.open(`tel:${firstParent.parentId.phone}`, '_self');
          } else {
            alert('Parent phone number not available.');
          }
        } else {
          alert('No active parents found. Please add a parent first.');
        }
      } catch (error) {
        console.error('Failed to get parents:', error);
        alert('Failed to retrieve parent information.');
      }
    };
    
    callParentFunc();
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <DashboardSidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto flex flex-col items-center justify-center">
        <div className="max-w-lg mx-auto text-center space-y-8 w-full">
          {/* Settings */}
          <div className="flex justify-end w-full">
            <SettingsPanel />
          </div>

          {/* Emergency Alert Card */}
          {sosTriggered && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/10 border border-destructive/30 rounded-2xl shadow-depth p-6"
            >
              <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <h2 className="font-bold text-lg text-destructive mb-2">Emergency Alert Sent!</h2>
              <p className="text-sm text-muted-foreground">An SOS alert has been sent to your parents.</p>
            </motion.div>
          )}

          {/* SOS Button */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="relative"
          >
            <button
              onClick={triggerSOS}
              className="relative w-48 h-48 mx-auto rounded-full bg-gradient-to-b from-red-400 to-red-600 shadow-2xl flex flex-col items-center justify-center text-primary-foreground hover:scale-105 transition-transform active:scale-95 group"
            >
              <div className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse-ring" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-b from-red-400 to-red-700 shadow-inner" />
              <div className="relative z-10">
                <span className="text-4xl font-black block">SOS</span>
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">Send Emergency Alert</span>
              </div>
            </button>
          </motion.div>

          {/* LiveMap with Location Sharing */}
          <div className="w-full">
            <LiveMap
              latitude={location?.latitude || 28.6139}
              longitude={location?.longitude || 77.2090}
              address="Current Location"
              accuracy={10}
              status="Active"
              isParent={false}
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={isSharingLocation ? stopLocationSharing : startLocationSharing}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl shadow-depth transition-all active:scale-95
                ${isSharingLocation ? 'bg-red-100' : 'bg-card hover:shadow-depth-hover'}
              `}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center">
                <div className={`w-5 h-5 rounded-full ${isSharingLocation ? 'bg-red-500' : 'bg-green-500'}`} />
              </div>
              <span className="text-xs font-medium text-foreground">
                {isSharingLocation ? 'Stop Sharing' : 'Share Location'}
              </span>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={callParent}
              className="flex flex-col items-center gap-2 p-4 bg-card rounded-2xl shadow-depth hover:shadow-depth-hover transition-all active:scale-95"
            >
              <div className="w-10 h-10 bg-safe/10 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-safe" />
              </div>
              <span className="text-xs font-medium text-foreground">Call Parent</span>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col items-center gap-2 p-4 bg-card rounded-2xl shadow-depth hover:shadow-depth-hover transition-all active:scale-95"
            >
              <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs font-medium text-foreground">Safety Status</span>
            </motion.button>
          </div>

          {/* Emergency Contacts */}
          <EmergencyContacts />
        </div>
      </main>
      <ChatbotWidget role="child" />
    </div>
  );
};

export default ChildDashboard;
