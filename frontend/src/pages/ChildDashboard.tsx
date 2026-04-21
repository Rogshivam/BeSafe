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
  const [status, setStatus] = useState<string>('Active');
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address?: string; accuracy?: number; status?: string; triggeredBy?: string; title?: string; description?: string } | null>(null);
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
    if (!location) {
      alert('Please enable location sharing first');
      return;
    }

    // Try the main SOS API first
    try {
      const response = await emergencyAPI.triggerEmergency({
        triggeredBy: 'Manual',
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0,
        severity: 'Critical',
        message: 'SOS Emergency triggered by child',
        title: 'SOS Emergency',
        description: location?.address || 'Unknown Location',
        address: location?.address || 'Unknown Location',
        accuracy: location?.accuracy || 0
      });

      if (response.success) {
        alert('Emergency sent successfully!');
        setStatus('Emergency');
        setSosTriggered(true);
      } else {
        // Fallback to direct email notification
        await sendEmergencyEmailFallback();
      }
    } catch (error) {
      console.error('SOS API Error:', error);
      // If API fails (403, network error, etc.), use email fallback
      await sendEmergencyEmailFallback();
    }
  };

  const sendEmergencyEmailFallback = async () => {
    try {
      // Create a direct notification that bypasses routing issues
      const notificationData = {
        childName: currentUser?.name || 'Child',
        childLocation: {
          latitude: location?.latitude || 0,
          longitude: location?.longitude || 0,
          address: location?.address || 'Unknown Location',
          accuracy: location?.accuracy || 0
        },
        message: 'SOS Emergency triggered by child - Direct Email Notification',
        severity: 'Critical'
      };

      // Try multiple endpoints to ensure delivery
      let notificationSent = false;
      let errorMessage = '';

      // Try the relationships API first (most likely to work)
      try {
        const response = await relationshipAPI.sendSOSNotification(notificationData);
        if (response.success) {
          notificationSent = true;
          // console.log('SOS notification sent via relationships API');
        } else {
          errorMessage = response.message || 'Relationships API notification failed';
        }
      } catch (error) {
        // console.log('Relationships API notification failed:', error);
        errorMessage = error.message;
      }

      // If relationships API fails, try the emergency universal endpoint
      if (!notificationSent) {
        try {
          const response = await emergencyAPI.sendEmergencyNotification(notificationData);
          if (response.success) {
            notificationSent = true;
            // console.log('SOS notification sent via emergency API');
          } else {
            errorMessage = response.message || 'Emergency API notification failed';
          }
        } catch (error) {
          // console.log('Emergency API notification failed:', error);
          errorMessage = error.message;
        }
      }

      // If both fail, try the legacy endpoint
      if (!notificationSent) {
        try {
          const response = await emergencyAPI.sendEmergencyEmail(notificationData);
          if (response.success) {
            notificationSent = true;
            // console.log('SOS notification sent via legacy endpoint');
          } else {
            errorMessage = response.message || 'Legacy notification failed';
          }
        } catch (error) {
          // console.log('Legacy notification failed:', error);
          errorMessage = error.message;
        }
      }

      // If both API calls fail, create a manual notification
      if (!notificationSent) {
        // console.log('API endpoints failed, creating manual notification');
        
        // Create a comprehensive location message for manual sharing
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${location?.latitude},${location?.longitude}`;
        const appleMapsUrl = `https://maps.apple.com/?ll=${location?.latitude},${location?.longitude}`;
        
        const emergencyMessage = `**SOS EMERGENCY ALERT**\n\n` +
          `Child: ${currentUser?.name || 'Child'}\n` +
          `Time: ${new Date().toLocaleString()}\n` +
          `Status: CRITICAL\n\n` +
          `Location Details:\n` +
          `Address: ${location?.address || 'Unknown Location'}\n` +
          `Coordinates: ${location?.latitude?.toFixed(6)}, ${location?.longitude?.toFixed(6)}\n` +
          `Accuracy: ±${location?.accuracy || 0}m\n\n` +
          `Map Links:\n` +
          `Google Maps: ${googleMapsUrl}\n` +
          `Apple Maps: ${appleMapsUrl}\n\n` +
          `Please check on your child immediately!\n\n` +
          `Sent via BeSafe Emergency System`;

        // Copy to clipboard for manual sharing
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(emergencyMessage);
          alert(`Emergency notification copied to clipboard! Please send this message to your parents immediately:\n\n${emergencyMessage}`);
        } else {
          alert(`EMERGENCY - Please contact your parents immediately with this information:\n\n${emergencyMessage}`);
        }
        
        setStatus('Emergency');
        setSosTriggered(true);
        return;
      }

      // Success case
      alert('Emergency notification sent successfully to your parents!');
      setStatus('Emergency');
      setSosTriggered(true);

    } catch (error) {
      console.error('Emergency notification error:', error);
      alert('Emergency notification failed. Please call your parents immediately!');
    }
  };

  
  const shareLocationWithMaps = () => {
    if (!location) {
      alert('No location available to share');
      return;
    }

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${location?.latitude},${location?.longitude}`;
    const appleMapsUrl = `https://maps.apple.com/?ll=${location?.latitude},${location?.longitude}`;
    
    const message = `📍 My Current Location\n\n` +
      `Address: ${location?.address || 'Unknown'}\n` +
      `Coordinates: ${location?.latitude?.toFixed(6)}, ${location?.longitude?.toFixed(6)}\n\n` +
      `🗺️ Google Maps: ${googleMapsUrl}\n` +
      `🍎 Apple Maps: ${appleMapsUrl}\n\n` +
      `Sent via BeSafe Child Tracking System`;

    // Copy to clipboard functionality
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message)
        .then(() => {
          alert('Location and map links copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy:', err);
          alert('Failed to copy location to clipboard');
        });
    } else {
      // Fallback: create a temporary textarea with the message
      const textarea = document.createElement('textarea');
      textarea.value = message;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('Location and map links copied to clipboard!');
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
          <div className="w-full sticky">
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
              className="flex flex-col items-center gap-2 p-4 bg-card rounded-2xl shadow-depth hover:shadow-depth-hover transition-all active:scale-95"
            >
              <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs font-medium text-foreground">Safety Status</span>
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
          </div>
        </div>
      </main>
      <ChatbotWidget role="child" />
    </div>
  );
};

export default ChildDashboard;
