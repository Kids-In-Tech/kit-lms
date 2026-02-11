import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Zap, BookOpen, Users, BarChart3, Award } from 'lucide-react';
import toast from 'react-hot-toast';

const demoScreens = [
  { title: 'Course Dashboard', desc: 'Track student progress in real-time', icon: BookOpen, color: '#0D9488' },
  { title: 'Student Management', desc: 'Manage enrollments and grades', icon: Users, color: '#8B5CF6' },
  { title: 'Analytics & Insights', desc: 'Data-driven learning outcomes', icon: BarChart3, color: '#F97316' },
  { title: 'Certificates', desc: 'Auto-issue on course completion', icon: Award, color: '#3B82F6' },
];

export default function Login() {
  const { login, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const interval = setInterval(() => setActiveDemo(p => (p + 1) % demoScreens.length), 3500);
    return () => clearInterval(interval);
  }, []);

  if (user && !user.must_reset_password) {
    navigate(user.role === 'super_admin' ? '/admin' : user.role === 'instructor' ? '/instructor' : '/student', { replace: true });
    return null;
  }

  const validate = () => {
    const e = {};
    if (!email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email format';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}!`);
      if (u.must_reset_password) {
        navigate('/reset-password', { state: { userId: u.user_id } });
      } else {
        navigate(u.role === 'super_admin' ? '/admin' : u.role === 'instructor' ? '/instructor' : '/student');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid email or password');
      setErrors({ password: 'Invalid email or password' });
    } finally {
      setLoading(false);
    }
  };

  const demo = demoScreens[activeDemo];

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-[400px] animate-fade-up">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0D9488] to-[#14B8A6] flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Zap className="text-white" size={20} />
            </div>
            <div>
              <span className="text-lg font-bold text-[#0F172A] tracking-tight">Kids In Tech</span>
              <span className="text-[10px] text-[#64748B] block -mt-0.5 font-medium tracking-wider uppercase">Learning Platform</span>
            </div>
          </div>

          <h1 className="text-[28px] font-bold text-[#0F172A] mb-1.5 tracking-tight">Welcome back</h1>
          <p className="text-[15px] text-[#64748B] mb-8 leading-relaxed">Sign in to manage or continue your learning journey</p>

          <button onClick={loginWithGoogle} className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all duration-200 mb-6 active:scale-[0.98] group" data-testid="google-login-btn" style={{ fontFamily: 'Space Mono' }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <span className="text-sm text-[#0F172A] group-hover:text-[#0D9488] transition-colors">Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#E2E8F0]" />
            <span className="text-[11px] text-[#94A3B8] uppercase tracking-widest font-semibold" style={{ fontFamily: 'Space Mono' }}>or sign in with email</span>
            <div className="flex-1 h-px bg-[#E2E8F0]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">Email address</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({...p, email: ''})); }}
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-white outline-none transition-all duration-200 ${errors.email ? 'border-[#EF4444] focus:ring-2 focus:ring-red-100' : 'border-[#E2E8F0] focus:border-[#0D9488] focus:ring-2 focus:ring-teal-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
                placeholder="you@kidsintech.school" disabled={loading} data-testid="login-email" />
              {errors.email && <p className="text-xs text-[#EF4444] mt-1.5 font-medium" data-testid="email-error">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#334155] mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password: ''})); }}
                  className={`w-full px-4 py-3 rounded-xl border text-sm bg-white outline-none transition-all duration-200 pr-11 ${errors.password ? 'border-[#EF4444] focus:ring-2 focus:ring-red-100' : 'border-[#E2E8F0] focus:border-[#0D9488] focus:ring-2 focus:ring-teal-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
                  placeholder="Enter your password" disabled={loading} data-testid="login-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors" tabIndex={-1}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-[#EF4444] mt-1.5 font-medium" data-testid="password-error">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-[13px] font-semibold text-[#0D9488] hover:text-[#0F766E] transition-colors" style={{ fontFamily: 'Space Mono' }} data-testid="forgot-password-link">Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#0D9488] to-[#14B8A6] text-white rounded-xl font-bold text-sm hover:from-[#0F766E] hover:to-[#0D9488] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20"
              style={{ fontFamily: 'Space Mono' }} data-testid="login-submit-btn">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 p-4 bg-[#F0FDFA] rounded-xl border border-[#CCFBF1]">
            <p className="text-[11px] font-bold text-[#0F766E] mb-2 uppercase tracking-wider" style={{ fontFamily: 'Space Mono' }}>Demo Credentials</p>
            <div className="space-y-1.5 text-[13px] text-[#334155]">
              <p><span className="font-semibold text-[#0D9488]">Admin:</span> admin@kidsintech.school / innovate@2025</p>
              <p><span className="font-semibold text-[#8B5CF6]">Instructor:</span> sarah@kidsintech.school / instructor123</p>
              <p><span className="font-semibold text-[#F97316]">Student:</span> liam@student.kidsintech.school / student123</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Animated Demo */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[#0F172A]">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0D9488] rounded-full blur-[120px] opacity-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#8B5CF6] rounded-full blur-[100px] opacity-15" />

        <div className="relative z-10 flex flex-col justify-center px-16 w-full">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
              <Zap className="text-[#14B8A6]" size={16} />
            </div>
            <span className="text-white/60 text-sm font-medium" style={{ fontFamily: 'Space Mono' }}>KIT LMS Platform</span>
          </div>

          <h2 className="text-[42px] font-bold text-white leading-[1.1] mb-4 tracking-tight">
            Empower the next<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14B8A6] to-[#5EEAD4]">generation of tech</span>
          </h2>
          <p className="text-[#94A3B8] text-lg mb-12 max-w-md leading-relaxed">
            A comprehensive learning management system designed for modern tech education.
          </p>

          {/* Demo Cards */}
          <div className="space-y-3">
            {demoScreens.map((screen, i) => (
              <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 cursor-default ${i === activeDemo ? 'bg-white/10 backdrop-blur-sm border border-white/10 scale-[1.02]' : 'opacity-40 hover:opacity-60'}`}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${screen.color}20` }}>
                  <screen.icon size={22} style={{ color: screen.color }} />
                </div>
                <div>
                  <p className="text-white font-semibold text-[15px]">{screen.title}</p>
                  <p className="text-[#94A3B8] text-sm">{screen.desc}</p>
                </div>
                {i === activeDemo && (
                  <div className="ml-auto w-1.5 h-8 rounded-full" style={{ backgroundColor: screen.color }} />
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-center gap-8 text-center">
            {[{ n: '500+', l: 'Students' }, { n: '50+', l: 'Courses' }, { n: '95%', l: 'Completion' }].map(s => (
              <div key={s.l}>
                <p className="text-2xl font-bold text-white">{s.n}</p>
                <p className="text-sm text-[#64748B]">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
