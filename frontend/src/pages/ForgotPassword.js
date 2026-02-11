import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Zap, Mail } from 'lucide-react';
import API from '../api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Invalid email format'); return; }
    setLoading(true);
    setError('');
    try {
      await API.post('/api/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch (err) {
      const msg = err.response?.data?.detail || 'No account found with this email';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4" data-testid="forgot-password-page">
      <div className="w-full max-w-[420px] animate-fade-up">
        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-[#E2E8F0] p-8">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0D9488] to-[#14B8A6] flex items-center justify-center">
              <Zap className="text-white" size={18} />
            </div>
            <span className="text-base font-bold text-[#0F172A]">Kids In Tech</span>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#F0FDFA] flex items-center justify-center mx-auto mb-4">
                <Mail size={28} className="text-[#0D9488]" />
              </div>
              <h2 className="text-xl font-bold text-[#0F172A] mb-2">Check your email</h2>
              <p className="text-sm text-[#64748B] mb-6">We've sent a password reset link to <strong className="text-[#334155]">{email}</strong></p>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0D9488] hover:text-[#0F766E]" style={{ fontFamily: 'Space Mono' }} data-testid="back-to-login-link">
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-[22px] font-bold text-[#0F172A] mb-1.5">Forgot password?</h2>
              <p className="text-sm text-[#64748B] mb-6">Enter your email and we'll send you a reset link</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">Email address</label>
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${error ? 'border-[#EF4444] focus:ring-2 focus:ring-red-100' : 'border-[#E2E8F0] focus:border-[#0D9488] focus:ring-2 focus:ring-teal-50'}`}
                    placeholder="you@kidsintech.school" disabled={loading} data-testid="forgot-email" />
                  {error && <p className="text-xs text-[#EF4444] mt-1.5 font-medium" data-testid="forgot-error">{error}</p>}
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-[#0D9488] to-[#14B8A6] text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-teal-500/20"
                  style={{ fontFamily: 'Space Mono' }} data-testid="forgot-submit-btn">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#64748B] hover:text-[#0D9488] transition-colors" style={{ fontFamily: 'Space Mono' }} data-testid="back-to-login-link">
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
