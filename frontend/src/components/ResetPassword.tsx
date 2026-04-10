import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const apiUrl = import.meta.env.VITE_API_URL;

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

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
      <form onSubmit={handleReset} className="space-y-4 w-96">
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border rounded-xl"
        />

        <button className="w-full py-3 bg-blue-500 text-white rounded-xl">
          Reset Password
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;