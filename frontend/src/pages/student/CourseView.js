import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowLeft, CheckCircle2, Circle, Play, FileText, ChevronDown, ChevronRight, Clock, Lock, Award, FileQuestion } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CourseView() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [quizzes, setQuizzes] = useState([]);
  const [certStatus, setCertStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCourseData = useCallback(() => {
    Promise.all([
      API.get(`/api/courses/${courseId}`),
      API.get('/api/enrollments', { params: { course_id: courseId } }),
      API.get('/api/quizzes', { params: { course_id: courseId } }),
      API.get(`/api/certificates/check/${courseId}`).catch(() => ({ data: null })),
    ]).then(([c, e, q, cert]) => {
      setCourse(c.data);
      const myEnrollment = e.data.find(en => en.student_id === user?.user_id);
      setEnrollment(myEnrollment);
      setQuizzes(q.data);
      setCertStatus(cert.data);
      const expanded = {};
      c.data.modules?.forEach(m => { expanded[m.module_id] = true; });
      setExpandedModules(expanded);
      const allLessons = c.data.modules?.flatMap(m => m.lessons) || [];
      const firstUncompleted = allLessons.find(l => !myEnrollment?.completed_lessons?.includes(l.lesson_id));
      setActiveLesson(firstUncompleted || allLessons[0]);
    }).catch(() => toast.error('Error loading course')).finally(() => setLoading(false));
  }, [courseId, user?.user_id, fetchCourseData]);

  // Poll for live updates
  useEffect(() => {
    fetchCourseData();
    const interval = setInterval(fetchCourseData, 20000);
    return () => clearInterval(interval);
  }, [fetchCourseData]);

  const completeLesson = async (lessonId) => {
    try {
      const res = await API.post(`/api/lessons/${lessonId}/complete`);
      setEnrollment(prev => ({
        ...prev,
        completed_lessons: [...(prev?.completed_lessons || []), lessonId],
        progress: res.data.progress
      }));
      toast.success('Lesson completed!');
      // Auto-check certificate
      API.get(`/api/certificates/check/${courseId}`).then(r => setCertStatus(r.data)).catch(() => {});
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
  };

  const isCompleted = (lessonId) => enrollment?.completed_lessons?.includes(lessonId);

  const isLocked = (lesson) => {
    if (!course || !enrollment) return false;
    const allLessons = course.modules?.flatMap(m => m.lessons) || [];
    const idx = allLessons.findIndex(l => l.lesson_id === lesson.lesson_id);
    if (idx === 0) return false;
    const prevLesson = allLessons[idx - 1];
    return prevLesson && !isCompleted(prevLesson.lesson_id);
  };

  const getNextLesson = () => {
    if (!activeLesson || !course) return null;
    const allLessons = course.modules?.flatMap(m => m.lessons) || [];
    const idx = allLessons.findIndex(l => l.lesson_id === activeLesson.lesson_id);
    return idx < allLessons.length - 1 ? allLessons[idx + 1] : null;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin" /></div>;
  if (!course) return <p>Course not found</p>;

  const nextLesson = getNextLesson();

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-7rem)] -m-6 md:-m-8" data-testid="course-view">
      {/* Sidebar */}
      <div className="w-full md:w-80 border-r border-[#E2E8F0] bg-white overflow-y-auto shrink-0">
        <div className="p-4 border-b border-[#E2E8F0]">
          <button onClick={() => navigate('/student')} className="flex items-center gap-1 text-sm text-[#0D9488] hover:underline mb-3" style={{ fontFamily: 'Space Mono' }} data-testid="back-to-dashboard"><ArrowLeft size={14} />Back</button>
          <h2 className="font-bold text-[#0F172A] text-sm leading-tight">{course.title}</h2>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#0D9488] to-[#14B8A6] rounded-full transition-all duration-500" style={{ width: `${enrollment?.progress || 0}%` }} />
            </div>
            <span className="text-xs font-bold text-[#0D9488]" style={{ fontFamily: 'Space Mono' }}>{Math.round(enrollment?.progress || 0)}%</span>
          </div>
        </div>

        <div className="py-1">
          {course.modules?.map((m, mi) => (
            <div key={m.module_id}>
              <button onClick={() => setExpandedModules(prev => ({ ...prev, [m.module_id]: !prev[m.module_id] }))} className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC] transition-colors">
                <span className="text-[13px] font-bold text-[#0F172A] text-left">{mi + 1}. {m.title}</span>
                {expandedModules[m.module_id] ? <ChevronDown size={14} className="text-[#94A3B8]" /> : <ChevronRight size={14} className="text-[#94A3B8]" />}
              </button>
              {expandedModules[m.module_id] && (
                <div className="pb-1">
                  {m.lessons?.map((l) => {
                    const locked = isLocked(l);
                    return (
                      <button key={l.lesson_id}
                        onClick={() => !locked && setActiveLesson(l)}
                        disabled={locked}
                        className={`w-full flex items-center gap-3 px-6 py-2.5 text-left transition-all ${locked ? 'opacity-40 cursor-not-allowed' : ''} ${activeLesson?.lesson_id === l.lesson_id ? 'bg-[#F0FDFA] border-r-2 border-[#0D9488]' : 'hover:bg-[#F8FAFC]'}`}
                        data-testid={`lesson-nav-${l.lesson_id}`}>
                        {locked ? <Lock size={14} className="text-[#CBD5E1] shrink-0" /> :
                          isCompleted(l.lesson_id) ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> :
                            <Circle size={14} className="text-[#CBD5E1] shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] truncate ${activeLesson?.lesson_id === l.lesson_id ? 'font-semibold text-[#0D9488]' : 'text-[#334155]'}`}>{l.title}</p>
                          <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
                            {l.type === 'video' ? <Play size={9} /> : <FileText size={9} />}
                            <span>{l.duration}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Quizzes Section */}
          {quizzes.length > 0 && (
            <div className="border-t border-[#E2E8F0] mt-2 pt-2">
              <p className="px-4 py-2 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider" style={{ fontFamily: 'Space Mono' }}>Quizzes</p>
              {quizzes.map(q => (
                <button key={q.quiz_id} onClick={() => navigate(`/student/quiz/${q.quiz_id}`)}
                  className="w-full flex items-center gap-3 px-6 py-2.5 text-left hover:bg-[#F8FAFC] transition-colors" data-testid={`quiz-link-${q.quiz_id}`}>
                  <FileQuestion size={14} className="text-[#8B5CF6] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#334155] truncate">{q.title}</p>
                    <p className="text-[11px] text-[#94A3B8]">{q.questions?.length || 0} questions</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Certificate Status */}
          {certStatus && (
            <div className="border-t border-[#E2E8F0] mt-2 p-4">
              <div className={`p-3 rounded-xl ${certStatus.eligible ? 'bg-emerald-50 border border-emerald-200' : 'bg-[#F8FAFC] border border-[#E2E8F0]'}`} data-testid="cert-status">
                <div className="flex items-center gap-2 mb-1">
                  <Award size={16} className={certStatus.eligible ? 'text-emerald-500' : 'text-[#94A3B8]'} />
                  <span className="text-xs font-bold" style={{ fontFamily: 'Space Mono', color: certStatus.eligible ? '#10B981' : '#94A3B8' }}>
                    {certStatus.eligible ? 'CERTIFICATE UNLOCKED' : 'CERTIFICATE LOCKED'}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B]">
                  Lessons: {certStatus.lessons_completed}/{certStatus.total_lessons} | Quiz avg: {certStatus.avg_quiz_score}%
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 md:p-8">
        {activeLesson ? (
          <div className="max-w-3xl mx-auto animate-fade-up" data-testid="lesson-content">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${activeLesson.type === 'video' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`} style={{ fontFamily: 'Space Mono' }}>{activeLesson.type}</span>
              <span className="flex items-center gap-1 text-xs text-[#94A3B8]"><Clock size={10} />{activeLesson.duration}</span>
            </div>
            <h1 className="text-2xl font-bold text-[#0F172A] mb-6">{activeLesson.title}</h1>

            {activeLesson.youtube_url && (
              <div className="aspect-video rounded-2xl overflow-hidden mb-6 bg-[#0F172A] shadow-lg">
                <iframe src={activeLesson.youtube_url} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={activeLesson.title} />
              </div>
            )}

            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 md:p-8 prose shadow-sm" data-testid="lesson-text-content">
              <div dangerouslySetInnerHTML={{ __html: activeLesson.content }} />
            </div>

            <div className="mt-6 flex items-center justify-between">
              {isCompleted(activeLesson.lesson_id) ? (
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-bold" style={{ fontFamily: 'Space Mono' }}>Completed</span>
                </div>
              ) : (
                <button onClick={() => completeLesson(activeLesson.lesson_id)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#0D9488] to-[#14B8A6] text-white rounded-xl font-bold text-sm active:scale-[0.97] transition-all shadow-lg shadow-teal-500/20"
                  style={{ fontFamily: 'Space Mono' }} data-testid="mark-complete-btn">
                  <CheckCircle2 size={16} />Mark as Complete
                </button>
              )}

              {nextLesson && !isLocked(nextLesson) && (
                <button onClick={() => setActiveLesson(nextLesson)}
                  className="flex items-center gap-1 text-sm font-bold text-[#0D9488] hover:underline" style={{ fontFamily: 'Space Mono' }} data-testid="next-lesson-btn">
                  Next Lesson <ChevronRight size={14} />
                </button>
              )}
              {nextLesson && isLocked(nextLesson) && (
                <span className="flex items-center gap-1 text-sm text-[#94A3B8]"><Lock size={12} />Complete this lesson to continue</span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen size={40} className="text-[#E2E8F0] mx-auto mb-3" />
            <p className="text-[#94A3B8]">Select a lesson to start learning</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BookOpen(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>;
}
