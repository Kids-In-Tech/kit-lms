import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Zap, Eye, EyeOff, Check, X, ShieldCheck } from 'lucide-react';
import API from '../api';
import toast from 'react-hot-toast';

const rules = [
  { test: (pw) => pw.length >= 6, label: 'At least 6 characters' },
  { test: (pw) => /[A-Z]/.test(pw), label: 'One uppercase letter' },
  { test: (pw) => /[0-9]/.test(pw), label: 'One number' },
];

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = location.state?.userId || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = rules.filter(r => r.test(password)).length;
  const strengthLabel = strength === 0 ? '' : strength === 1 ? 'Weak' : strength === 2 ? 'Fair' : 'Strong';
  const strengthColor = strength === 1 ? '#EF4444' : strength === 2 ? '#F59E0B' : strength === 3 ? '#10B981' : '#E2E8F0';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (strength < 2) { setError('Password is too weak'); return; }
    setLoading(true);
    setError('');
    try {
      await API.post('/api/auth/reset-password', { user_id: userId, password });
      setSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error resetting password');
      toast.error('Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4" data-testid="reset-password-page">
      <div className="w-full max-w-[420px] animate-fade-up">
        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-[#E2E8F0] p-8">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0D9488] to-[#14B8A6] flex items-center justify-center">
              <Zap className="text-white" size={18} />
            </div>
            <span className="text-base font-bold text-[#0F172A]">Kids In Tech</span>
          </div>

          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-[#F0FDFA] flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={28} className="text-[#0D9488]" />
              </div>
              <h2 className="text-xl font-bold text-[#0F172A] mb-2">Password Updated!</h2>
              <p className="text-sm text-[#64748B]">Redirecting to sign in...</p>
            </div>
          ) : (
            <>
              <h2 className="text-[22px] font-bold text-[#0F172A] mb-1.5">Set new password</h2>
              <p className="text-sm text-[#64748B] mb-6">Create a strong password for your account</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">New Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-teal-50 pr-11"
                      placeholder="Create password" data-testid="reset-password-input" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-3">
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex-1 h-1.5 rounded-full transition-all" style={{ backgroundColor: i <= strength ? strengthColor : '#E2E8F0' }} />
                        ))}
                      </div>
                      <p className="text-xs font-medium mb-2" style={{ color: strengthColor, fontFamily: 'Space Mono' }}>{strengthLabel}</p>
                      <div className="space-y-1">
                        {rules.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            {r.test(password) ? <Check size={12} className="text-[#10B981]" /> : <X size={12} className="text-[#CBD5E1]" />}
                            <span className={r.test(password) ? 'text-[#10B981]' : 'text-[#94A3B8]'}>{r.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">Confirm Password</label>
                  <input type="password" value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(''); }}
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${confirm && confirm !== password ? 'border-[#EF4444]' : 'border-[#E2E8F0] focus:border-[#0D9488] focus:ring-2 focus:ring-teal-50'}`}
                    placeholder="Confirm your password" data-testid="reset-confirm-input" />
                  {confirm && confirm !== password && <p className="text-xs text-[#EF4444] mt-1.5">Passwords do not match</p>}
                </div>

                {error && <p className="text-xs text-[#EF4444] font-medium p-3 bg-red-50 rounded-lg" data-testid="reset-error">{error}</p>}

                <button type="submit" disabled={loading || !password || password !== confirm}
                  className="w-full py-3 bg-gradient-to-r from-[#0D9488] to-[#14B8A6] text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-teal-500/20"
                  style={{ fontFamily: 'Space Mono' }} data-testid="reset-submit-btn">
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm font-semibold text-[#64748B] hover:text-[#0D9488]" style={{ fontFamily: 'Space Mono' }}>Back to Sign In</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
