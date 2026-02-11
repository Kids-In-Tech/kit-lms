import React, { useState, useEffect } from 'react';
import API from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Bell, Plus, Send, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'announcement', target_role: 'all' });

  const fetchNotifications = () => {
    API.get('/api/notifications').then(r => setNotifications(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchNotifications(); }, []);

  const markRead = async (id) => {
    await API.put(`/api/notifications/${id}/read`);
    fetchNotifications();
  };

  const send = async () => {
    try {
      await API.post('/api/notifications', form);
      toast.success('Notification sent');
      setShowForm(false);
      fetchNotifications();
    } catch { toast.error('Error sending'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="notifications-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-[#1C1917]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Notifications</h1></div>
        {['super_admin', 'instructor'].includes(user?.role) && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488]/90 transition-all" data-testid="send-notification-btn"><Send size={16} />Send Announcement</button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map(n => (
          <div key={n.notification_id} className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-all ${n.is_read ? 'border-[#E7E5E4]' : 'border-[#14B8A6]/30 bg-[#F0FDFA]/30'}`} data-testid={`notif-${n.notification_id}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.type === 'announcement' ? 'bg-[#F0FDFA]' : n.type === 'reminder' ? 'bg-amber-50' : 'bg-red-50'}`}>
              <Bell size={14} className={n.type === 'announcement' ? 'text-[#14B8A6]' : n.type === 'reminder' ? 'text-amber-500' : 'text-red-500'} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-[#1C1917]">{n.title}</h4>
              <p className="text-sm text-[#57534E] mt-0.5">{n.message}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-[#A8A29E]">
                <span>{new Date(n.created_at).toLocaleString()}</span>
                <span className="capitalize">{n.target_role}</span>
              </div>
            </div>
            {!n.is_read && (
              <button onClick={() => markRead(n.notification_id)} className="p-1 rounded hover:bg-[#F5F5F4]" data-testid={`mark-read-${n.notification_id}`}><Check size={14} className="text-[#14B8A6]" /></button>
            )}
          </div>
        ))}
        {notifications.length === 0 && <p className="text-center py-8 text-[#A8A29E]">No notifications</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#E7E5E4]">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Plus Jakarta Sans' }}>Send Announcement</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-[#F5F5F4]"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Title</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none focus:border-[#14B8A6]" data-testid="notif-title-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Message</label><textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={3} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none resize-none" data-testid="notif-message-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Target</label>
                <select value={form.target_role} onChange={e => setForm({...form, target_role: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none">
                  <option value="all">Everyone</option><option value="student">Students</option><option value="instructor">Instructors</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[#E7E5E4]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[#57534E] rounded-lg">Cancel</button>
              <button onClick={send} className="px-4 py-2 text-sm text-white bg-[#0D9488] rounded-lg" data-testid="send-notif-btn">Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
