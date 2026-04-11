import { useEffect, useState } from 'react';
import { User, MapPin, Shield, ChevronRight, Users } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { motion } from 'framer-motion';
import { DashboardSidebar } from './DashboardSidebar';
import { authAPI } from '@/services/api';

type Role = 'Adult' | 'Parent' | 'Child';

interface Profile {
  name: string;
  age: string;
  phone: string;
  address: string;
  role: Role;
  linkedChildren?: string[];
  linkedParent?: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Emergency settings
  const [locationSharing, setLocationSharing] = useState(false);
  const [autoAlert, setAutoAlert] = useState(false);
  const [gestureDetection, setGestureDetection] = useState(false);
  const [panicWord, setPanicWord] = useState('help');

  // Notifications
  const [emailNotif, setEmailNotif] = useState(false);
  const [smsNotif, setSmsNotif] = useState(false);
  const [pushNotif, setPushNotif] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const roleConfig: Record<Role, { color: string; desc: string }> = {
    Adult: { color: 'bg-primary/10 text-primary', desc: 'Independent safety profile' },
    Parent: { color: 'bg-accent/10 text-accent', desc: 'Monitor linked children' },
    Child: { color: 'bg-yellow-500/10 text-yellow-500', desc: 'Connected to guardian' },
  };

  const mapRole = (type: string): Role => {
    if (type === 'Parent') return 'Parent';
    if (type === 'Child') return 'Child';
    return 'Adult';
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await authAPI.getCurrentUser();
        const user = res?.data?.user;

        if (!user) throw new Error('User not found');

        const role = mapRole(user.userType);

        setProfile({
          name: user.name || '',
          age: user.age?.toString() || '',
          phone: user.phone || '',
          address: user.currentLocation?.address || '',
          role,
          linkedChildren: role === 'Parent'
            ? user.emergencyContacts?.map((c: any) => c.memberId?.name || 'Unknown')
            : undefined,
          linkedParent: role === 'Child'
            ? user.emergencyContacts?.[0]?.memberId?.name || 'Unknown'
            : undefined,
        });

        setLocationSharing(user.emergencySettings?.autoTriggerEnabled ?? false);
        setAutoAlert(user.emergencySettings?.voiceDetectionEnabled ?? false);
        setGestureDetection(user.emergencySettings?.gestureDetectionEnabled ?? false);
        setPanicWord(user.emergencySettings?.panicWord ?? 'help');

        setEmailNotif(user.notifications?.email ?? false);
        setSmsNotif(user.notifications?.sms ?? false);
        setPushNotif(user.notifications?.push ?? false);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const updateField = (field: keyof Profile, value: string) => {
    if (!profile) return;
    setProfile(prev => prev && { ...prev, [field]: value });
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      await authAPI.updateProfile({
        name: profile.name,
        age: Number(profile.age),
        emergencySettings: {
          autoTriggerEnabled: locationSharing,
          voiceDetectionEnabled: autoAlert,
          gestureDetectionEnabled: gestureDetection,
          panicWord,
        },
        notifications: {
          email: emailNotif,
          sms: smsNotif,
          push: pushNotif,
        },
      });

      setEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangePassword = async () => {
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      console.error(err);
    }
  };
  if (loading || !profile) {
  return <div className="p-4"></div>;
};


  return (
     <div className="flex min-h-screen bg-secondary/30">
      <DashboardSidebar />

      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6 pl-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-bold text-foreground mb-1 ">Settings</h1>
            <p className="text-muted-foreground text-sm">Manage your safety profile</p>
          </motion.div>
          </div>
  

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* PROFILE CARD */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-xl">
              {profile?.name?.[0]}
            </div>
            <div>
              <h2 className="font-bold">{profile.name}</h2>
              <span className={`text-xs px-2 py-1 rounded ${roleConfig[profile.role].color}`}>
                {profile.role} — {roleConfig[profile.role].desc}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {[{ label: 'Name', field: 'name' as const, icon: User },
              { label: 'Age', field: 'age' as const, icon: User },
              { label: 'Phone', field: 'phone' as const, icon: User },
              { label: 'Address', field: 'address' as const, icon: MapPin }].map(item => (
              <div key={item.field}>
                {editing ? (
                  <input
                    value={profile[item.field as keyof Profile]}
                    onChange={e => updateField(item.field as keyof Profile, e.target.value)}
                    className="border-b w-full"
                  />
                ) : (
                  <p>{profile[item.field as keyof Profile]}</p>
                )}
              </div>
            ))}
          </div>

          <button onClick={editing ? handleSave : () => setEditing(true)} className="mt-4 w-full py-2 border rounded">
            {editing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </motion.div>

        {/* EMERGENCY SETTINGS */}
        <div className="bg-card p-4 rounded-2xl space-y-3">
          <h3 className="font-bold text-sm">Emergency Settings</h3>

          <div className="flex justify-between"><span>Location Sharing</span><button onClick={() => setLocationSharing(!locationSharing)}>{locationSharing ? 'ON' : 'OFF'}</button></div>
          <div className="flex justify-between"><span>Voice Detection</span><button onClick={() => setAutoAlert(!autoAlert)}>{autoAlert ? 'ON' : 'OFF'}</button></div>
          <div className="flex justify-between"><span>Gesture Detection</span><button onClick={() => setGestureDetection(!gestureDetection)}>{gestureDetection ? 'ON' : 'OFF'}</button></div>

          <input value={panicWord} onChange={e => setPanicWord(e.target.value)} className="border w-full p-2" placeholder="Panic word" />
        </div>

        {/* NOTIFICATIONS */}
        <div className="bg-card p-4 rounded-2xl space-y-3">
          <h3 className="font-bold text-sm">Notifications</h3>
          <div className="flex justify-between"><span>Email</span><button onClick={() => setEmailNotif(!emailNotif)}>{emailNotif ? 'ON' : 'OFF'}</button></div>
          <div className="flex justify-between"><span>SMS</span><button onClick={() => setSmsNotif(!smsNotif)}>{smsNotif ? 'ON' : 'OFF'}</button></div>
          <div className="flex justify-between"><span>Push</span><button onClick={() => setPushNotif(!pushNotif)}>{pushNotif ? 'ON' : 'OFF'}</button></div>
        </div>

        {/* PASSWORD */}
        <div className="bg-card p-4 rounded-2xl space-y-3">
          <h3 className="font-bold text-sm">Change Password</h3>
          <input type="password" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="border w-full p-2" />
          <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="border w-full p-2" />
          <button onClick={handleChangePassword} className="w-full py-2 border rounded">Change Password</button>
        </div>

      </div>

      <BottomNav />
      </main>
    </div>
  );
}
