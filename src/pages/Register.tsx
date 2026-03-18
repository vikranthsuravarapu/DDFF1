import React, { useState, useEffect } from 'react';
import { Mail, Lock, Phone, ArrowRight, User as UserIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referral_code: '',
    acceptTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [errors, setErrors] = useState<any>({});
  const { login, isAuthenticated, user, apiFetch } = useAuth();
  const navigate = useNavigate();
  const [googleConfig, setGoogleConfig] = useState<{
    redirect_uri: string, 
    client_id: string, 
    app_url_env: string,
    client_id_length: number,
    client_secret_length: number,
    client_secret_preview: string,
    env_keys: string[]
  } | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [testResult, setTestResult] = useState<{status: string, message: string, error?: string} | null>(null);
  const [testing, setTesting] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'delivery_boy') {
      navigate('/delivery');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { token, refreshToken, user } = event.data;
        login(token, refreshToken, user);
        navigate('/');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [login, navigate]);

  const validate = () => {
    const newErrors: any = {};
    if (!formData.name) newErrors.name = 'Full name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.acceptTerms) newErrors.acceptTerms = 'You must accept the terms and conditions';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    setError('');

    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requiresVerification) {
          setVerificationToken(data.verificationToken || '');
          setSuccess(true);
        } else {
          login(data.token, data.refreshToken, data.user);
          navigate('/');
        }
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-8 text-center">
        <div className="bg-green-100 dark:bg-green-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
          <Mail className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold dark:text-white">Check your email</h1>
          <p className="text-gray-600 dark:text-slate-300">
            We've sent a verification link to <span className="font-bold text-[#D4820A]">{formData.email}</span>.
            Please click the link in the email to verify your account.
          </p>
        </div>
        <div className="pt-6">
          {verificationToken ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-slate-400 italic">
                (Development Mode: Since email service is not fully configured, you can use the link below to verify)
              </p>
              <Link 
                to={`/verify-email?token=${verificationToken}`}
                className="inline-flex items-center space-x-2 bg-[#D4820A] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#B87008] transition-all shadow-lg shadow-[#D4820A]/20"
              >
                <span>Verify Email Directly</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          ) : (
            <Link 
              to="/login" 
              className="inline-flex items-center space-x-2 bg-[#D4820A] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#B87008] transition-all shadow-lg shadow-[#D4820A]/20"
            >
              <span>Go to Login</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Didn't receive the email? Check your spam folder or try registering again.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 space-y-8">
      <div className="text-center space-y-4">
        <div className="bg-[#D4820A] w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-[#D4820A]/20">
          <img src="/logo.svg" alt="DDFF Logo" className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Create Account</h1>
        <p className="text-gray-500 dark:text-slate-300">Join the DDFF family</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm space-y-6 transition-colors">
        {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium">{error}</div>}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-white">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
              <input 
                type="text" 
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${errors.name ? 'border-red-500' : 'border-black/10 dark:border-white/10'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#D4820A]/20 outline-none transition-colors`}
                placeholder="John Doe"
                value={formData.name}
                onChange={e => {
                  setFormData({...formData, name: e.target.value});
                  if (errors.name) setErrors({...errors, name: undefined});
                }}
              />
              {errors.name && <div className="absolute left-0 -bottom-6 text-[10px] text-red-500 font-bold">{errors.name}</div>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-white">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
              <input 
                type="email" 
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${errors.email ? 'border-red-500' : 'border-black/10 dark:border-white/10'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#D4820A]/20 outline-none transition-colors`}
                placeholder="name@example.com"
                value={formData.email}
                onChange={e => {
                  setFormData({...formData, email: e.target.value});
                  if (errors.email) setErrors({...errors, email: undefined});
                }}
              />
              {errors.email && <div className="absolute left-0 -bottom-6 text-[10px] text-red-500 font-bold">{errors.email}</div>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-white">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
              <input 
                type="tel" 
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${errors.phone ? 'border-red-500' : 'border-black/10 dark:border-white/10'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#D4820A]/20 outline-none transition-colors`}
                placeholder="+91 XXXXXXXXXX"
                value={formData.phone}
                onChange={e => {
                  setFormData({...formData, phone: e.target.value});
                  if (errors.phone) setErrors({...errors, phone: undefined});
                }}
              />
              {errors.phone && <div className="absolute left-0 -bottom-6 text-[10px] text-red-500 font-bold">{errors.phone}</div>}
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
                value={formData.password}
                onChange={e => {
                  setFormData({...formData, password: e.target.value});
                  if (errors.password) setErrors({...errors, password: undefined});
                }}
              />
              {errors.password && <div className="absolute left-0 -bottom-6 text-[10px] text-red-500 font-bold">{errors.password}</div>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-white">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
              <input 
                type="password" 
                className={`w-full pl-12 pr-4 py-4 rounded-2xl border ${errors.confirmPassword ? 'border-red-500' : 'border-black/10 dark:border-white/10'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#D4820A]/20 outline-none transition-colors`}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={e => {
                  setFormData({...formData, confirmPassword: e.target.value});
                  if (errors.confirmPassword) setErrors({...errors, confirmPassword: undefined});
                }}
              />
              {errors.confirmPassword && <div className="absolute left-0 -bottom-6 text-[10px] text-red-500 font-bold">{errors.confirmPassword}</div>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-white">Referral Code (Optional)</label>
            <div className="relative">
              <ArrowRight className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
              <input 
                type="text" 
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#D4820A]/20 outline-none transition-colors"
                placeholder="Have a referral code? Enter it here"
                value={formData.referral_code}
                onChange={e => setFormData({...formData, referral_code: e.target.value.toUpperCase()})}
              />
            </div>
          </div>

          <div className="relative">
            <label className="flex items-start space-x-3 cursor-pointer group">
              <div className="relative flex items-center mt-1">
                <input 
                  type="checkbox" 
                  className={`peer h-5 w-5 cursor-pointer appearance-none rounded border ${errors.acceptTerms ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} checked:border-[#D4820A] checked:bg-[#D4820A] transition-all`}
                  checked={formData.acceptTerms}
                  onChange={e => {
                    setFormData({...formData, acceptTerms: e.target.checked});
                    if (errors.acceptTerms) setErrors({...errors, acceptTerms: undefined});
                  }}
                />
                <svg className="absolute left-0.5 top-0.5 h-4 w-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span className="text-sm text-gray-600 dark:text-slate-300">
                I agree to the <Link to="/terms" className="text-[#D4820A] font-bold hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-[#D4820A] font-bold hover:underline">Privacy Policy</Link>
              </span>
            </label>
            {errors.acceptTerms && <div className="absolute left-8 -bottom-5 text-[10px] text-red-500 font-bold">{errors.acceptTerms}</div>}
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-[#D4820A] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-[#B87008] transition-all disabled:opacity-50"
        >
          <span>{loading ? 'Creating Account...' : 'Register'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/5 dark:border-white/10"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-800 px-2 text-gray-500 dark:text-slate-300 transition-colors">Or continue with</span></div>
        </div>

        <button 
          type="button"
          onClick={async () => {
            try {
              const res = await apiFetch('/api/auth/google/url');
              const data = await res.json();
              if (!res.ok) {
                setError(data.error || 'Failed to get Google Auth URL');
                return;
              }
              window.open(data.url, 'google_oauth', 'width=500,height=600');
            } catch (err) {
              setError('Failed to initiate Google login');
              console.error('Google Auth Error:', err);
            }
          }}
          className="w-full bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all text-gray-900 dark:text-slate-100"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
          <span>Sign up with Google</span>
        </button>

        <p className="text-center text-gray-500 dark:text-slate-300">
          Already have an account? <Link to="/login" className="text-[#D4820A] font-bold">Login</Link>
        </p>

        <div className="pt-4 text-center">
          <button 
            type="button"
            onClick={async () => {
              try {
                const res = await apiFetch('/api/auth/google/config');
                const data = await res.json();
                setGoogleConfig(data);
                setShowDebug(true);
              } catch (err) {
                console.error('Failed to fetch Google config:', err);
              }
            }}
            className="text-[10px] text-slate-400 hover:text-[#D4820A] transition-colors uppercase tracking-widest opacity-50 hover:opacity-100"
          >
            Debug Google Login
          </button>
        </div>
      </form>

      {showDebug && googleConfig && (
        <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-black/5 dark:border-white/10 space-y-4 animate-in fade-in slide-in-from-bottom-4 relative z-50">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">OAuth Debug Info</h3>
            <button onClick={() => { setShowDebug(false); setTestResult(null); }} className="text-slate-400 hover:text-slate-600 p-2">×</button>
          </div>
          
          <div className="space-y-4 text-[11px] font-mono break-all">
            <div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-slate-400">Redirect URI:</span>
                <button 
                  onClick={() => copyToClipboard(googleConfig.redirect_uri)}
                  className="text-[#D4820A] hover:underline font-bold uppercase text-[9px]"
                >
                  Copy
                </button>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-black/5 dark:border-white/10 select-all">
                {googleConfig.redirect_uri}
              </div>
              <p className="mt-1 text-slate-400 italic">Add this to "Authorized redirect URIs" in Google Console</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 block mb-1">Client ID:</span>
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-black/5 dark:border-white/10">
                  {googleConfig.client_id}
                  <div className="text-[9px] text-slate-400 mt-1">{googleConfig.client_id_length} chars</div>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Client Secret:</span>
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-black/5 dark:border-white/10">
                  {googleConfig.client_secret_preview}
                  <div className="text-[9px] text-slate-400 mt-1">{googleConfig.client_secret_length} chars</div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="button"
                disabled={testing}
                onClick={async () => {
                  setTesting(true);
                  setTestResult(null);
                  try {
                    const res = await apiFetch('/api/auth/google/test-secret');
                    const data = await res.json();
                    setTestResult({
                      status: data.status,
                      message: data.message,
                      error: data.google_error
                    });
                  } catch (err) {
                    setTestResult({ status: 'ERROR', message: 'Failed to reach server' });
                  } finally {
                    setTesting(false);
                  }
                }}
                className={`w-full py-3 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-lg active:scale-[0.98] ${
                  testing ? 'bg-slate-400' : 'bg-[#D4820A] hover:bg-[#B87008]'
                } text-white`}
              >
                {testing ? 'Testing...' : 'Test Client Secret with Google'}
              </button>
            </div>

            {testResult && (
              <div className={`p-4 rounded-xl border animate-in zoom-in-95 duration-200 ${
                testResult.status === 'FAIL' 
                  ? 'bg-red-50 border-red-100 text-red-700' 
                  : testResult.status === 'SUCCESS_OR_UNSUPPORTED'
                  ? 'bg-green-50 border-green-100 text-green-700'
                  : 'bg-slate-50 border-slate-100 text-slate-700'
              }`}>
                <div className="font-bold mb-1">{testResult.status}</div>
                <div className="text-[10px] leading-relaxed">{testResult.message}</div>
                {testResult.error && (
                  <div className="mt-2 pt-2 border-t border-current/10 text-[9px] opacity-70">
                    Google Error: {testResult.error}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 text-[9px] text-slate-400 space-y-1">
              <div><span className="font-bold">APP_URL:</span> {googleConfig.app_url_env}</div>
              <div><span className="font-bold">Detected Keys:</span> {googleConfig.env_keys.join(', ')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
