import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Save, Eye, EyeOff, Check, X } from 'lucide-react';
import API from '../api';
import toast from 'react-hot-toast';

const pwRules = [
  { test: (pw) => pw.length >= 6, label: 'At least 6 characters' },
  { test: (pw) => /[A-Z]/.test(pw), label: 'One uppercase letter' },
  { test: (pw) => /[0-9]/.test(pw), label: 'One number' },
];

export default function ProfileSettings() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ name: user?.name || '', bio: user?.bio || '', phone: user?.phone || '' });
  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await API.put('/api/auth/profile', profile);
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      toast.success('Profile updated');
    } catch { toast.error('Error saving profile'); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pw.newPw !== pw.confirm) return toast.error('Passwords do not match');
    if (pw.newPw.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      await API.post('/api/auth/change-password', { current_password: pw.current, new_password: pw.newPw });
      toast.success('Password changed successfully');
      setPw({ current: '', newPw: '', confirm: '' });
    } catch (e) { toast.error(e.response?.data?.detail || 'Error changing password'); }
    finally { setSaving(false); }
  };

  const strength = pwRules.filter(r => r.test(pw.newPw)).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up" data-testid="profile-settings">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Settings</h1>
        <p className="text-sm text-[#64748B] mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex gap-1 bg-white rounded-xl border border-[#E2E8F0] p-1 w-fit">
        {[{ key: 'profile', label: 'Profile', icon: User }, { key: 'security', label: 'Security', icon: Lock }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === t.key ? 'bg-[#0D9488] text-white' : 'text-[#64748B] hover:bg-[#F8FAFC]'}`}
            style={{ fontFamily: 'Space Mono' }} data-testid={`settings-tab-${t.key}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-4 pb-5 border-b border-[#F1F5F9]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F0FDFA] to-[#CCFBF1] flex items-center justify-center text-[#0D9488] text-2xl font-bold">{user?.name?.charAt(0)}</div>
            <div>
              <p className="text-lg font-bold text-[#0F172A]">{user?.name}</p>
              <p className="text-sm text-[#64748B]">{user?.email}</p>
              <span className="text-[10px] font-bold text-[#0D9488] uppercase tracking-wider" style={{ fontFamily: 'Space Mono' }}>{user?.role?.replace('_', ' ')}</span>
            </div>
          </div>
          <div><label className="block text-[12px] font-semibold text-[#334155] mb-1.5">Display Name</label><input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" data-testid="profile-name" /></div>
          <div><label className="block text-[12px] font-semibold text-[#334155] mb-1.5">Phone</label><input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" data-testid="profile-phone" /></div>
          <div><label className="block text-[12px] font-semibold text-[#334155] mb-1.5">Bio</label><textarea value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} rows={3} className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488] resize-none" data-testid="profile-bio" /></div>
          <button onClick={saveProfile} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0D9488] to-[#14B8A6] text-white rounded-xl text-sm font-bold active:scale-[0.97] disabled:opacity-50 shadow-lg shadow-teal-500/20" style={{ fontFamily: 'Space Mono' }} data-testid="save-profile-btn"><Save size={14} />{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      )}

      {tab === 'security' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5 shadow-sm">
          <h3 className="text-lg font-bold text-[#0F172A]">Change Password</h3>
          <div>
            <label className="block text-[12px] font-semibold text-[#334155] mb-1.5">Current Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={pw.current} onChange={e => setPw({...pw, current: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488] pr-10" data-testid="current-password" />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#334155] mb-1.5">New Password</label>
            <input type="password" value={pw.newPw} onChange={e => setPw({...pw, newPw: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" data-testid="new-password" />
            {pw.newPw && (
              <div className="mt-2 space-y-1">
                {pwRules.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {r.test(pw.newPw) ? <Check size={11} className="text-emerald-500" /> : <X size={11} className="text-[#CBD5E1]" />}
                    <span className={r.test(pw.newPw) ? 'text-emerald-500' : 'text-[#94A3B8]'}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#334155] mb-1.5">Confirm Password</label>
            <input type="password" value={pw.confirm} onChange={e => setPw({...pw, confirm: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" data-testid="confirm-password-input" />
            {pw.confirm && pw.confirm !== pw.newPw && <p className="text-xs text-[#EF4444] mt-1">Passwords do not match</p>}
          </div>
          <button onClick={changePassword} disabled={saving || !pw.current || !pw.newPw || pw.newPw !== pw.confirm} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0D9488] to-[#14B8A6] text-white rounded-xl text-sm font-bold disabled:opacity-50 shadow-lg shadow-teal-500/20" style={{ fontFamily: 'Space Mono' }} data-testid="change-password-btn"><Lock size={14} />{saving ? 'Updating...' : 'Update Password'}</button>
        </div>
      )}
    </div>
  );
}
