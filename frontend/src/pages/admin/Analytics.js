import React, { useState, useEffect } from 'react';
import API from '../../api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, BookOpen, TrendingUp, Award, AlertTriangle } from 'lucide-react';

const COLORS = ['#0D9488', '#14B8A6', '#818CF8', '#F59E0B', '#10B981', '#EF4444'];

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [courseData, setCourseData] = useState([]);
  const [studentData, setStudentData] = useState([]);
  const [instructorData, setInstructorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      API.get('/api/analytics/overview'),
      API.get('/api/analytics/courses'),
      API.get('/api/analytics/students'),
      API.get('/api/analytics/instructors').catch(() => ({ data: [] })),
    ]).then(([o, c, s, i]) => {
      setOverview(o.data);
      setCourseData(c.data);
      setStudentData(s.data);
      setInstructorData(i.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'courses', label: 'Courses' },
    { key: 'students', label: 'Students' },
    { key: 'instructors', label: 'Instructors' },
  ];

  const atRisk = studentData.filter(s => s.avg_progress < 30 && s.enrolled_count > 0);
  const topPerformers = [...studentData].sort((a, b) => b.avg_progress - a.avg_progress).slice(0, 5);
  const courseChartData = courseData.map(c => ({ name: c.title?.substring(0, 20), enrollments: c.total_enrollments, completion: c.completion_rate, progress: c.avg_progress }));

  return (
    <div className="space-y-6 animate-fade-in" data-testid="analytics-page">
      <div>
        <h1 className="text-2xl font-bold text-[#1C1917]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Analytics</h1>
        <p className="text-sm text-[#57534E] mt-1">Platform performance and insights</p>
      </div>

      <div className="flex gap-1 bg-white rounded-lg border border-[#E7E5E4] p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t.key ? 'bg-[#0D9488] text-white' : 'text-[#57534E] hover:bg-[#F5F5F4]'}`} data-testid={`analytics-tab-${t.key}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Students', val: overview.total_students, icon: Users, color: '#0D9488' },
              { label: 'Courses', val: overview.total_courses, icon: BookOpen, color: '#059669' },
              { label: 'Completion', val: `${overview.completion_rate}%`, icon: TrendingUp, color: '#D97706' },
              { label: 'Certificates', val: overview.total_certificates, icon: Award, color: '#14B8A6' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-[#E7E5E4] p-5">
                <s.icon size={20} style={{ color: s.color }} className="mb-2" />
                <p className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans' }}>{s.val}</p>
                <p className="text-xs text-[#A8A29E] mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6">
              <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>Course Enrollments</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={courseChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E7E5E4', fontSize: '12px' }} />
                  <Bar dataKey="enrollments" fill="#0D9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6">
              <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>Completion Rate by Course</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={courseChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E7E5E4', fontSize: '12px' }} />
                  <Bar dataKey="completion" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {atRisk.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-3"><AlertTriangle size={16} />Students at Risk</h3>
              <div className="space-y-2">
                {atRisk.slice(0, 5).map(s => (
                  <div key={s.user_id} className="flex items-center justify-between text-sm">
                    <span className="text-amber-900">{s.name}</span>
                    <span className="text-amber-600">{s.avg_progress}% avg progress</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'courses' && (
        <div className="space-y-4">
          {courseData.map(c => (
            <div key={c.course_id} className="bg-white rounded-xl border border-[#E7E5E4] p-5" data-testid={`course-analytics-${c.course_id}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans' }}>{c.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><p className="text-xl font-bold text-[#0D9488]">{c.total_enrollments}</p><p className="text-xs text-[#A8A29E]">Enrolled</p></div>
                <div><p className="text-xl font-bold text-[#059669]">{c.completion_rate}%</p><p className="text-xs text-[#A8A29E]">Completion</p></div>
                <div><p className="text-xl font-bold text-[#D97706]">{c.avg_progress}%</p><p className="text-xs text-[#A8A29E]">Avg Progress</p></div>
                <div><p className="text-xl font-bold text-[#14B8A6]">{c.lesson_count}</p><p className="text-xs text-[#A8A29E]">Lessons</p></div>
              </div>
              <div className="mt-3 bg-[#F5F5F4] rounded-full h-2 overflow-hidden">
                <div className="h-full bg-[#14B8A6] rounded-full transition-all" style={{ width: `${c.avg_progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'students' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-[#E7E5E4] p-6">
            <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>Top Performers</h3>
            <div className="space-y-3">
              {topPerformers.map((s, i) => (
                <div key={s.user_id} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[#14B8A6] w-6">#{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <div className="flex gap-3 text-xs text-[#A8A29E]">
                      <span>{s.enrolled_count} courses</span>
                      <span>{s.completed_courses} completed</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#0D9488]">{s.avg_progress}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#E7E5E4] bg-[#F5F5F4]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#A8A29E] uppercase">Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#A8A29E] uppercase">Courses</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#A8A29E] uppercase">Progress</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#A8A29E] uppercase">Quizzes</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#A8A29E] uppercase">Last Active</th>
              </tr></thead>
              <tbody>
                {studentData.map(s => (
                  <tr key={s.user_id} className="border-b border-[#F5F5F4] hover:bg-[#FAFAF9]">
                    <td className="py-3 px-4 font-medium">{s.name}</td>
                    <td className="py-3 px-4">{s.enrolled_count}</td>
                    <td className="py-3 px-4"><div className="flex items-center gap-2"><div className="w-16 bg-[#F5F5F4] rounded-full h-1.5"><div className="h-full bg-[#14B8A6] rounded-full" style={{ width: `${s.avg_progress}%` }} /></div><span className="text-xs">{s.avg_progress}%</span></div></td>
                    <td className="py-3 px-4">{s.quiz_attempts}</td>
                    <td className="py-3 px-4 text-[#A8A29E] text-xs">{s.last_active ? new Date(s.last_active).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'instructors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {instructorData.map(i => (
            <div key={i.user_id} className="bg-white rounded-xl border border-[#E7E5E4] p-5" data-testid={`instructor-analytics-${i.user_id}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#F0FDFA] flex items-center justify-center text-[#14B8A6] font-bold">{i.name?.charAt(0)}</div>
                <div><p className="font-semibold" style={{ fontFamily: 'Plus Jakarta Sans' }}>{i.name}</p><p className="text-xs text-[#A8A29E]">{i.email}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-[#F5F5F4] rounded-lg"><p className="text-lg font-bold text-[#0D9488]">{i.course_count}</p><p className="text-xs text-[#A8A29E]">Courses</p></div>
                <div className="text-center p-2 bg-[#F5F5F4] rounded-lg"><p className="text-lg font-bold text-[#059669]">{i.total_students}</p><p className="text-xs text-[#A8A29E]">Students</p></div>
                <div className="text-center p-2 bg-[#F5F5F4] rounded-lg"><p className="text-lg font-bold text-[#D97706]">{i.graded_submissions}</p><p className="text-xs text-[#A8A29E]">Graded</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
