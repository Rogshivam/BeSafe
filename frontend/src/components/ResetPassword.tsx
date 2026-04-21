import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CurrentDate from './Date';
import { ShieldCheck, Eye, EyeOff, Check, X } from 'lucide-react';
import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Validate token on component mount
  useEffect(() => {
    if (!token) {
      setError('Invalid reset link');
      return;
    }
    setTokenValid(true);
  }, [token]);

  const validatePassword = () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    setError('');
    return true;
  };

  const testToken = async () => {
    if (!token) return;
    
    try {
      const res = await axios.get(`${apiUrl}/auth/debug/reset-test/${token}`);
      // console.log('Token test result:', res.data);
      alert(`Token valid: ${res.data.success}\nUser: ${res.data.debug?.user?.email || 'Not found'}`);
    } catch (error) {
      console.error('Token test error:', error);
      alert('Token test failed - check console');
    }
  };

  const verifyPasswordUpdate = async () => {
    if (!password) {
      alert('Please enter a password first');
      return;
    }

    // Get email from token validation
    try {
      const tokenRes = await axios.get(`${apiUrl}/auth/debug/reset-test/${token}`);
      if (tokenRes.data.success && tokenRes.data.debug?.user?.email) {
        const email = tokenRes.data.debug.user.email;
        
        const verifyRes = await axios.post(`${apiUrl}/auth/debug/verify-password`, {
          email,
          password
        });
        
        // console.log('Password verification result:', verifyRes.data);
        alert(`Password verification: ${verifyRes.data.message}\nUser: ${verifyRes.data.debug?.userName}\nLast Active: ${verifyRes.data.debug?.lastActive ? new Date(verifyRes.data.debug.lastActive).toLocaleString() : 'Never'}`);
      } else {
        alert('Cannot verify password - invalid token');
      }
    } catch (error) {
      console.error('Password verification error:', error);
      alert('Password verification failed - check console');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);

    try {
      // Use direct axios call to avoid API interceptor
      const res = await axios.put(`${apiUrl}/auth/reset-password/${token}`, 
        { password },
        { 
          headers: { 'Content-Type': 'application/json' },
          withCredentials: false // Don't send credentials for password reset
        }
      );

      if (!res.data.success) {
        setError(res.data.message || 'Failed to reset password');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error: any) {
      console.error('Reset password error:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center justify-center py-20 px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-5xl w-full">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-5xl font-bold mb-4">Reset Password</h1>
            <CurrentDate />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-card rounded-3xl shadow-depth p-8 relative">
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded relative mb-4">
                  <span className="block sm:inline">{error}</span>
                </div>
              )}
              {success && (
                <div className="bg-safe/10 border border-safe/30 text-safe px-4 py-3 rounded relative mb-4">
                  <span className="block sm:inline">Password reset successful!</span>
                </div>
              )}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              {/* Debug buttons for testing */}
              <div className="mb-4 text-center space-y-2">
                <button
                  type="button"
                  onClick={testToken}
                  className="text-xs text-muted-foreground hover:text-primary underline"
                >
                  Debug: Test Token
                </button>
                <br />
                <button
                  type="button"
                  onClick={verifyPasswordUpdate}
                  className="text-xs text-muted-foreground hover:text-primary underline"
                >
                  Debug: Verify Password (After Reset)
                </button>
              </div>
              <form onSubmit={handleReset} className="space-y-4 w-96">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 gradient-primary text-primary-foreground rounded-xl font-medium shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95"
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