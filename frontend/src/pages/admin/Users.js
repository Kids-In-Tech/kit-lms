import React, { useState, useEffect } from 'react';
import API from '../../api';
import { Plus, Search, Edit2, Trash2, X, ShieldBan, ShieldCheck, Eye, ChevronDown } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import toast from 'react-hot-toast';

const calcAge = (dob) => {
  if (!dob) return '';
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
};

export default function Users({ role: filterRole }) {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewUser, setViewUser] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [form, setForm] = useState({});

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (showForm || viewUser) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showForm, viewUser]);

  const isStudent = filterRole === 'student';
  const label = isStudent ? 'Students' : 'Instructors';
  const emptyForm = {
    first_name: '', middle_name: '', last_name: '', email: '', password: '',
    role: filterRole || 'student', bio: '', dob: '', gender: '', phone: '',
    ...(isStudent ? { school_name: '', class_name: '', guardian_name: '' } : {}),
    course_ids: []
  };

  const fetchData = () => {
    Promise.all([
      API.get('/api/users', { params: { role: filterRole, search: search || undefined } }),
      API.get('/api/courses')
    ]).then(([u, c]) => { setUsers(u.data); setCourses(c.data); }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [search, filterRole]);

  const openNew = () => { setForm(emptyForm); setEditing(null); setShowForm(true); };
  const openEdit = async (u) => {
    // Fetch enrolled courses for this user
    let enrolledCourseIds = [];
    try {
      const res = await API.get(`/api/users/${u.user_id}`);
      enrolledCourseIds = (res.data.enrolled_courses || []).map(e => e.course_id);
    } catch {}
    setForm({
      first_name: u.first_name || u.name?.split(' ')[0] || '', middle_name: u.middle_name || '',
      last_name: u.last_name || u.name?.split(' ').slice(1).join(' ') || '',
      email: u.email, password: '', role: u.role, bio: u.bio || '', dob: u.dob || '',
      gender: u.gender || '', phone: u.phone || '',
      ...(isStudent ? { school_name: u.school_name || '', class_name: u.class_name || '', guardian_name: u.guardian_name || '' } : {}),
      course_ids: enrolledCourseIds
    });
    setEditing(u.user_id);
    setShowForm(true);
  };

  const saveUser = async () => {
    try {
      const data = { ...form, name: `${form.first_name} ${form.middle_name} ${form.last_name}`.replace(/\s+/g, ' ').trim() };
      if (!data.password) delete data.password;
      const courseIds = data.course_ids || [];
      delete data.course_ids;
      let userId = editing;
      if (editing) {
        await API.put(`/api/users/${editing}`, data);
        toast.success('User updated');
      } else {
        const res = await API.post('/api/users', data);
        userId = res.data.user_id;
        toast.success(`${isStudent ? 'Student' : 'Instructor'} created with default password: 123456`);
      }
      // Sync enrollments
      if (isStudent && courseIds.length >= 0) {
        await API.post('/api/admin/students/enroll', { student_id: userId, course_ids: courseIds });
      }
      setShowForm(false); fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error saving'); }
  };

  const handleSuspend = async (userId) => {
    try { await API.put(`/api/users/${userId}/suspend`); toast.success('Account suspended'); fetchData(); } catch { toast.error('Error'); }
    setConfirmAction(null);
  };

  const handleReactivate = async (userId) => {
    try { await API.put(`/api/users/${userId}/reactivate`); toast.success('Account reactivated'); fetchData(); } catch { toast.error('Error'); }
  };

  const handleDelete = async (userId) => {
    try { await API.delete(`/api/users/${userId}`); toast.success('User deleted'); fetchData(); } catch { toast.error('Error'); }
    setConfirmAction(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-full max-w-2xl space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-16 w-full" />)}</div></div>;

  return (
    <div className="space-y-6 animate-fade-up" data-testid="users-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">{label}</h1>
          <p className="text-sm text-[#64748B] mt-1">{users.length} {label.toLowerCase()} registered</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0D9488] to-[#14B8A6] text-white rounded-xl text-sm font-bold active:scale-[0.97] transition-all shadow-lg shadow-teal-500/20" style={{ fontFamily: 'Space Mono' }} data-testid="create-user-btn">
          <Plus size={16} />Add {isStudent ? 'Student' : 'Instructor'}
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${label.toLowerCase()}...`} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-sm focus:border-[#0D9488] outline-none transition-all" data-testid="user-search" />
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="text-left py-3 px-4 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider" style={{ fontFamily: 'Space Mono' }}>Name</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider" style={{ fontFamily: 'Space Mono' }}>Email</th>
                {isStudent && <th className="text-left py-3 px-4 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider" style={{ fontFamily: 'Space Mono' }}>School</th>}
                <th className="text-left py-3 px-4 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider" style={{ fontFamily: 'Space Mono' }}>Age</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider" style={{ fontFamily: 'Space Mono' }}>Status</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider" style={{ fontFamily: 'Space Mono' }}>Joined</th>
                <th className="text-right py-3 px-4 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider" style={{ fontFamily: 'Space Mono' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.user_id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors" data-testid={`user-row-${u.user_id}`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F0FDFA] to-[#CCFBF1] flex items-center justify-center text-[#0D9488] font-bold text-xs">{u.name?.charAt(0)}</div>
                      <div>
                        <p className="font-semibold text-[#0F172A]">{u.name}</p>
                        {u.phone && <p className="text-[11px] text-[#94A3B8]">{u.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#64748B]">{u.email}</td>
                  {isStudent && <td className="py-3 px-4 text-[#64748B] text-xs">{u.school_name || '-'}</td>}
                  <td className="py-3 px-4 text-[#64748B]">{u.dob ? calcAge(u.dob) : '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${u.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`} style={{ fontFamily: 'Space Mono' }}>{u.status}</span>
                  </td>
                  <td className="py-3 px-4 text-[#94A3B8] text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={async () => { try { const res = await API.get(`/api/users/${u.user_id}`); setViewUser(res.data); } catch { setViewUser(u); } }} className="p-1.5 rounded-lg hover:bg-[#F8FAFC] text-[#94A3B8] hover:text-[#0D9488] transition-colors" data-testid={`view-user-${u.user_id}`}><Eye size={14} /></button>
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-[#F8FAFC] text-[#94A3B8] hover:text-[#0F172A] transition-colors" data-testid={`edit-user-${u.user_id}`}><Edit2 size={14} /></button>
                      {u.status === 'active' ? (
                        <button onClick={() => setConfirmAction({ type: 'suspend', userId: u.user_id, name: u.name })} className="p-1.5 rounded-lg hover:bg-amber-50 text-[#94A3B8] hover:text-amber-500 transition-colors" data-testid={`suspend-user-${u.user_id}`}><ShieldBan size={14} /></button>
                      ) : (
                        <button onClick={() => handleReactivate(u.user_id)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-[#94A3B8] hover:text-emerald-500 transition-colors" data-testid={`reactivate-user-${u.user_id}`}><ShieldCheck size={14} /></button>
                      )}
                      <button onClick={() => setConfirmAction({ type: 'delete', userId: u.user_id, name: u.name })} className="p-1.5 rounded-lg hover:bg-red-50 text-[#94A3B8] hover:text-[#EF4444] transition-colors" data-testid={`delete-user-${u.user_id}`}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={isStudent ? 7 : 6} className="text-center py-12 text-[#94A3B8]">No {label.toLowerCase()} found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-auto animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0] sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-lg font-bold text-[#0F172A]">{editing ? 'Edit' : 'Add'} {isStudent ? 'Student' : 'Instructor'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[#F8FAFC]"><X size={16} className="text-[#64748B]" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">First Name *</label><input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" data-testid="user-first-name" /></div>
                <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">Middle Name</label><input value={form.middle_name} onChange={e => setForm({...form, middle_name: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" /></div>
                <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">Last Name *</label><input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" data-testid="user-last-name" /></div>
              </div>
              <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">Email *</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" data-testid="user-email-input" /></div>
              {!editing && <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">Password</label><input value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Default: 123456" className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" data-testid="user-password-input" /></div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">Date of Birth</label><input type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" data-testid="user-dob" /></div>
                <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">Gender</label><select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" data-testid="user-gender"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
              </div>
              <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">Phone Number</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" data-testid="user-phone" /></div>
              {isStudent && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">School Name</label><input value={form.school_name} onChange={e => setForm({...form, school_name: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" data-testid="user-school" /></div>
                    <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">Class Name</label><input value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" data-testid="user-class" /></div>
                  </div>
                  <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">Guardian Name</label><input value={form.guardian_name} onChange={e => setForm({...form, guardian_name: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488]" data-testid="user-guardian" /></div>
                </>
              )}
              <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">Assign Courses</label>
                <div className="space-y-1.5 max-h-32 overflow-auto p-2 border border-[#E2E8F0] rounded-xl">
                  {courses.filter(c => c.status === 'published').map(c => (
                    <label key={c.course_id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[#F8FAFC] p-1 rounded-lg">
                      <input type="checkbox" checked={form.course_ids?.includes(c.course_id)} onChange={e => setForm({...form, course_ids: e.target.checked ? [...(form.course_ids||[]), c.course_id] : (form.course_ids||[]).filter(id => id !== c.course_id)})} className="rounded text-[#0D9488]" />
                      <span className="text-[#334155]">{c.title}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div><label className="block text-[12px] font-semibold text-[#334155] mb-1">Bio</label><textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} rows={2} className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#0D9488] resize-none" /></div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[#E2E8F0] sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC] rounded-xl" style={{ fontFamily: 'Space Mono' }}>Cancel</button>
              <button onClick={saveUser} className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#0D9488] to-[#14B8A6] rounded-xl active:scale-[0.97] transition-all" style={{ fontFamily: 'Space Mono' }} data-testid="save-user-btn">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* View User Detail */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewUser(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-auto animate-fade-up" data-testid="user-detail-modal">
            <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0] sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-lg font-bold text-[#0F172A]">Profile Details</h3>
              <button onClick={() => setViewUser(null)} className="p-1.5 rounded-lg hover:bg-[#F8FAFC]"><X size={16} /></button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F0FDFA] to-[#CCFBF1] flex items-center justify-center text-[#0D9488] font-bold text-2xl">{viewUser.name?.charAt(0)}</div>
                <div>
                  <p className="text-lg font-bold text-[#0F172A]">{viewUser.name}</p>
                  <p className="text-sm text-[#64748B]">{viewUser.email}</p>
                  <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${viewUser.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`} style={{ fontFamily: 'Space Mono' }}>{viewUser.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Gender', viewUser.gender || '-'],
                  ['Age', viewUser.dob ? calcAge(viewUser.dob) : '-'],
                  ['Phone', viewUser.phone || '-'],
                  ['Points', viewUser.points || 0],
                  ...(isStudent ? [['School', viewUser.school_name || '-'], ['Class', viewUser.class_name || '-'], ['Guardian', viewUser.guardian_name || '-']] : []),
                  ['Joined', new Date(viewUser.created_at).toLocaleDateString()],
                ].map(([k, v]) => (
                  <div key={k} className="p-2.5 bg-[#F8FAFC] rounded-xl">
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider" style={{ fontFamily: 'Space Mono' }}>{k}</p>
                    <p className="text-[#0F172A] font-medium mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              {viewUser.bio && <div className="mt-3 p-3 bg-[#F8FAFC] rounded-xl"><p className="text-[10px] font-bold text-[#94A3B8] uppercase mb-1" style={{ fontFamily: 'Space Mono' }}>Bio</p><p className="text-sm text-[#334155]">{viewUser.bio}</p></div>}
              {isStudent && viewUser.enrolled_courses && viewUser.enrolled_courses.length > 0 && (
                <div className="mt-3" data-testid="user-enrolled-courses">
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2" style={{ fontFamily: 'Space Mono' }}>Enrolled Courses</p>
                  <div className="space-y-2">
                    {viewUser.enrolled_courses.map(ec => (
                      <div key={ec.enrollment_id} className="flex items-center justify-between p-2.5 bg-[#F0FDFA] rounded-xl border border-[#CCFBF1]">
                        <div>
                          <p className="text-sm font-medium text-[#0F172A]">{ec.course_title}</p>
                          <p className="text-[10px] text-[#64748B]">Enrolled {new Date(ec.enrolled_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#E2E8F0] rounded-full h-1.5">
                            <div className="h-full bg-[#0D9488] rounded-full" style={{ width: `${ec.progress}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-[#0D9488]" style={{ fontFamily: 'Space Mono' }}>{ec.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={confirmAction?.type === 'delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleDelete(confirmAction?.userId)}
        title="Delete User"
        message={`Are you sure you want to permanently delete ${confirmAction?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
      <ConfirmModal
        isOpen={confirmAction?.type === 'suspend'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleSuspend(confirmAction?.userId)}
        title="Suspend Account"
        message={`Are you sure you want to suspend ${confirmAction?.name}'s account? They will not be able to access the platform.`}
        confirmLabel="Suspend"
        variant="warning"
      />
    </div>
  );
}
