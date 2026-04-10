import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, User, Users, Baby, Eye, EyeOff } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import CurrentDate from '@/components/Date';
type Role = 'adult' | 'parent' | 'child';

const roles: { value: Role; label: string; icon: typeof User }[] = [
  { value: 'adult', label: 'Adult', icon: User },
  { value: 'parent', label: 'Parent', icon: Users },
  { value: 'child', label: 'Child', icon: Baby },
];
const roleMap: any = {
  adult: "Individual",
  parent: "Parent",
  child: "Child"
};
const apiUrl = import.meta.env.VITE_API_URL;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('adult');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { setRole, setUserName } = useAuth();
 const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.message);
      return;
    }

    // ✅ Save token
    localStorage.setItem("token", data.data.token);

    // ✅ Save user info
    setRole(selectedRole);
    setUserName(data.data.user.name);

    // ✅ Redirect
    navigate(`/dashboard/${selectedRole}`);

  } catch (error) {
    console.error(error);
    alert("Login failed");
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
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-4">Login Screen</h1>
            <p className="text-muted-foreground">
              <CurrentDate />
            </p>
          </motion.div>

          {/* Right - Login Card */}
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
                <p className="text-center text-sm text-muted-foreground mb-6">Login to Be-Safe</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@besafe.com"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                      required
                    />
                  </div>
                  <div className="relative">
                    <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm pr-10"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Role Selection */}
                  <div className="flex gap-2">
                    {roles.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setSelectedRole(r.value)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border
                          ${selectedRole === r.value
                            ? 'gradient-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20'
                            : 'bg-secondary/50 text-foreground border-border hover:border-primary/30'
                          }
                        `}
                      >
                        <r.icon className="w-4 h-4" />
                        {r.label}
                      </button>
                    ))}
                  </div>

                  <button type="submit" className="w-full py-3 gradient-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95">
                    Login
                  </button>
                </form>

                <div className="flex justify-between mt-4 text-xs text-muted-foreground">
                  <button
                    onClick={() => navigate('/forget-password')}
                    className="hover:text-primary"
                  >
                    Forgot password?
                  </button>
                  <button 
                    type="button"
                    className="hover:text-primary"
                    onClick={() => navigate("/register")}
                  >
                  Create an account
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

export default Login;
