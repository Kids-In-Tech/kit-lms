import React, { useState, useEffect } from 'react';
import API from '../../api';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Users, ClipboardList, TrendingUp } from 'lucide-react';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([API.get('/api/courses'), API.get('/api/assignments')])
      .then(([c, a]) => { setCourses(c.data); setAssignments(a.data); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>;

  const totalStudents = courses.reduce((acc, c) => acc + (c.enrollment_count || 0), 0);
  const pendingSubs = assignments.reduce((acc, a) => acc + (a.submission_count || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="instructor-dashboard">
      <div>
        <h1 className="text-2xl font-bold text-[#1C1917]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Welcome, {user?.name}</h1>
        <p className="text-sm text-[#57534E] mt-1">Your teaching overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'My Courses', value: courses.length, icon: BookOpen, color: '#0D9488', bg: '#F0FDFA' },
          { label: 'Students', value: totalStudents, icon: Users, color: '#059669', bg: '#ECFDF5' },
          { label: 'Assignments', value: assignments.length, icon: ClipboardList, color: '#D97706', bg: '#FFFBEB' },
          { label: 'Submissions', value: pendingSubs, icon: TrendingUp, color: '#14B8A6', bg: '#F5F3FF' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E7E5E4] p-5">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: s.bg }}><s.icon size={18} style={{ color: s.color }} /></div>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans' }}>{s.value}</p>
            <p className="text-xs text-[#A8A29E] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#E7E5E4] p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>My Courses</h3>
        <div className="space-y-3">
          {courses.map(c => (
            <div key={c.course_id} className="flex items-center justify-between p-4 border border-[#E7E5E4] rounded-xl hover:bg-[#FAFAF9] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#F0FDFA] flex items-center justify-center"><BookOpen size={20} className="text-[#14B8A6]" /></div>
                <div>
                  <p className="font-medium text-[#1C1917]">{c.title}</p>
                  <p className="text-xs text-[#A8A29E]">{c.lesson_count || 0} lessons · {c.enrollment_count || 0} students</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
            </div>
          ))}
          {courses.length === 0 && <p className="text-sm text-[#A8A29E]">No courses assigned yet.</p>}
        </div>
      </div>
    </div>
  );
}
