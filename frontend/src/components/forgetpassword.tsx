import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import CurrentDate from '@/components/Date';

const apiUrl = import.meta.env.VITE_API_URL;

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    try {
      const res = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Response:', text);
        throw new Error('Network error');
      }

      const data = await res.json();

      if (!data.success) {
        alert(data.message);
        return;
      }

      alert('If this email exists, a password reset link has been sent to your inbox.');
    } catch (error) {
      console.error(error);
      alert('Could not connect to server. Try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center py-20 px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-5xl w-full">

          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-5xl font-bold mb-4">Forgot Password</h1>
            <CurrentDate />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-background rounded-3xl shadow-depth p-8 relative">

              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  placeholder="user@besafe.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border bg-secondary/50"
                  disabled={isLoading}
                />

                <button
                  type="submit"
                  className="w-full py-3 gradient-primary text-white rounded-xl"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;