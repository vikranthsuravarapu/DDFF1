import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowRight, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await apiFetch(`/api/auth/verify-email?token=${token}`);
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.error);
        }
      } catch (error) {
        setStatus('error');
        setMessage('Something went wrong. Please try again later.');
      }
    };

    verifyEmail();
  }, [token, apiFetch]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-3xl border border-black/5 dark:border-white/10 shadow-xl text-center space-y-6 transition-colors">
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="w-16 h-16 text-[#D4820A] animate-spin mx-auto" />
            <h1 className="text-2xl font-bold dark:text-white">Verifying your email...</h1>
            <p className="text-gray-500 dark:text-slate-400">Please wait while we confirm your email address.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 animate-in zoom-in-95 duration-300">
            <div className="bg-green-100 dark:bg-green-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold dark:text-white">Email Verified!</h1>
            <p className="text-gray-600 dark:text-slate-300">{message}</p>
            <div className="pt-4">
              <Link 
                to="/login" 
                className="inline-flex items-center space-x-2 bg-[#D4820A] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#B87008] transition-all shadow-lg shadow-[#D4820A]/20"
              >
                <span>Login Now</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 animate-in zoom-in-95 duration-300">
            <div className="bg-red-100 dark:bg-red-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold dark:text-white">Verification Failed</h1>
            <p className="text-gray-600 dark:text-slate-300">{message}</p>
            <div className="pt-4 space-y-3">
              <Link 
                to="/login" 
                className="block w-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 py-3 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-all"
              >
                Back to Login
              </Link>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                If you think this is a mistake, please contact support.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
