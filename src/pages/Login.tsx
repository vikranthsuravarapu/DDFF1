import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
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
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
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
        login(data.token, data.user);
        navigate(data.user.role === 'admin' ? '/admin' : '/');
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-8">
      <div className="text-center space-y-4">
        <div className="bg-[#D4820A] w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-[#D4820A]/20">
          <Leaf className="text-white w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Welcome Back</h1>
        <p className="text-gray-500 dark:text-slate-300">Login to your Grama Ruchulu account</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm space-y-6 transition-colors">
        {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium">{error}</div>}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-white">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
              <input 
                type="email" 
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${errors.email ? 'border-red-500' : 'border-black/10 dark:border-white/10'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#D4820A]/20 outline-none transition-colors`}
                placeholder="name@example.com"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({...errors, email: undefined});
                }}
              />
              {errors.email && (
                <div className="absolute left-0 -bottom-6 text-[10px] text-red-500 font-bold animate-in fade-in slide-in-from-top-1">
                  {errors.email}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-white">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
              <input 
                type="password" 
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${errors.password ? 'border-red-500' : 'border-black/10 dark:border-white/10'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#D4820A]/20 outline-none transition-colors`}
                placeholder="••••••••"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({...errors, password: undefined});
                }}
              />
              {errors.password && (
                <div className="absolute left-0 -bottom-6 text-[10px] text-red-500 font-bold animate-in fade-in slide-in-from-top-1">
                  {errors.password}
                </div>
              )}
            </div>
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-[#D4820A] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-[#B87008] transition-all disabled:opacity-50"
        >
          <span>{loading ? 'Logging in...' : 'Login'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/5 dark:border-white/10"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-800 px-2 text-gray-500 dark:text-slate-300 transition-colors">Or continue with</span></div>
        </div>

        <button 
          type="button"
          onClick={async () => {
            const res = await fetch('/api/auth/google/url');
            const { url } = await res.json();
            window.open(url, 'google_oauth', 'width=500,height=600');
          }}
          className="w-full bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all text-gray-900 dark:text-slate-100"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
          <span>Sign in with Google</span>
        </button>

        <p className="text-center text-gray-500 dark:text-slate-300">
          Don't have an account? <Link to="/register" className="text-[#D4820A] font-bold">Register</Link>
        </p>
      </form>
    </div>
  );
}
