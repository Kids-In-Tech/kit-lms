import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Plus, Search, Edit2, Trash2, Eye, X, ChevronRight, GripVertical } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import RichTextEditor from '../../components/RichTextEditor';
import toast from 'react-hot-toast';

const CATEGORIES = ['Development', 'Data Science', 'Design', 'Marketing', 'Business', 'General'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];

export default function Courses() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showBuilder, setShowBuilder] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'General', level: 'beginner', duration_weeks: 4, status: 'draft', visibility: 'public', prerequisites: '', certificate_enabled: false, instructor_ids: [], thumbnail: '' });
  const [instructors, setInstructors] = useState([]);
  const [modules, setModules] = useState([]);
  const [lessonForm, setLessonForm] = useState(null);
  const [moduleForm, setModuleForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);

  const fetchCourses = () => {
    API.get('/api/courses', { params: { search: search || undefined } }).then(r => setCourses(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchCourses(); }, [search]);
  useEffect(() => {
    if (user?.role === 'super_admin') {
      API.get('/api/users', { params: { role: 'instructor' } }).then(r => setInstructors(r.data)).catch(() => {});
    }
  }, []);

  const openEdit = (c) => { setForm({ title: c.title, description: c.description, category: c.category, level: c.level, duration_weeks: c.duration_weeks, status: c.status, visibility: c.visibility, prerequisites: c.prerequisites || '', certificate_enabled: c.certificate_enabled, instructor_ids: c.instructor_ids || [], thumbnail: c.thumbnail || '' }); setEditing(c.course_id); setShowForm(true); };
  const openNew = () => { setForm({ title: '', description: '', category: 'General', level: 'beginner', duration_weeks: 4, status: 'draft', visibility: 'public', prerequisites: '', certificate_enabled: false, instructor_ids: [], thumbnail: '' }); setEditing(null); setShowForm(true); };

  const saveCourse = async () => {
    try {
      if (editing) { await API.put(`/api/courses/${editing}`, form); toast.success('Course updated'); }
      else { await API.post('/api/courses', form); toast.success('Course created'); }
      setShowForm(false); fetchCourses();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error saving course'); }
  };

  const deleteCourse = async (id) => {
    try { await API.delete(`/api/courses/${id}`); toast.success('Course deleted'); fetchCourses(); } catch { toast.error('Error deleting'); }
    setConfirmDelete(null);
  };

  const openBuilder = async (courseId) => {
    try {
      const res = await API.get(`/api/courses/${courseId}/modules`);
      setModules(res.data);
      setShowBuilder(courseId);
    } catch { toast.error('Error loading modules'); }
  };

  const addModule = async () => {
    if (!moduleForm?.title) return;
    try {
      await API.post(`/api/courses/${showBuilder}/modules`, moduleForm);
      const res = await API.get(`/api/courses/${showBuilder}/modules`);
      setModules(res.data);
      setModuleForm(null);
      toast.success('Module added');
    } catch { toast.error('Error adding module'); }
  };

  const deleteModule = async (moduleId) => {
    try {
      await API.delete(`/api/modules/${moduleId}`);
      setModules(modules.filter(m => m.module_id !== moduleId));
      toast.success('Module deleted');
    } catch { toast.error('Error deleting module'); }
  };

  const addLesson = async (moduleId) => {
    if (!lessonForm?.title) return;
    try {
      await API.post(`/api/modules/${moduleId}/lessons`, lessonForm);
      const res = await API.get(`/api/courses/${showBuilder}/modules`);
      setModules(res.data);
      setLessonForm(null);
      toast.success('Lesson added');
    } catch { toast.error('Error adding lesson'); }
  };

  const deleteLesson = async (lessonId) => {
    try {
      await API.delete(`/api/lessons/${lessonId}`);
      const res = await API.get(`/api/courses/${showBuilder}/modules`);
      setModules(res.data);
      toast.success('Lesson deleted');
    } catch { toast.error('Error deleting lesson'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="courses-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Courses</h1>
          <p className="text-sm text-[#57534E] mt-1">{courses.length} courses total</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488]/90 active:scale-[0.98] transition-all" data-testid="create-course-btn"><Plus size={16} />New Course</button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..." className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white border border-[#E7E5E4] text-sm focus:border-[#14B8A6] outline-none" data-testid="course-search" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(c => (
          <div key={c.course_id} className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group" data-testid={`course-card-${c.course_id}`}>
            <div className="h-36 bg-gradient-to-br from-indigo-100 to-purple-50 relative overflow-hidden">
              {c.thumbnail && <img src={c.thumbnail} alt="" className="w-full h-full object-cover" />}
              <div className="absolute top-3 right-3 flex gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-[#14B8A6] bg-[#F0FDFA] px-2 py-0.5 rounded">{c.category}</span>
                <span className="text-xs text-[#A8A29E] capitalize">{c.level}</span>
              </div>
              <h3 className="font-semibold text-[#1C1917] mb-1 line-clamp-1" style={{ fontFamily: 'Plus Jakarta Sans' }}>{c.title}</h3>
              <p className="text-xs text-[#57534E] line-clamp-2 mb-3">{c.description}</p>
              <div className="flex items-center justify-between text-xs text-[#A8A29E]">
                <span>{c.module_count || 0} modules · {c.lesson_count || 0} lessons</span>
                <span>{c.enrollment_count || 0} enrolled</span>
              </div>
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#F5F5F4]">
                <button onClick={() => openBuilder(c.course_id)} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-[#14B8A6] bg-[#F0FDFA] rounded-lg hover:bg-[#CCFBF1] transition-colors" data-testid={`manage-course-${c.course_id}`}><Eye size={12} />Manage</button>
                <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#57534E] transition-colors" data-testid={`edit-course-${c.course_id}`}><Edit2 size={14} /></button>
                {user?.role === 'super_admin' && <button onClick={() => setConfirmDelete(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" data-testid={`delete-course-${c.course_id}`}><Trash2 size={14} /></button>}
              </div>
            </div>
          </div>
        ))}
        {courses.length === 0 && <div className="col-span-full text-center py-12 text-[#A8A29E]">No courses found. Create your first course!</div>}
      </div>

      {/* Course Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#E7E5E4]">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Plus Jakarta Sans' }}>{editing ? 'Edit Course' : 'Create Course'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-[#F5F5F4]"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm focus:border-[#14B8A6] outline-none" data-testid="course-title-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm focus:border-[#14B8A6] outline-none resize-none" data-testid="course-description-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm focus:border-[#14B8A6] outline-none" data-testid="course-category-select">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Level</label>
                  <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm focus:border-[#14B8A6] outline-none capitalize" data-testid="course-level-select">
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none" data-testid="course-status-select">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (weeks)</label>
                  <input type="number" value={form.duration_weeks} onChange={e => setForm({...form, duration_weeks: parseInt(e.target.value) || 1})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none" data-testid="course-duration-input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Thumbnail URL</label>
                <input value={form.thumbnail} onChange={e => setForm({...form, thumbnail: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none" placeholder="https://..." data-testid="course-thumbnail-input" />
              </div>
              {instructors.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">Instructors</label>
                  <div className="space-y-1">
                    {instructors.map(inst => (
                      <label key={inst.user_id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={form.instructor_ids.includes(inst.user_id)} onChange={e => {
                          setForm({...form, instructor_ids: e.target.checked ? [...form.instructor_ids, inst.user_id] : form.instructor_ids.filter(id => id !== inst.user_id)});
                        }} className="rounded" />
                        {inst.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.certificate_enabled} onChange={e => setForm({...form, certificate_enabled: e.target.checked})} className="rounded" />
                Certificate enabled
              </label>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[#E7E5E4]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-[#57534E] hover:bg-[#F5F5F4] rounded-lg transition-colors">Cancel</button>
              <button onClick={saveCourse} className="px-4 py-2 text-sm font-medium text-white bg-[#0D9488] rounded-lg hover:bg-[#0D9488]/90 active:scale-[0.98] transition-all" data-testid="save-course-btn">Save Course</button>
            </div>
          </div>
        </div>
      )}

      {/* Course Builder (Modules & Lessons) */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowBuilder(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#E7E5E4]">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Plus Jakarta Sans' }}>Course Builder</h3>
              <button onClick={() => setShowBuilder(null)} className="p-1 rounded hover:bg-[#F5F5F4]"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {modules.map((m, mi) => (
                <div key={m.module_id} className="border border-[#E7E5E4] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-[#F5F5F4]">
                    <div className="flex items-center gap-2">
                      <GripVertical size={16} className="text-[#A8A29E] cursor-grab" />
                      <span className="font-semibold text-sm" style={{ fontFamily: 'Plus Jakarta Sans' }}>Module {mi + 1}: {m.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-[#A8A29E] mr-2">{m.lessons?.length || 0} lessons</span>
                      <button onClick={() => deleteModule(m.module_id)} className="p-1 rounded hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    {m.lessons?.map((l, li) => (
                      <div key={l.lesson_id} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-[#E7E5E4] hover:border-[#14B8A6]/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#A8A29E] w-5">{li + 1}.</span>
                          <span className="text-sm text-[#1C1917]">{l.title}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${l.type === 'video' ? 'bg-blue-50 text-blue-600' : l.type === 'text' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'}`}>{l.type}</span>
                        </div>
                        <button onClick={() => deleteLesson(l.lesson_id)} className="p-1 rounded hover:bg-red-50 text-red-400"><Trash2 size={12} /></button>
                        <button onClick={() => setEditingLesson(l)} className="p-1 rounded hover:bg-[#F0FDFA] text-[#0D9488]" data-testid={`edit-lesson-${l.lesson_id}`}><Edit2 size={12} /></button>
                      </div>
                    ))}
                    {lessonForm?.moduleId === m.module_id ? (
                      <div className="flex gap-2 mt-2">
                        <input value={lessonForm.title || ''} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} placeholder="Lesson title" className="flex-1 px-3 py-1.5 rounded-lg border border-[#E7E5E4] text-sm outline-none focus:border-[#14B8A6]" data-testid="lesson-title-input" />
                        <select value={lessonForm.type || 'text'} onChange={e => setLessonForm({...lessonForm, type: e.target.value})} className="px-2 py-1.5 rounded-lg border border-[#E7E5E4] text-sm outline-none">
                          <option value="text">Text</option>
                          <option value="video">Video</option>
                          <option value="youtube">YouTube</option>
                        </select>
                        <button onClick={() => addLesson(m.module_id)} className="px-3 py-1.5 bg-[#0D9488] text-white rounded-lg text-sm font-medium" data-testid="save-lesson-btn">Add</button>
                        <button onClick={() => setLessonForm(null)} className="px-3 py-1.5 text-sm text-[#57534E] hover:bg-[#F5F5F4] rounded-lg">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setLessonForm({ moduleId: m.module_id, title: '', type: 'text', content: '' })} className="text-xs text-[#14B8A6] font-medium hover:underline mt-1" data-testid={`add-lesson-to-${m.module_id}`}>+ Add Lesson</button>
                    )}
                  </div>
                </div>
              ))}

              {moduleForm ? (
                <div className="flex gap-2">
                  <input value={moduleForm.title || ''} onChange={e => setModuleForm({...moduleForm, title: e.target.value})} placeholder="Module title" className="flex-1 px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none focus:border-[#14B8A6]" data-testid="module-title-input" />
                  <button onClick={addModule} className="px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium" data-testid="save-module-btn">Add Module</button>
                  <button onClick={() => setModuleForm(null)} className="px-3 py-2 text-sm text-[#57534E] hover:bg-[#F5F5F4] rounded-lg">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setModuleForm({ title: '', description: '' })} className="w-full py-3 border-2 border-dashed border-[#E7E5E4] rounded-xl text-sm font-medium text-[#14B8A6] hover:border-[#14B8A6] hover:bg-[#F0FDFA] transition-all" data-testid="add-module-btn">+ Add Module</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lesson Content Editor */}
      {editingLesson && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingLesson(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-bold">Edit Lesson Content</h3>
              <button onClick={() => setEditingLesson(null)} className="p-1 rounded-lg hover:bg-[#F8FAFC]"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">Title</label><input value={editingLesson.title || ''} onChange={e => setEditingLesson({...editingLesson, title: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">Type</label><select value={editingLesson.type || 'text'} onChange={e => setEditingLesson({...editingLesson, type: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none"><option value="text">Text</option><option value="video">Video</option><option value="youtube">YouTube</option><option value="mixed">Mixed</option></select></div>
                <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">Status</label><select value={editingLesson.status || 'draft'} onChange={e => setEditingLesson({...editingLesson, status: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none"><option value="draft">Draft</option><option value="published">Published</option></select></div>
              </div>
              {editingLesson.type === 'youtube' && <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">YouTube URL</label><input value={editingLesson.youtube_url || ''} onChange={e => setEditingLesson({...editingLesson, youtube_url: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none" placeholder="https://youtube.com/watch?v=..." /></div>}
              <div>
                <label className="block text-[12px] font-semibold text-[#334155] mb-1">Content</label>
                <RichTextEditor value={editingLesson.content} onChange={val => setEditingLesson({...editingLesson, content: val})} minHeight={250} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[#E2E8F0]">
              <button onClick={() => setEditingLesson(null)} className="px-4 py-2 text-sm font-bold text-[#64748B] rounded-xl" style={{ fontFamily: 'Space Mono' }}>Cancel</button>
              <button onClick={async () => {
                try {
                  await API.put(`/api/lessons/${editingLesson.lesson_id}`, editingLesson);
                  toast.success('Lesson saved');
                  const res = await API.get(`/api/courses/${showBuilder}/modules`);
                  setModules(res.data);
                  setEditingLesson(null);
                } catch { toast.error('Error saving'); }
              }} className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#0D9488] to-[#14B8A6] rounded-xl" style={{ fontFamily: 'Space Mono' }} data-testid="save-lesson-content-btn">Save Lesson</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteCourse(confirmDelete?.course_id)}
        title="Delete Course"
        message={`Are you sure you want to delete "${confirmDelete?.title}"? This will permanently remove all modules and lessons within this course.`}
        confirmLabel="Delete Course"
        variant="danger"
      />
    </div>
  );
}
