import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/DashboardSidebar';
// import { MapWidget } from '@/components/MapWidget';
import { LiveMap } from '@/components/LiveMap';
import { ActivityLog } from '@/components/ActivityLog';
import { QuickActions } from '@/components/QuickActions';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { EmergencyContacts } from '@/components/EmergencyContacts';
import { SettingsPanel } from '@/components/SettingsPanel';
import { Phone } from 'lucide-react';
import { emergencyAPI, locationAPI, getCurrentUser } from '@/services/api';
import socketService from '@/services/socket';

interface SafeZone {
  name: string;
  status: 'Safe' | 'Boundary' | 'Warning';
  color: string;
}

interface Alert {
  time: string;
  msg: string;
  type: 'safe' | 'warning' | 'emergency';
}

const ParentDashboard = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [childLocation, setChildLocation] = useState<any>(null);
  const [activeEmergencies, setActiveEmergencies] = useState<any[]>([]);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([
    { name: 'Home', status: 'Safe', color: 'bg-safe' },
    { name: 'School', status: 'Safe', color: 'bg-safe' },
    { name: 'Park', status: 'Boundary', color: 'bg-warning' },
  ]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
const CHILD_ID = localStorage.getItem('childId');
  useEffect(() => {
    // Get current user and connect to socket
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      socketService.connect(user.id);
    }

    // Fetch active emergencies
    const fetchData = async () => {
      try {
        const emergenciesResponse = await emergencyAPI.getActiveEmergencies();
        if (emergenciesResponse.success) {
          setActiveEmergencies(emergenciesResponse.data.emergencies);
          
          // Create alerts from emergencies
          const emergencyAlerts = emergenciesResponse.data.emergencies.map((emergency: any) => ({
            time: new Date(emergency.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            msg: `${emergency.triggeredBy} Emergency - ${emergency.severity}`,
            type: 'emergency' as const
          }));
          
          setAlerts(emergencyAlerts);
        }

        // Get child's location (this would typically come from a specific child ID)
        // For demo purposes, we'll use a mock location
        // setChildLocation({
        //   latitude: 40.7128,
        //   longitude: -74.0060,
        //   address: 'New York, NY'
        // });
        // Replace with actual child ID (store it in parent profile ideally)
const CHILD_ID = localStorage.getItem('childId'); // or from backend
if (CHILD_ID) {
  const locationRes = await locationAPI.getCurrentLocation(CHILD_ID);
  if (locationRes.success) {
    setChildLocation(locationRes.data.location);
  }
}

      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();

    // Listen for emergency alerts
    socketService.onEmergencyAlert((data) => {
      setActiveEmergencies(prev => [...prev, data]);
      const newAlert: Alert = {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        msg: `Emergency Alert - ${data.severity}`,
        type: 'emergency'
      };
      setAlerts(prev => [newAlert, ...prev].slice(0, 10));
    });

    // Listen for location updates
    socketService.onLocationUpdate((data) => {
      
  setChildLocation(data.location); // ✅ FIXED

  // Update safe zones based on location
  updateSafeZones(data.location);
});
      
     

    return () => {
      socketService.removeAllListeners();
    };
  }, []);
useEffect(() => {
  if (!CHILD_ID) return;

  const interval = setInterval(async () => {
    const res = await locationAPI.getCurrentLocation(CHILD_ID);
    if (res.success) {
      setChildLocation(res.data.location);
    }
  }, 5000);

  return () => clearInterval(interval);
}, [CHILD_ID]);

  const updateSafeZones = (location: any) => {
    // This would normally check if child is within predefined safe zones
    // For demo, we'll just update status based on emergency state
    const hasEmergency = activeEmergencies.length > 0;
    
    setSafeZones([
      { name: 'Home', status: hasEmergency ? 'Warning' : 'Safe', color: hasEmergency ? 'bg-warning' : 'bg-safe' },
      { name: 'School', status: 'Safe', color: 'bg-safe' },
      { name: 'Park', status: 'Boundary', color: 'bg-warning' },
    ]);
  };

  const respondToEmergency = async (emergencyId: string, response: 'Help' | 'Ignore') => {
    try {
      await emergencyAPI.respondToEmergency(emergencyId, response);
      
      // Update local state
      setActiveEmergencies(prev => 
        prev.map(emergency => 
          emergency.id === emergencyId 
            ? { ...emergency, status: response === 'Help' ? 'Responded' : 'Ignored' }
            : emergency
        )
      );
    } catch (error) {
      console.error('Failed to respond to emergency:', error);
      alert('Failed to respond to emergency. Please try again.');
    }
  };

  return (
  <div className="flex min-h-screen bg-secondary/30">
    <DashboardSidebar />
    <main className="flex-1 p-6 lg:p-8 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start">
          <div>
            <div className="flex gap-2 flex-wrap mb-4">
              {['Dashboard', 'Child Location', 'Alerts', 'Settings'].map((tab, i) => (
                <button key={tab} className={`px-4 py-2 rounded-xl text-sm font-medium ${i === 0 ? 'gradient-primary text-primary-foreground' : 'bg-card text-foreground shadow-depth'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <SettingsPanel />
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* <MapWidget 
              location={childLocation?.address || 'Location Unknown'} 
              status={activeEmergencies.length > 0 ? 'Emergency' : 'Active'} 
            /> */}
            <LiveMap
  latitude={childLocation?.latitude}
  longitude={childLocation?.longitude}
  address={childLocation?.address}
  accuracy={childLocation?.accuracy}
  status={activeEmergencies.length > 0 ? 'Emergency' : 'Active'}
/>
          </div>

          <div className="space-y-6">
            {/* Safe Zones */}
            <div className="bg-card rounded-2xl shadow-depth p-4">
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <span>🛡️</span> Safe Zones
              </h3>
              <div className="space-y-2">
                {safeZones.map((z) => (
                  <div key={z.name} className="flex items-center justify-between p-2 rounded-xl bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${z.color}`} />
                      <span className="text-sm font-medium text-foreground">{z.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${z.status === 'Safe' ? 'bg-safe/10 text-safe' : 'bg-warning/10 text-warning'}`}>
                      {z.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Call */}
            <button
              onClick={() => window.open('tel:911', '_self')}
              className="w-full py-3 gradient-emergency text-destructive-foreground rounded-2xl font-bold flex items-center justify-center gap-2 shadow-depth hover:opacity-90 active:scale-95"
            >
              <Phone className="w-5 h-5" /> Emergency Call (911)
            </button>

            {/* Alerts */}
            <div className="bg-card rounded-2xl shadow-depth p-4">
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <span>🔔</span> Alerts
              </h3>
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-secondary/50">
                    <span className="text-xs font-mono text-muted-foreground">{a.time}</span>
                    <div className="w-2 h-2 rounded-full bg-safe" />
                    <span className="text-sm text-foreground">{a.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contacts */}
        <EmergencyContacts />

        <ActivityLog entries={[
          { time: '01:31', message: 'Entered Safe Zone', type: 'system' },
          { time: '12:03', message: 'Emergency Disabled', type: 'action' },
          { time: '10:20', message: 'Emergency Alert', type: 'warning' },
        ]} />

        <QuickActions />
      </div>
    </main>
    <ChatbotWidget role="parent" />
  </div>
);
}
export default ParentDashboard;
