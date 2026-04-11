import { useState } from 'react';
import { User, MapPin, Bell, Shield, ChevronRight, Users } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { motion } from 'framer-motion';
import { DashboardSidebar } from './DashboardSidebar';

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

const defaultProfile: Profile = {
  name: 'John Doe',
  age: '35',
  phone: '+1 (555) 000-1234',
  address: '123 Safety Lane, Sheltertown',
  role: 'Parent',
  linkedChildren: ['Emma Doe', 'Liam Doe'],
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [editing, setEditing] = useState(false);
  const [locationSharing, setLocationSharing] = useState(true);
  const [autoAlert, setAutoAlert] = useState(false);

  const roleConfig: Record<Role, { color: string; desc: string }> = {
    Adult: { color: 'bg-primary/10 text-primary', desc: 'Independent safety profile' },
    Parent: { color: 'bg-accent/10 text-accent', desc: 'Monitor linked children' },
    Child: { color: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]', desc: 'Connected to parent/guardian' },
  };

  const updateField = (field: keyof Profile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
        <DashboardSidebar/>
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage your safety profile</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl shadow-depth p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
              {profile.name[0]}
            </div>
            <div>
              <h2 className="font-bold text-foreground">{profile.name}</h2>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${roleConfig[profile.role].color}`}>
                {profile.role} — {roleConfig[profile.role].desc}
              </span>
            </div>
          </div>

          {/* Role Selector */}
          <div className="flex gap-2 mb-4">
            {(['Adult', 'Parent', 'Child'] as Role[]).map(role => (
              <button
                key={role}
                onClick={() => setProfile(prev => ({
                  ...prev,
                  role,
                  linkedChildren: role === 'Parent' ? ['Emma Doe', 'Liam Doe'] : undefined,
                  linkedParent: role === 'Child' ? 'Sarah Johnson' : undefined,
                }))}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  profile.role === role
                    ? 'gradient-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Personal Details */}
          <div className="space-y-3">
            {[
              { label: 'Name', field: 'name' as const, icon: User },
              { label: 'Age', field: 'age' as const, icon: User },
              { label: 'Phone', field: 'phone' as const, icon: User },
              { label: 'Address', field: 'address' as const, icon: MapPin },
            ].map(item => (
              <div key={item.field} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{item.label}</p>
                  {editing ? (
                    <input value={profile[item.field] as string} onChange={e => updateField(item.field, e.target.value)} className="w-full text-sm text-foreground bg-transparent border-b border-primary/30 focus:outline-none py-0.5" />
                  ) : (
                    <p className="text-sm text-foreground truncate">{profile[item.field] as string}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => setEditing(!editing)} className="w-full mt-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-primary/20 text-primary hover:bg-primary/5 active:scale-[0.98]">
            {editing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </motion.div>

        {/* Linked Accounts */}
        {profile.role === 'Parent' && profile.linkedChildren && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl shadow-depth p-4">
            <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Linked Children</h3>
            {profile.linkedChildren.map(child => (
              <div key={child} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">{child[0]}</div>
                  <span className="text-sm text-foreground">{child}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </motion.div>
        )}

        {profile.role === 'Child' && profile.linkedParent && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl shadow-depth p-4">
            <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Linked Guardian</h3>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs">{profile.linkedParent[0]}</div>
              <span className="text-sm text-foreground">{profile.linkedParent}</span>
            </div>
          </motion.div>
        )}

        {/* Toggles */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl shadow-depth p-4 space-y-1">
          <h3 className="font-bold text-sm text-foreground mb-2">Features</h3>
          {[
            { label: 'Location Sharing', desc: 'Share your live location with contacts', icon: MapPin, value: locationSharing, toggle: () => setLocationSharing(!locationSharing) },
            { label: 'Emergency Auto-Alert', desc: 'Auto-send alerts when SOS triggered', icon: Bell, value: autoAlert, toggle: () => setAutoAlert(!autoAlert) },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              <button onClick={item.toggle} className={`w-11 h-6 rounded-full transition-colors relative ${item.value ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-card rounded-full shadow transition-transform ${item.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
