import { useEffect, useState, useRef } from 'react';
import { 
  User, 
  MapPin, 
  Shield, 
  Camera, 
  Mail, 
  MessageSquare, 
  Bell, 
  Lock, 
  Phone, 
  Check, 
  Volume2, 
  Hand, 
  Radio, 
  KeyRound,
  Loader2,
  Sparkles,
  Upload
} from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { motion } from 'framer-motion';
import { DashboardSidebar } from './DashboardSidebar';
import { authAPI } from '@/services/api';
import { toast } from 'sonner';

type Role = 'Adult' | 'Parent' | 'Child';

interface Profile {
  name: string;
  age: string;
  phone: string;
  address: string;
  role: Role;
  profileImage?: string;
  linkedChildren?: string[];
  linkedParent?: string;
}

const BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';

const getFullImageUrl = (fileUrl?: string) => {
  if (!fileUrl) return '';
  return fileUrl.startsWith('http') ? fileUrl : `${BASE_URL}${fileUrl}`;
};

// Curated set of fast-loading preset safety and character avatars
const PRESET_AVATARS = [
  { id: '1', name: 'Guardian Bot', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Guardian' },
  { id: '2', name: 'Hero Adventurer', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Hero' },
  { id: '3', name: 'Shield Defender', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Shield' },
  { id: '4', name: 'Tech Scout', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Scout' },
  { id: '5', name: 'Champion Star', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Champion' },
  { id: '6', name: 'Cyber Sentinel', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Sentinel' },
];

// Sleek Professional Switch Component
const ToggleSwitch = ({ 
  checked, 
  onChange, 
  disabled = false 
}: { 
  checked: boolean; 
  onChange: (val: boolean) => void; 
  disabled?: boolean;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/40 ${
      disabled 
        ? 'opacity-50 cursor-not-allowed bg-muted' 
        : checked 
          ? 'gradient-primary' 
          : 'bg-secondary border border-border'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Avatar file input ref
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Emergency settings
  const [locationSharing, setLocationSharing] = useState(false);
  const [autoAlert, setAutoAlert] = useState(false);
  const [gestureDetection, setGestureDetection] = useState(false);
  const [panicWord, setPanicWord] = useState('help');
  const [savingEmergency, setSavingEmergency] = useState(false);

  // Notifications
  const [emailNotif, setEmailNotif] = useState(false);
  const [pushNotif, setPushNotif] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const roleConfig: Record<Role, { color: string; desc: string }> = {
    Adult: { color: 'bg-primary/10 text-primary border border-primary/20', desc: 'Independent safety profile' },
    Parent: { color: 'bg-accent/10 text-accent border border-accent/20', desc: 'Family guardian profile' },
    Child: { color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20', desc: 'Protected child profile' },
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
          profileImage: user.profileImage,
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
        setPushNotif(user.notifications?.push ?? false);

      } catch (err) {
        console.error('Fetch user error:', err);
        toast.error('Failed to load profile settings');
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

  // Custom Avatar Upload Handler
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file');
      return;
    }

    try {
      setUploadingAvatar(true);
      const res = await authAPI.uploadAvatar(file);
      const newImageUrl = res.data?.profileImage || res.profileImage;

      if (newImageUrl) {
        setProfile(prev => prev ? { ...prev, profileImage: newImageUrl } : null);
        toast.success('Custom avatar uploaded successfully');
      }
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      toast.error(err.message || 'Failed to update avatar');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  // Preset Avatar Selection Handler
  const handleSelectPresetAvatar = async (avatarUrl: string) => {
    try {
      setUploadingAvatar(true);
      await authAPI.updateProfile({ profileImage: avatarUrl });
      setProfile(prev => prev ? { ...prev, profileImage: avatarUrl } : null);
      toast.success('Avatar updated successfully');
    } catch (err: any) {
      console.error('Preset avatar error:', err);
      toast.error('Failed to set avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      setSavingProfile(true);
      await authAPI.updateProfile({
        name: profile.name,
        age: profile.age ? Number(profile.age) : undefined,
      });

      toast.success('Personal profile updated');
      setEditing(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveEmergencySettings = async () => {
    try {
      setSavingEmergency(true);
      await authAPI.updateProfile({
        emergencySettings: {
          autoTriggerEnabled: locationSharing,
          voiceDetectionEnabled: autoAlert,
          gestureDetectionEnabled: gestureDetection,
          panicWord: panicWord.trim() || 'help',
        },
      });
      toast.success('Emergency settings updated');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save emergency settings');
    } finally {
      setSavingEmergency(false);
    }
  };

  const handleToggleNotification = async (type: 'email' | 'push', value: boolean) => {
    try {
      setSavingNotif(true);
      const updated = {
        email: type === 'email' ? value : emailNotif,
        sms: false,
        push: type === 'push' ? value : pushNotif,
      };

      if (type === 'email') setEmailNotif(value);
      if (type === 'push') setPushNotif(value);

      await authAPI.updateProfile({
        notifications: updated,
      });
      toast.success(`${type === 'email' ? 'Email' : 'Push'} notification settings updated`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update notification preferences');
    } finally {
      setSavingNotif(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Please enter both current and new password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    try {
      setChangingPassword(true);
      await authAPI.changePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen bg-secondary/30">
        <DashboardSidebar />
        <main className="flex-1 p-6 lg:p-8 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">Loading settings...</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <DashboardSidebar />

      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" /> Settings & Safety Profile
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage personal details, avatar, safety triggers, notifications, and credentials
            </p>
          </motion.div>
        </div>

        <div className="max-w-xl mx-auto px-2 py-4 space-y-5">

          {/* PERSONAL SETTINGS & AVATAR CARD */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="bg-card rounded-3xl shadow-depth border border-border p-6 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Personal Profile
              </h2>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${roleConfig[profile.role].color}`}>
                {profile.role}
              </span>
            </div>

            {/* Avatar Header Row */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/30 shadow-md bg-secondary flex items-center justify-center text-foreground font-bold text-2xl">
                  {profile.profileImage ? (
                    <img 
                      src={getFullImageUrl(profile.profileImage)} 
                      alt={profile.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="gradient-primary text-white w-full h-full flex items-center justify-center">
                      {profile?.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>

                {/* Custom Avatar Upload Button */}
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  title="Upload custom avatar image"
                  className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>

                <input 
                  type="file" 
                  ref={avatarInputRef} 
                  onChange={handleAvatarChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-foreground truncate">{profile.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{roleConfig[profile.role].desc}</p>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="text-xs text-primary font-medium hover:underline mt-1.5 flex items-center gap-1.5"
                >
                  <Upload className="w-3 h-3" /> Upload Custom Photo
                </button>
              </div>
            </div>

            {/* Choose Preset Avatars Row */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Choose a Preset Avatar
                </span>
                <span className="text-[11px] text-muted-foreground">Pick instant avatar</span>
              </div>

              <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-1">
                {PRESET_AVATARS.map((avatar) => {
                  const isSelected = profile.profileImage === avatar.url;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={() => handleSelectPresetAvatar(avatar.url)}
                      title={avatar.name}
                      className={`relative w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 transition-all hover:scale-105 active:scale-95 bg-secondary ${
                        isSelected 
                          ? 'border-primary ring-2 ring-primary/40 scale-105 shadow-md' 
                          : 'border-border/80 hover:border-primary/60 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={avatar.url} 
                        alt={avatar.name} 
                        className="w-full h-full object-cover" 
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary bg-card/90 rounded-full p-0.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Editable Profile Fields */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div>
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5" /> Full Name
                </label>
                {editing ? (
                  <input
                    value={profile.name}
                    onChange={e => updateField('name', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                    placeholder="Enter your name"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground bg-secondary/30 px-3.5 py-2.5 rounded-xl border border-border/40">
                    {profile.name || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5" /> Age
                </label>
                {editing ? (
                  <input
                    type="number"
                    value={profile.age}
                    onChange={e => updateField('age', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                    placeholder="Enter your age"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground bg-secondary/30 px-3.5 py-2.5 rounded-xl border border-border/40">
                    {profile.age || 'Not specified'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Phone className="w-3.5 h-3.5" /> Phone Number
                </label>
                <p className="text-sm font-medium text-foreground bg-secondary/30 px-3.5 py-2.5 rounded-xl border border-border/40">
                  {profile.phone || 'No phone attached'}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5" /> Address
                </label>
                <p className="text-sm font-medium text-foreground bg-secondary/30 px-3.5 py-2.5 rounded-xl border border-border/40">
                  {profile.address || 'GPS Live Location Sync'}
                </p>
              </div>
            </div>

            {/* Profile Action Button */}
            <div className="pt-2">
              <button 
                type="button"
                onClick={editing ? handleSaveProfile : () => setEditing(true)} 
                disabled={savingProfile}
                className="w-full py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 gradient-primary text-primary-foreground hover:opacity-90 active:scale-[0.99]"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Changes...
                  </>
                ) : editing ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Save Personal Profile
                  </>
                ) : (
                  'Edit Personal Profile'
                )}
              </button>
            </div>
          </motion.div>

          {/* EMERGENCY SETTINGS CARD */}
          <div className="bg-card rounded-3xl shadow-depth border border-border p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Radio className="w-4 h-4 text-primary" /> Emergency Triggers & Detection
              </h3>
            </div>

            <div className="divide-y divide-border/50">
              <div className="flex items-center justify-between py-3">
                <div className="pr-4">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Real-time Location Sharing
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Continuously broadcast coordinates during triggered SOS emergencies
                  </p>
                </div>
                <ToggleSwitch checked={locationSharing} onChange={setLocationSharing} />
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="pr-4">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-amber-500" /> Voice Trigger Detection
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Auto-trigger SOS alert when key distress phrases are recognized
                  </p>
                </div>
                <ToggleSwitch checked={autoAlert} onChange={setAutoAlert} />
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="pr-4">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Hand className="w-3.5 h-3.5 text-purple-500" /> Gesture & Shake Detection
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Trigger panic mode by shaking device rapidly or gesture patterns
                  </p>
                </div>
                <ToggleSwitch checked={gestureDetection} onChange={setGestureDetection} />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveEmergencySettings}
              disabled={savingEmergency}
              className="w-full py-2.5 rounded-xl font-semibold text-xs bg-secondary text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-1.5 mt-2"
            >
              {savingEmergency ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                'Save Emergency Settings'
              )}
            </button>
          </div>

          {/* NOTIFICATIONS CARD */}
          <div className="bg-card rounded-3xl shadow-depth border border-border p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Notifications & Alerts
              </h3>
            </div>

            <div className="divide-y divide-border/50">
              {/* Email Notifications */}
              <div className="flex items-center justify-between py-3">
                <div className="pr-4">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-500" /> Email Notifications
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Receive incident reports and emergency updates via email
                  </p>
                </div>
                <ToggleSwitch 
                  checked={emailNotif} 
                  disabled={savingNotif}
                  onChange={(val) => handleToggleNotification('email', val)} 
                />
              </div>

              {/* SMS Notifications - COMING SOON */}
              <div className="flex items-center justify-between py-3">
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> SMS Text Alerts
                    </p>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Instant emergency SMS broadcast to guardian mobile phones
                  </p>
                </div>
                <ToggleSwitch checked={false} disabled={true} onChange={() => {}} />
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between py-3">
                <div className="pr-4">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-purple-500" /> In-App Push Alerts
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    High-priority push notifications for real-time tracking
                  </p>
                </div>
                <ToggleSwitch 
                  checked={pushNotif} 
                  disabled={savingNotif}
                  onChange={(val) => handleToggleNotification('push', val)} 
                />
              </div>
            </div>
          </div>

          {/* PASSWORD CARD */}
          <div className="bg-card rounded-3xl shadow-depth border border-border p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Security & Password
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Current Password</label>
                <input 
                  type="password" 
                  placeholder="Enter current password" 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/30 outline-none" 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">New Password</label>
                <input 
                  type="password" 
                  placeholder="Enter new password (min. 6 characters)" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/30 outline-none" 
                />
              </div>

              <button 
                type="button"
                onClick={handleChangePassword} 
                disabled={changingPassword}
                className="w-full py-2.5 rounded-xl font-semibold text-xs bg-secondary text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-1.5 mt-2"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating Password...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" /> Update Password
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        <BottomNav />
      </main>
    </div>
  );
}
