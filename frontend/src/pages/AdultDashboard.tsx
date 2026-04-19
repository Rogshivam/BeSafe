import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { RiskMeter } from '@/components/RiskMeter';
import { ActivityLog } from '@/components/ActivityLog';
import { QuickActions } from '@/components/QuickActions';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { EmergencyContacts } from '@/components/EmergencyContacts';
import { SettingsPanel } from '@/components/SettingsPanel';
import { AlertTriangle, Phone, Camera, Mic, Monitor, MapPin } from 'lucide-react';
import { emergencyAPI, usersAPI, relationshipAPI, evidenceAPI, getCurrentUser } from '@/services/api';
import socketService from '@/services/socket';

const AdultDashboard = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeEmergencies, setActiveEmergencies] = useState<any[]>([]);
  const [riskLevel, setRiskLevel] = useState(0);
  const [audioMonitoring, setAudioMonitoring] = useState(false);

  useEffect(() => {
    // Get current user and connect to socket
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      socketService.connect(user.id);
    }

    // Fetch active emergencies
    const fetchActiveEmergencies = async () => {
      try {
        const response = await emergencyAPI.getActiveEmergencies();
        if (response.success) {
          setActiveEmergencies(response.data.emergencies);
          // Calculate risk level based on active emergencies
          const risk = response.data.emergencies.length > 0 ? 78 : 15;
          setRiskLevel(risk);
        }
      } catch (error) {
        console.error('Failed to fetch active emergencies:', error);
      }
    };

    fetchActiveEmergencies();

    // Listen for emergency alerts
    socketService.onEmergencyAlert((data) => {
      setActiveEmergencies(prev => [...prev, data]);
      setRiskLevel(78);
    });

    return () => {
      socketService.removeAllListeners();
    };
  }, []);

  const callPolice = () => {
    window.open('tel:100', '_self');
  };

  const triggerEmergency = async () => {
    if (!currentUser) return;
    
    try {
      // Get current location
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const location = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            address: 'Current Location',
            accuracy: pos.coords.accuracy
          };

          try {
            // Try the main SOS API first
            const response = await emergencyAPI.triggerEmergency({
              triggeredBy: 'Manual',
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              severity: 'Critical',
              message: 'SOS Emergency triggered by adult',
              title: 'SOS Emergency',
              description: 'Emergency triggered by adult user',
              address: 'Current Location'
            });

            if (response.success) {
              alert('Emergency sent successfully!');
            }
          } catch (primaryError) {
            console.error('Primary emergency API failed:', primaryError);
            
            // Fallback: Try relationships API for SOS notification
            try {
              const sosResponse = await relationshipAPI.sendSOSNotification({
                childName: currentUser.name,
                childLocation: location,
                message: 'SOS Emergency triggered by adult',
                severity: 'Critical'
              });
              
              if (sosResponse.success) {
                alert('SOS notification sent to parents!');
              } else {
                throw new Error('SOS notification failed');
              }
            } catch (fallbackError) {
              console.error('SOS notification fallback failed:', fallbackError);
              
              // Final fallback: Manual clipboard message
              const emergencyMessage = `🚨 EMERGENCY ALERT 🚨\n\nUser: ${currentUser.name}\nTime: ${new Date().toLocaleString()}\nLocation: ${location.latitude}, ${location.longitude}\n\nThis is an emergency. Please contact immediately!`;
              
              try {
                await navigator.clipboard.writeText(emergencyMessage);
                alert('Emergency details copied to clipboard. Share with your contacts manually.');
              } catch (clipboardError) {
                alert('Emergency triggered but all notification methods failed. Please contact emergency services manually.');
              }
            }
          }
        },
        () => {
          alert('Please enable location access to trigger emergency');
        }
      );
    } catch (error) {
      console.error('Failed to trigger emergency:', error);
      alert('Failed to trigger emergency. Please try again.');
    }
  };

  const capturePhoto = async () => {
    try {
      // Access camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to load
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      // Capture photo
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Convert to blob and upload
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
          await evidenceAPI.uploadPhoto(file);
          alert('Photo captured and saved to Evidence Locker!');
        }
        stream.getTracks().forEach(track => track.stop());
      }, 'image/jpeg');

    } catch (error) {
      console.error('Failed to capture photo:', error);
      alert('Failed to capture photo. Please ensure camera permissions are granted.');
    }
  };

  const recordAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const file = new File([audioBlob], 'audio.wav', { type: 'audio/wav' });
        await evidenceAPI.uploadAudio(file);
        alert('Audio recorded and saved to Evidence Locker!');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      alert('Recording started... Speak now. Click OK to stop recording.');
      mediaRecorder.stop();

    } catch (error) {
      console.error('Failed to record audio:', error);
      alert('Failed to record audio. Please ensure microphone permissions are granted.');
    }
  };

  const takeScreenshot = async () => {
    try {
      // Use Screen Capture API
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to load
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      // Capture screenshot
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Convert to blob and upload
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'screenshot.png', { type: 'image/png' });
          await evidenceAPI.uploadScreenshot(file);
          alert('Screenshot captured and saved to Evidence Locker!');
        }
        stream.getTracks().forEach(track => track.stop());
      }, 'image/png');

    } catch (error) {
      console.error('Failed to take screenshot:', error);
      alert('Failed to take screenshot. Please ensure screen sharing permissions are granted.');
    }
  };

  const sendLocation = async () => {
    try {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          
          // Get address using reverse geocoding (simplified)
          const address = `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          
          await evidenceAPI.saveLocation({
            latitude,
            longitude,
            address
          });
          
          alert('Location saved to Evidence Locker!');
        },
        () => {
          alert('Please enable location access to save location.');
        }
      );
    } catch (error) {
      console.error('Failed to save location:', error);
      alert('Failed to save location. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <DashboardSidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6 pl-10">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Adult Dashboard</h1>
              <p className="text-muted-foreground text-sm">AI & Manual Monitoring • Safety Control Center</p>
            </div>
            <SettingsPanel />
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {['Dashboard', 'Emergency Alert', 'Audio Monitoring', 'Evidence Capture'].map((tab, i) => (
              <button key={tab} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${i === 0 ? 'gradient-primary text-primary-foreground' : 'bg-card text-foreground shadow-depth hover:bg-secondary'}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Risk + Emergency */}
          <div className="grid lg:grid-cols-2 gap-6">
            <RiskMeter value={riskLevel} label={riskLevel > 50 ? 'Suspicious' : 'Safe'} />

            <div className="gradient-dark text-primary-foreground p-6 rounded-2xl shadow-depth">
              <h3 className="text-sm font-semibold opacity-60 uppercase tracking-wider mb-2">Emergency Status</h3>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-xs opacity-60">Status: <span className="text-primary font-bold">{activeEmergencies.length > 0 ? 'Active' : 'Monitoring'}</span></p>
                  <p className="text-xs opacity-60">Active Emergencies: {activeEmergencies.length}</p>
                </div>
              </div>
              <div className="text-5xl font-bold text-primary text-center my-6">{riskLevel}%</div>
              <p className="text-center text-sm">Threat Level: <span className={`font-bold ${riskLevel > 50 ? 'text-warning' : 'text-safe'}`}>{riskLevel > 50 ? 'Suspicious' : 'Safe'}</span></p>

              <button
                onClick={triggerEmergency}
                className="w-full mt-6 py-3 gradient-emergency text-destructive-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95"
              >
                <AlertTriangle className="w-5 h-5" /> Trigger Emergency
              </button>
              <button
                onClick={callPolice}
                className="w-full mt-2 py-3 bg-destructive text-destructive-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95"
              >
                <Phone className="w-5 h-5" /> Call Police (100)
              </button>
            </div>
          </div>

          {/* Emergency Contacts */}
          <EmergencyContacts />

          {/* Evidence Capture Section */}
          <div className="bg-card rounded-2xl shadow-depth p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Evidence Capture
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Capture and store evidence in your Evidence Locker for documentation and safety purposes.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={capturePhoto}
                className="flex flex-col items-center gap-2 p-4 bg-background rounded-xl border border-border hover:bg-secondary transition-colors"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">Capture Photo</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={recordAudio}
                className="flex flex-col items-center gap-2 p-4 bg-background rounded-xl border border-border hover:bg-secondary transition-colors"
              >
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                  <Mic className="w-5 h-5 text-accent" />
                </div>
                <span className="text-sm font-medium text-foreground">Record Audio</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={takeScreenshot}
                className="flex flex-col items-center gap-2 p-4 bg-background rounded-xl border border-border hover:bg-secondary transition-colors"
              >
                <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-warning" />
                </div>
                <span className="text-sm font-medium text-foreground">Take Screenshot</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={sendLocation}
                className="flex flex-col items-center gap-2 p-4 bg-background rounded-xl border border-border hover:bg-secondary transition-colors"
              >
                <div className="w-10 h-10 bg-safe/10 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-safe" />
                </div>
                <span className="text-sm font-medium text-foreground">Send Location</span>
              </motion.button>
            </div>
          </div>

          {/* Activity Log */}
          <ActivityLog />

          {/* Quick Actions */}
          <QuickActions />
        </div>
      </main>
      <ChatbotWidget role="adult" />
    </div>
  );
};

export default AdultDashboard;
