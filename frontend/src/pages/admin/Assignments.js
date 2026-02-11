import React, { useState, useEffect } from 'react';
import API from '../../api';
import { Plus, Trash2, Edit2, X, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showSubs, setShowSubs] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', course_id: '', due_date: '', max_score: 100, allow_file_upload: true, allow_text_submission: true, allow_resubmission: false });

  const fetchData = () => {
    Promise.all([API.get('/api/assignments'), API.get('/api/courses')])
      .then(([a, c]) => { setAssignments(a.data); setCourses(c.data); })
      .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const openNew = () => { setForm({ title: '', description: '', course_id: courses[0]?.course_id || '', due_date: '', max_score: 100, allow_file_upload: true, allow_text_submission: true, allow_resubmission: false }); setEditing(null); setShowForm(true); };
  const openEdit = (a) => { setForm({ title: a.title, description: a.description, course_id: a.course_id, due_date: a.due_date?.split('T')[0] || '', max_score: a.max_score, allow_file_upload: a.allow_file_upload, allow_text_submission: a.allow_text_submission, allow_resubmission: a.allow_resubmission }); setEditing(a.assignment_id); setShowForm(true); };

  const saveAssignment = async () => {
    try {
      if (editing) { await API.put(`/api/assignments/${editing}`, form); toast.success('Updated'); }
      else { await API.post('/api/assignments', form); toast.success('Created'); }
      setShowForm(false); fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
  };

  const deleteAssignment = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await API.delete(`/api/assignments/${id}`); toast.success('Deleted'); fetchData(); } catch { toast.error('Error'); }
  };

  const viewSubmissions = async (assignmentId) => {
    try {
      const res = await API.get('/api/submissions', { params: { assignment_id: assignmentId } });
      setSubmissions(res.data);
      setShowSubs(assignmentId);
    } catch { toast.error('Error loading submissions'); }
  };

  const gradeSubmission = async (subId, grade, feedback) => {
    try {
      await API.put(`/api/submissions/${subId}/grade`, { grade, feedback });
      viewSubmissions(showSubs);
      toast.success('Graded');
    } catch { toast.error('Error grading'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="assignments-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Assignments</h1>
          <p className="text-sm text-[#57534E] mt-1">{assignments.length} assignments total</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488]/90 active:scale-[0.98] transition-all" data-testid="create-assignment-btn"><Plus size={16} />New Assignment</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assignments.map(a => {
          const course = courses.find(c => c.course_id === a.course_id);
          return (
            <div key={a.assignment_id} className="bg-white rounded-xl border border-[#E7E5E4] p-5 hover:shadow-md transition-all duration-300" data-testid={`assignment-card-${a.assignment_id}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-medium text-[#14B8A6] bg-[#F0FDFA] px-2 py-0.5 rounded">{course?.title || 'No Course'}</span>
                  <h3 className="font-semibold text-[#1C1917] mt-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>{a.title}</h3>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(a)} className="p-1 rounded hover:bg-[#F5F5F4] text-[#57534E]"><Edit2 size={14} /></button>
                  <button onClick={() => deleteAssignment(a.assignment_id)} className="p-1 rounded hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-xs text-[#57534E] mb-3 line-clamp-2">{a.description}</p>
              <div className="flex items-center gap-4 text-xs text-[#A8A29E]">
                {a.due_date && <span className="flex items-center gap-1"><Calendar size={12} />Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                <span className="flex items-center gap-1"><FileText size={12} />{a.submission_count || 0} submissions</span>
              </div>
              <button onClick={() => viewSubmissions(a.assignment_id)} className="mt-3 text-xs font-medium text-[#14B8A6] hover:underline" data-testid={`view-subs-${a.assignment_id}`}>View Submissions</button>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#E7E5E4]">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Plus Jakarta Sans' }}>{editing ? 'Edit' : 'Create'} Assignment</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-[#F5F5F4]"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Title *</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none focus:border-[#14B8A6]" data-testid="assignment-title-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none resize-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">Course</label><select value={form.course_id} onChange={e => setForm({...form, course_id: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none">{courses.map(c => <option key={c.course_id} value={c.course_id}>{c.title}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Due Date</label><input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Max Score</label><input type="number" value={form.max_score} onChange={e => setForm({...form, max_score: parseInt(e.target.value) || 100})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none" /></div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allow_file_upload} onChange={e => setForm({...form, allow_file_upload: e.target.checked})} className="rounded" />Allow file upload</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allow_text_submission} onChange={e => setForm({...form, allow_text_submission: e.target.checked})} className="rounded" />Allow text submission</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allow_resubmission} onChange={e => setForm({...form, allow_resubmission: e.target.checked})} className="rounded" />Allow resubmission</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[#E7E5E4]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[#57534E] rounded-lg hover:bg-[#F5F5F4]">Cancel</button>
              <button onClick={saveAssignment} className="px-4 py-2 text-sm text-white bg-[#0D9488] rounded-lg" data-testid="save-assignment-btn">Save</button>
            </div>
          </div>
        </div>
      )}

      {showSubs && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowSubs(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#E7E5E4]">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Plus Jakarta Sans' }}>Submissions</h3>
              <button onClick={() => setShowSubs(null)} className="p-1 rounded hover:bg-[#F5F5F4]"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              {submissions.map(s => (
                <div key={s.submission_id} className="border border-[#E7E5E4] rounded-lg p-4" data-testid={`submission-${s.submission_id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{s.student_name}</p>
                    <span className="text-xs text-[#A8A29E]">{new Date(s.submitted_at).toLocaleString()}</span>
                  </div>
                  {s.content && <p className="text-sm text-[#57534E] mb-2">{s.content}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    {s.grade !== null ? (
                      <span className="text-sm font-semibold text-[#059669]">Grade: {s.grade}</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input type="number" id={`grade-${s.submission_id}`} placeholder="Grade" className="w-20 px-2 py-1 rounded border border-[#E7E5E4] text-sm" data-testid={`grade-input-${s.submission_id}`} />
                        <button onClick={() => { const g = document.getElementById(`grade-${s.submission_id}`).value; gradeSubmission(s.submission_id, parseInt(g), 'Graded'); }} className="px-3 py-1 text-xs bg-[#0D9488] text-white rounded-lg" data-testid={`grade-btn-${s.submission_id}`}>Grade</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {submissions.length === 0 && <p className="text-sm text-[#A8A29E] text-center py-4">No submissions yet</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
