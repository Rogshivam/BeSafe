import { motion } from 'framer-motion';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CurrentDate from './Date';
import { ShieldCheck } from 'lucide-react';

const apiUrl = import.meta.env.VITE_API_URL;

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch(`${apiUrl}/auth/reset-password/${token}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (!data.success) return alert(data.message);

    alert('Password reset successful');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center justify-center py-20 px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-5xl w-full">
      <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
        
        <h1 className="text-5xl font-bold mb-4">Reset Password</h1>
        <CurrentDate />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="bg-background rounded-3xl shadow-depth p-8 relative">

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>
          <form onSubmit={handleReset} className="space-y-4 w-96">
            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl"
            />

            <button
              type="submit"
              className="w-full py-3 gradient-primary text-white rounded-xl"
              disabled={isLoading}
            >
              
              {isLoading ? 'Updating...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </motion.div>
      </div>
      </div>
    </div>
  );
};

export default ResetPassword;