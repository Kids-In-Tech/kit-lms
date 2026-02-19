import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import API from '../../api';
import { BookOpen, Clock, CheckCircle2, TrendingUp, ChevronRight, Sparkles } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  const fetchEnrollments = useCallback(() => {
    API.get('/api/enrollments').then(r => {
      setEnrollments(r.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchEnrollments();
    const interval = setInterval(fetchEnrollments, 20000);
    return () => clearInterval(interval);
  }, [fetchEnrollments]);

  const active = enrollments.filter(e => e.status !== 'completed');
  const completed = enrollments.filter(e => e.status === 'completed');
  const updated = enrollments.filter(e => {
    if (!e.course_updated_at || !e.enrolled_at) return false;
    return new Date(e.course_updated_at) > new Date(e.enrolled_at);
  });

  const tabs = [
    { key: 'active', label: t('student.activeCourses'), count: active.length, icon: TrendingUp, color: '#0D9488' },
    { key: 'completed', label: t('student.completedCourses'), count: completed.length, icon: CheckCircle2, color: '#10B981' },
    { key: 'updated', label: t('student.updatedCourses'), count: updated.length, icon: Sparkles, color: '#F97316' },
  ];

  const currentList = activeTab === 'active' ? active : activeTab === 'completed' ? completed : updated;
  const emptyMsg = activeTab === 'active' ? t('student.noActive') : activeTab === 'completed' ? t('student.noCompleted') : t('student.noUpdated');

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="student-dashboard">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Plus Jakarta Sans' }}>{t('student.myCourses')}</h1>
        <p className="text-sm text-[#64748B] mt-1">{enrollments.length} {t('courses.enrolled')}</p>
      </div>

      {enrollments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E2E8F0]" data-testid="no-courses-message">
          <BookOpen size={40} className="text-[#E2E8F0] mx-auto mb-3" />
          <p className="text-[#94A3B8] text-sm">{t('student.noCourses')}</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 bg-white rounded-xl border border-[#E2E8F0] p-1" data-testid="course-tabs">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-[#F0FDFA] text-[#0D9488] shadow-sm' : 'text-[#64748B] hover:bg-[#F8FAFC]'}`}
                data-testid={`tab-${tab.key}`}
              >
                <tab.icon size={14} style={{ color: activeTab === tab.key ? tab.color : '#94A3B8' }} />
                <span>{tab.label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-[#0D9488] text-white' : 'bg-[#F1F5F9] text-[#94A3B8]'}`} style={{ fontFamily: 'Space Mono' }}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Course Cards */}
          {currentList.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-[#E2E8F0]">
              <p className="text-sm text-[#94A3B8]">{emptyMsg}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentList.map(e => (
                <div key={e.enrollment_id}
                  className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer"
                  onClick={() => navigate(`/student/courses/${e.course_id}`)}
                  data-testid={`enrollment-card-${e.enrollment_id}`}
                >
                  <div className="h-32 bg-gradient-to-br from-[#F0FDFA] to-[#CCFBF1] relative overflow-hidden">
                    {e.course_thumbnail && <img src={e.course_thumbnail} alt="" className="w-full h-full object-cover" />}
                    <div className="absolute top-3 right-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${e.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-teal-100 text-teal-700'}`} style={{ fontFamily: 'Space Mono' }}>
                        {e.status === 'completed' ? t('student.completed') : `${Math.round(e.progress)}%`}
                      </span>
                    </div>
                    {activeTab === 'updated' && (
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700" style={{ fontFamily: 'Space Mono' }}>
                          <Sparkles size={10} className="inline mr-1" />Updated
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-[#0D9488] bg-[#F0FDFA] px-2 py-0.5 rounded">{e.course_category}</span>
                      <span className="text-xs text-[#94A3B8] capitalize">{e.course_level}</span>
                    </div>
                    <h3 className="font-semibold text-[#0F172A] mb-1 line-clamp-1" style={{ fontFamily: 'Plus Jakarta Sans' }}>{e.course_title}</h3>
                    <p className="text-xs text-[#64748B] line-clamp-2 mb-3">{e.course_description}</p>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${e.progress}%`, background: e.status === 'completed' ? '#10B981' : 'linear-gradient(to right, #0D9488, #14B8A6)' }} />
                      </div>
                      <span className="text-[10px] font-bold text-[#0D9488]" style={{ fontFamily: 'Space Mono' }}>{Math.round(e.progress)}%</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#94A3B8] flex items-center gap-1"><Clock size={10} />{e.total_lessons} {t('student.lessons')}</span>
                      <span className="text-xs font-semibold text-[#0D9488] flex items-center gap-1 group-hover:underline" style={{ fontFamily: 'Space Mono' }}>
                        {e.status === 'completed' ? t('student.reviewCourse') : t('student.continueLearning')} <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
