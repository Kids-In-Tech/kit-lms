import React, { useState, useEffect } from 'react';
import API from '../../api';
import { Plus, Search, Edit2, Trash2, X, Clock, Target } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', course_id: '', time_limit: 15, attempts_allowed: 3, pass_mark: 70, auto_grade: true, questions: [] });
  const [qForm, setQForm] = useState({ question: '', type: 'multiple_choice', options: ['', '', '', ''], correct_answer: '' });

  const fetchData = () => {
    Promise.all([API.get('/api/quizzes'), API.get('/api/courses')])
      .then(([q, c]) => { setQuizzes(q.data); setCourses(c.data); })
      .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const openNew = () => { setForm({ title: '', course_id: courses[0]?.course_id || '', time_limit: 15, attempts_allowed: 3, pass_mark: 70, auto_grade: true, questions: [] }); setEditing(null); setShowForm(true); };
  const openEdit = (q) => { setForm({ title: q.title, course_id: q.course_id, time_limit: q.time_limit, attempts_allowed: q.attempts_allowed, pass_mark: q.pass_mark, auto_grade: q.auto_grade, questions: q.questions || [] }); setEditing(q.quiz_id); setShowForm(true); };

  const addQuestion = () => {
    if (!qForm.question || !qForm.correct_answer) return toast.error('Fill question and answer');
    const q = { ...qForm, question_id: `q_${Date.now()}`, options: qForm.type === 'true_false' ? ['True', 'False'] : qForm.options.filter(o => o) };
    setForm({ ...form, questions: [...form.questions, q] });
    setQForm({ question: '', type: 'multiple_choice', options: ['', '', '', ''], correct_answer: '' });
  };

  const removeQuestion = (idx) => setForm({ ...form, questions: form.questions.filter((_, i) => i !== idx) });

  const saveQuiz = async () => {
    try {
      if (editing) { await API.put(`/api/quizzes/${editing}`, form); toast.success('Quiz updated'); }
      else { await API.post('/api/quizzes', form); toast.success('Quiz created'); }
      setShowForm(false); fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
  };

  const deleteQuiz = async (id) => {
    if (!window.confirm('Delete this quiz?')) return;
    try { await API.delete(`/api/quizzes/${id}`); toast.success('Deleted'); fetchData(); } catch { toast.error('Error'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="quizzes-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Quizzes</h1>
          <p className="text-sm text-[#57534E] mt-1">{quizzes.length} quizzes total</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488]/90 active:scale-[0.98] transition-all" data-testid="create-quiz-btn"><Plus size={16} />New Quiz</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quizzes.map(q => {
          const course = courses.find(c => c.course_id === q.course_id);
          return (
            <div key={q.quiz_id} className="bg-white rounded-xl border border-[#E7E5E4] p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300" data-testid={`quiz-card-${q.quiz_id}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#14B8A6] bg-[#F0FDFA] px-2 py-0.5 rounded">{course?.title || 'No Course'}</span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(q)} className="p-1 rounded hover:bg-[#F5F5F4] text-[#57534E]"><Edit2 size={14} /></button>
                  <button onClick={() => deleteQuiz(q.quiz_id)} className="p-1 rounded hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 className="font-semibold text-[#1C1917] mb-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>{q.title}</h3>
              <div className="flex items-center gap-4 text-xs text-[#57534E]">
                <span className="flex items-center gap-1"><Clock size={12} />{q.time_limit} min</span>
                <span className="flex items-center gap-1"><Target size={12} />{q.pass_mark}% pass</span>
                <span>{q.questions?.length || 0} questions</span>
              </div>
              <div className="mt-3 text-xs text-[#A8A29E]">{q.attempt_count || 0} attempts</div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#E7E5E4]">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Plus Jakarta Sans' }}>{editing ? 'Edit' : 'Create'} Quiz</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-[#F5F5F4]"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">Title *</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none focus:border-[#14B8A6]" data-testid="quiz-title-input" /></div>
                <div><label className="block text-sm font-medium mb-1">Course</label><select value={form.course_id} onChange={e => setForm({...form, course_id: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none" data-testid="quiz-course-select">{courses.map(c => <option key={c.course_id} value={c.course_id}>{c.title}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm font-medium mb-1">Time (min)</label><input type="number" value={form.time_limit} onChange={e => setForm({...form, time_limit: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none" /></div>
                <div><label className="block text-sm font-medium mb-1">Attempts</label><input type="number" value={form.attempts_allowed} onChange={e => setForm({...form, attempts_allowed: parseInt(e.target.value) || 1})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none" /></div>
                <div><label className="block text-sm font-medium mb-1">Pass Mark (%)</label><input type="number" value={form.pass_mark} onChange={e => setForm({...form, pass_mark: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none" /></div>
              </div>

              <div className="border-t border-[#E7E5E4] pt-4">
                <h4 className="text-sm font-semibold mb-3">Questions ({form.questions.length})</h4>
                {form.questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-[#F5F5F4] rounded-lg mb-2">
                    <span className="text-xs font-medium text-[#14B8A6] mt-0.5">{i + 1}.</span>
                    <div className="flex-1">
                      <p className="text-sm">{q.question}</p>
                      <p className="text-xs text-[#A8A29E] mt-1">Type: {q.type} | Answer: {q.correct_answer}</p>
                    </div>
                    <button onClick={() => removeQuestion(i)} className="p-1 rounded hover:bg-red-50 text-red-400"><X size={14} /></button>
                  </div>
                ))}
                <div className="mt-3 p-3 border border-dashed border-[#E7E5E4] rounded-lg space-y-3">
                  <div><input value={qForm.question} onChange={e => setQForm({...qForm, question: e.target.value})} placeholder="Question text" className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none" data-testid="question-text-input" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={qForm.type} onChange={e => setQForm({...qForm, type: e.target.value, options: e.target.value === 'true_false' ? ['True', 'False'] : ['', '', '', '']})} className="px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none">
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True / False</option>
                    </select>
                    <input value={qForm.correct_answer} onChange={e => setQForm({...qForm, correct_answer: e.target.value})} placeholder="Correct answer" className="px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none" data-testid="correct-answer-input" />
                  </div>
                  {qForm.type === 'multiple_choice' && (
                    <div className="grid grid-cols-2 gap-2">
                      {qForm.options.map((o, i) => (
                        <input key={i} value={o} onChange={e => { const opts = [...qForm.options]; opts[i] = e.target.value; setQForm({...qForm, options: opts}); }} placeholder={`Option ${i + 1}`} className="px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none" />
                      ))}
                    </div>
                  )}
                  <button onClick={addQuestion} className="text-sm font-medium text-[#14B8A6] hover:underline" data-testid="add-question-btn">+ Add Question</button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[#E7E5E4]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[#57534E] hover:bg-[#F5F5F4] rounded-lg">Cancel</button>
              <button onClick={saveQuiz} className="px-4 py-2 text-sm text-white bg-[#0D9488] rounded-lg hover:bg-[#0D9488]/90" data-testid="save-quiz-btn">Save Quiz</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
