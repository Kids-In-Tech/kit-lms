import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Award, Clock, TrendingUp, ChevronRight, Play } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/api/enrollments'),
      API.get('/api/certificates'),
      API.get('/api/notifications'),
    ]).then(([e, c, n]) => {
      setEnrollments(e.data);
      setCertificates(c.data);
      setNotifications(n.data.slice(0, 3));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>;

  const activeCourses = enrollments.filter(e => e.status === 'active');
  const completedCourses = enrollments.filter(e => e.status === 'completed');
  const avgProgress = enrollments.length ? Math.round(enrollments.reduce((a, e) => a + (e.progress || 0), 0) / enrollments.length) : 0;

  return (
    <div className="space-y-8 animate-fade-in" data-testid="student-dashboard">
      <div className="bg-gradient-to-br from-[#0D9488] to-[#14B8A6] rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>Welcome back, {user?.name}!</h1>
        <p className="text-indigo-200 mb-6">Continue your learning journey</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Enrolled', value: enrollments.length, icon: BookOpen },
            { label: 'In Progress', value: activeCourses.length, icon: Play },
            { label: 'Completed', value: completedCourses.length, icon: Award },
            { label: 'Avg Progress', value: `${avgProgress}%`, icon: TrendingUp },
          ].map(s => (
            <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl p-4">
              <s.icon size={20} className="text-white/70 mb-2" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-indigo-200">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {activeCourses.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-[#1C1917] mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>Continue Learning</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCourses.map(e => (
              <div key={e.enrollment_id} onClick={() => navigate(`/student/courses/${e.course_id}`)} className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group" data-testid={`enrollment-card-${e.enrollment_id}`}>
                <div className="h-32 bg-gradient-to-br from-indigo-100 to-purple-50 relative overflow-hidden">
                  {e.course_thumbnail && <img src={e.course_thumbnail} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="p-4">
                  <span className="text-xs font-medium text-[#14B8A6] bg-[#F0FDFA] px-2 py-0.5 rounded">{e.course_category}</span>
                  <h3 className="font-semibold text-[#1C1917] mt-2 mb-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>{e.course_title}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-[#F5F5F4] rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-[#14B8A6] rounded-full transition-all" style={{ width: `${e.progress}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-[#14B8A6]">{e.progress}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#A8A29E]">
                    <span>{e.completed_lessons?.length || 0} / {e.total_lessons || 0} lessons</span>
                    <ChevronRight size={14} className="text-[#14B8A6] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {completedCourses.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-[#1C1917] mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>Completed Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {completedCourses.map(e => (
              <div key={e.enrollment_id} className="bg-white rounded-xl border border-[#E7E5E4] p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ECFDF5] flex items-center justify-center"><Award size={18} className="text-[#059669]" /></div>
                <div>
                  <p className="text-sm font-medium text-[#1C1917]">{e.course_title}</p>
                  <p className="text-xs text-[#059669]">Completed</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {enrollments.length === 0 && (
        <div className="text-center py-12">
          <BookOpen size={48} className="text-[#E7E5E4] mx-auto mb-4" />
          <p className="text-lg font-semibold text-[#1C1917]" style={{ fontFamily: 'Plus Jakarta Sans' }}>No courses yet</p>
          <p className="text-sm text-[#57534E]">Ask your admin to enroll you in courses.</p>
        </div>
      )}
    </div>
  );
}
