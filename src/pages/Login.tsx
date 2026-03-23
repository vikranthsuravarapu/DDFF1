import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [errors, setErrors] = useState<{email?: string, password?: string}>({});
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
  const [lockoutTime, setLockoutTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('lockout_time');
    if (saved) {
      const time = parseInt(saved);
      if (time > Date.now()) return time;
    }
    return null;
  });

  useEffect(() => {
    if (!lockoutTime) return;

    const interval = setInterval(() => {
      if (lockoutTime <= Date.now()) {
        setLockoutTime(null);
        localStorage.removeItem('lockout_time');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutTime]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil((ms - Date.now()) / 1000);
    if (totalSeconds <= 0) return '0:00';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Simple temporary feedback could be added here if needed
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
        navigate(user.role === 'admin' ? '/admin' : '/');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [login, navigate]);

  const validate = () => {
    const newErrors: {email?: string, password?: string} = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    setError('');

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.refreshToken, data.user);
        navigate(data.user.role === 'admin' ? '/admin' : '/');
      } else {
        if (res.status === 429) {
          const time = Date.now() + 15 * 60 * 1000;
          setLockoutTime(time);
          localStorage.setItem('lockout_time', time.toString());
        }
        if (data.requiresVerification) {
          setRequiresVerification(true);
          setVerificationToken(data.verificationToken || '');
          setUnverifiedEmail(data.email);
        }
        setError(data.error);
      }
    } catch (e) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMessage('');
    try {
      const res = await apiFetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverifiedEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setResendMessage('Verification email sent! Please check your inbox.');
      } else {
        setResendMessage(data.error || 'Failed to resend verification email.');
      }
    } catch (error) {
      setResendMessage('Something went wrong. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-8">
      <div className="text-center space-y-4">
        <div className="bg-[#D4820A] w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-[#D4820A]/20">
          <img src="/logo.svg" alt="DDFF Logo" className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Welcome Back</h1>
        <p className="text-gray-500 dark:text-slate-300">Login to your DDFF account</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm space-y-6 transition-colors">
        {lockoutTime && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-bold text-center animate-pulse">
            Account locked. Try again in {formatTime(lockoutTime)}
          </div>
        )}

        {error && !lockoutTime && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium space-y-3">
            <p>{error}</p>
            {requiresVerification && (
              <div className="pt-2 border-t border-red-200 dark:border-red-800 space-y-3">
                <button 
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="text-[#D4820A] font-bold hover:underline flex items-center space-x-2 disabled:opacity-50"
                >
                  {resendLoading ? 'Sending...' : 'Resend verification email'}
                </button>
                
                {verificationToken && (
                  <div className="pt-2">
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 italic mb-2">
                      (Dev Mode: Email service not configured)
                    </p>
                    <Link 
                      to={`/verify-email?token=${verificationToken}`}
                      className="text-xs bg-[#D4820A]/10 text-[#D4820A] px-3 py-1 rounded-lg font-bold hover:bg-[#D4820A]/20 transition-colors inline-block"
                    >
                      Verify Account Directly
                    </Link>
                  </div>
                )}

                {resendMessage && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-slate-400">{resendMessage}</p>
                )}
              </div>
            )}
          </div>
        )}
        
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
          disabled={loading || !!lockoutTime}
          className="w-full bg-[#D4820A] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-[#B87008] transition-all disabled:opacity-50"
        >
          <span>{loading ? 'Logging in...' : lockoutTime ? 'Locked' : 'Login'}</span>
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
          <span>Sign in with Google</span>
        </button>

        <p className="text-center text-gray-500 dark:text-slate-300">
          Don't have an account? <Link to="/register" className="text-[#D4820A] font-bold">Register</Link>
        </p>

        <div className="pt-4 text-center space-y-4">
          <Link 
            to="/delivery-login" 
            className="text-xs font-bold text-slate-400 hover:text-[#D4820A] transition-colors uppercase tracking-widest block"
          >
            Delivery Staff Login
          </Link>
          
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
