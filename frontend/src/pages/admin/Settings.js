import React, { useState, useEffect } from 'react';
import API from '../../api';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const [settings, setSettings] = useState({ name: '', logo: '', primary_color: '#0D9488', email_from: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/api/settings').then(r => setSettings(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    try { await API.put('/api/settings', settings); toast.success('Settings saved'); } catch { toast.error('Error saving'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl" data-testid="settings-page">
      <div><h1 className="text-2xl font-bold text-[#1C1917]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Settings</h1><p className="text-sm text-[#57534E] mt-1">Platform configuration</p></div>

      <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-5">
        <h3 className="text-lg font-semibold" style={{ fontFamily: 'Plus Jakarta Sans' }}>Platform Branding</h3>
        <div><label className="block text-sm font-medium mb-1">Platform Name</label><input value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none focus:border-[#14B8A6]" data-testid="settings-name" /></div>
        <div><label className="block text-sm font-medium mb-1">Logo URL</label><input value={settings.logo} onChange={e => setSettings({...settings, logo: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none" data-testid="settings-logo" /></div>
        <div><label className="block text-sm font-medium mb-1">Primary Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={settings.primary_color} onChange={e => setSettings({...settings, primary_color: e.target.value})} className="w-10 h-10 rounded cursor-pointer" />
            <input value={settings.primary_color} onChange={e => setSettings({...settings, primary_color: e.target.value})} className="px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none w-32" />
          </div>
        </div>
        <div><label className="block text-sm font-medium mb-1">Email From</label><input type="email" value={settings.email_from} onChange={e => setSettings({...settings, email_from: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#E7E5E4] text-sm outline-none" data-testid="settings-email" /></div>
        <button onClick={save} className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-medium hover:bg-[#0D9488]/90 active:scale-[0.98] transition-all" data-testid="save-settings-btn"><Save size={16} />Save Settings</button>
      </div>
    </div>
  );
}
