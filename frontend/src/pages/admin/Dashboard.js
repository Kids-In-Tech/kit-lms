import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { Users, BookOpen, GraduationCap, TrendingUp, Clock, Award, ClipboardList, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0D9488', '#14B8A6', '#5EEAD4', '#99F6E4', '#CCFBF1'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const fetchData = useCallback(() => {
    API.get('/api/analytics/overview').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>;
  if (!data) return <p className="text-[#57534E]">Failed to load dashboard data.</p>;

  const stats = [
    { label: t('dashboard.totalStudents'), value: data.total_students, icon: Users, color: '#0D9488', bg: '#F0FDFA' },
    { label: t('dashboard.totalInstructors'), value: data.total_instructors, icon: GraduationCap, color: '#8B5CF6', bg: '#F5F3FF' },
    { label: t('dashboard.totalCourses'), value: data.total_courses, icon: BookOpen, color: '#F97316', bg: '#FFF7ED' },
    { label: t('dashboard.activeEnrollments'), value: data.active_enrollments, icon: TrendingUp, color: '#3B82F6', bg: '#EFF6FF' },
    { label: t('dashboard.completionRate'), value: `${data.completion_rate}%`, icon: Award, color: '#10B981', bg: '#ECFDF5' },
    { label: t('dashboard.avgProgress'), value: `${data.avg_progress}%`, icon: Activity, color: '#0D9488', bg: '#F0FDFA' },
    { label: t('dashboard.pendingReviews'), value: data.pending_submissions, icon: ClipboardList, color: '#EF4444', bg: '#FEF2F2' },
    { label: t('dashboard.certificates'), value: data.total_certificates, icon: Award, color: '#8B5CF6', bg: '#F5F3FF' },
  ];

  const pieData = [
    { name: 'Active', value: data.active_enrollments },
    { name: 'Completed', value: data.completed_enrollments },
  ];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="admin-dashboard">
      <div>
        <h1 className="text-2xl font-bold text-[#1C1917]" style={{ fontFamily: 'Plus Jakarta Sans' }}>{t('dashboard.title')}</h1>
        <p className="text-sm text-[#57534E] mt-1">{t('dashboard.welcome')}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E7E5E4] p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-default" data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, '-')}`} style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.bg }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1C1917]" style={{ fontFamily: 'Plus Jakarta Sans' }}>{s.value}</p>
            <p className="text-xs text-[#A8A29E] mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl border border-[#E7E5E4] p-6">
          <h3 className="text-lg font-semibold text-[#1C1917] mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>{t('dashboard.recentActivity')}</h3>
          <div className="space-y-3">
            {data.recent_activity?.slice(0, 8).map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-[#F5F5F4] last:border-0">
                <div className="w-8 h-8 rounded-full bg-[#F0FDFA] flex items-center justify-center shrink-0">
                  <Activity size={14} className="text-[#14B8A6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1C1917]"><span className="font-medium">{a.user_name}</span> {a.action.replace('_', ' ')}</p>
                  <p className="text-xs text-[#A8A29E]">{new Date(a.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {(!data.recent_activity || data.recent_activity.length === 0) && <p className="text-sm text-[#A8A29E]">No recent activity</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E7E5E4] p-6">
          <h3 className="text-lg font-semibold text-[#1C1917] mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>{t('dashboard.enrollmentStatus')}</h3>
          {data.total_enrollments > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E7E5E4', fontSize: '13px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-[#A8A29E] text-center py-8">No enrollment data</p>}
          <div className="flex justify-center gap-6 mt-2">
            {pieData.map((p, i) => (
              <div key={p.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs text-[#57534E]">{p.name} ({p.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E7E5E4] p-6">
        <h3 className="text-lg font-semibold text-[#1C1917] mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>{t('dashboard.recentSignups')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E7E5E4]">
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-[#A8A29E] uppercase tracking-wider">Name</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-[#A8A29E] uppercase tracking-wider">Email</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-[#A8A29E] uppercase tracking-wider">Role</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-[#A8A29E] uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_signups?.map(u => (
                <tr key={u.user_id} className="border-b border-[#F5F5F4] hover:bg-[#FAFAF9] transition-colors">
                  <td className="py-2.5 px-3 font-medium">{u.name}</td>
                  <td className="py-2.5 px-3 text-[#57534E]">{u.email}</td>
                  <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : u.role === 'instructor' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{u.role}</span></td>
                  <td className="py-2.5 px-3 text-[#A8A29E]">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
