import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import CurrentDate from '@/components/Date';

const apiUrl = import.meta.env.VITE_API_URL;

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const navigate = useNavigate();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${apiUrl}/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message);
        return;
      }

      alert('Password changed successfully');
      navigate('/');
    } catch (error) {
      console.error(error);
      alert('Failed to change password');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center py-20 px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-5xl w-full">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-4">
              Change Password
            </h1>
            <p className="text-muted-foreground">
              <CurrentDate />
            </p>
          </motion.div>

          {/* Right - Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-background rounded-3xl shadow-depth p-8 relative overflow-hidden">
              {/* Decorative blobs */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />

              <div className="relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                    <ShieldCheck className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground mb-6">
                  Update your password
                </p>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Current Password */}
                  <div className="relative">
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Current Password
                    </label>
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-9 text-muted-foreground"
                    >
                      {showCurrent ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* New Password */}
                  <div className="relative">
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      New Password
                    </label>
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-9 text-muted-foreground"
                    >
                      {showNew ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 gradient-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95"
                  >
                    Change Password
                  </button>
                </form>

                <div className="flex justify-between mt-4 text-xs text-muted-foreground">
                  <button
                    className="hover:text-primary"
                    onClick={() => navigate('/')}
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
