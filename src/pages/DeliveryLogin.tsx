import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function DeliveryLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<{email?: string, password?: string}>({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const newErrors: {email?: string, password?: string} = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format';
    if (!password) newErrors.password = 'Password is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.user.role === 'delivery_boy') {
          login(data.token, data.user);
          navigate('/delivery');
        } else {
          setError('This portal is for delivery staff only.');
        }
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="bg-slate-900 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-2xl border border-slate-700">
            <Bike className="text-[#D4820A] w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
              Staff Portal
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Delivery Personnel Authentication
            </p>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-bold flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                Staff Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input 
                  type="email" 
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${errors.email ? 'border-red-500' : 'border-slate-800'} bg-slate-950 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-[#D4820A]/20 outline-none transition-all font-mono text-sm`}
                  placeholder="staff@ddff.com"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({...errors, email: undefined});
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                Security Key
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input 
                  type="password" 
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${errors.password ? 'border-red-500' : 'border-slate-800'} bg-slate-950 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-[#D4820A]/20 outline-none transition-all font-mono text-sm`}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({...errors, password: undefined});
                  }}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#D4820A] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-[#B87008] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-[#D4820A]/20"
            >
              <span>{loading ? 'Authenticating...' : 'Enter Dashboard'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs font-bold uppercase tracking-tighter">
          Authorized Personnel Only • Secure Access
        </p>
      </div>
    </div>
  );
}
