import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Bell, Search, ChevronDown, X, Globe } from 'lucide-react';
import API from '../api';

export default function Header() {
  const { user, logout } = useAuth();
  const { language, switchLanguage, t } = useLanguage();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = useCallback(() => {
    API.get('/api/notifications').then(res => {
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  const markRead = async (id) => {
    await API.put(`/api/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleLangSwitch = (lang) => {
    switchLanguage(lang);
    API.put('/api/auth/profile', { language: lang }).catch(() => {});
    setShowLang(false);
  };

  const roleColor = user?.role === 'super_admin' ? '#0D9488' : user?.role === 'instructor' ? '#8B5CF6' : '#F97316';

  return (
    <header className="h-14 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0" data-testid="header">
      <div className="flex items-center gap-3 md:pl-0 pl-12">
        <div className="relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input type="text" placeholder={t('header.search')} className="pl-9 pr-4 py-2 w-64 rounded-xl bg-[#F8FAFC] border border-transparent focus:border-[#0D9488] focus:bg-white text-[13px] outline-none transition-all" data-testid="header-search" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Language Toggle */}
        <div className="relative">
          <button onClick={() => { setShowLang(!showLang); setShowNotifs(false); setShowProfile(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-[#F8FAFC] transition-colors text-[13px] font-medium text-[#64748B]"
            data-testid="language-toggle">
            <Globe size={15} />
            <span className="hidden md:inline uppercase" style={{ fontFamily: 'Space Mono', fontSize: '11px' }}>{language}</span>
          </button>
          {showLang && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLang(false)} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-1 z-50 animate-fade-up" data-testid="language-dropdown">
                <button onClick={() => handleLangSwitch('en')}
                  className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors flex items-center justify-between ${language === 'en' ? 'bg-[#F0FDFA] text-[#0D9488]' : 'text-[#334155] hover:bg-[#F8FAFC]'}`}
                  data-testid="lang-en">
                  {t('settings.english')}
                  {language === 'en' && <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />}
                </button>
                <button onClick={() => handleLangSwitch('ha')}
                  className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors flex items-center justify-between ${language === 'ha' ? 'bg-[#F0FDFA] text-[#0D9488]' : 'text-[#334155] hover:bg-[#F8FAFC]'}`}
                  data-testid="lang-ha">
                  {t('settings.hausa')}
                  {language === 'ha' && <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); setShowLang(false); }} className="relative p-2 rounded-xl hover:bg-[#F8FAFC] transition-colors" data-testid="notifications-bell">
            <Bell size={17} className="text-[#64748B]" />
            {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#EF4444] rounded-full text-white text-[9px] flex items-center justify-center font-bold">{unreadCount}</span>}
          </button>
          {showNotifs && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
              <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 animate-slide-right border-l border-[#E2E8F0]" data-testid="notification-drawer">
                <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
                  <h3 className="text-base font-bold text-[#0F172A]">{t('notif.title')}</h3>
                  <button onClick={() => setShowNotifs(false)} className="p-1 rounded-lg hover:bg-[#F8FAFC]"><X size={16} className="text-[#64748B]" /></button>
                </div>
                <div className="overflow-y-auto h-[calc(100%-56px)]">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center"><Bell size={32} className="text-[#E2E8F0] mx-auto mb-3" /><p className="text-sm text-[#94A3B8]">{t('notif.noNotifications')}</p></div>
                  ) : notifications.map(n => (
                    <div key={n.notification_id} className={`p-4 border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors ${!n.is_read ? 'bg-[#F0FDFA]' : ''}`} data-testid={`drawer-notif-${n.notification_id}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? 'bg-[#0D9488]' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#0F172A]">{n.title}</p>
                          <p className="text-xs text-[#64748B] mt-0.5 line-clamp-2">{n.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-[#94A3B8]">{new Date(n.created_at).toLocaleDateString()}</span>
                            {!n.is_read && <button onClick={() => markRead(n.notification_id)} className="text-[10px] font-semibold text-[#0D9488] hover:underline" style={{ fontFamily: 'Space Mono' }}>{t('notif.markRead')}</button>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); setShowLang(false); }} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[#F8FAFC] transition-colors" data-testid="profile-menu">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: roleColor }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            <span className="text-[13px] font-semibold text-[#0F172A] hidden md:block max-w-[100px] truncate">{user?.name}</span>
            <ChevronDown size={13} className="text-[#94A3B8] hidden md:block" />
          </button>
          {showProfile && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-1 z-50 animate-fade-up" data-testid="profile-dropdown">
                <div className="px-3 py-2.5 border-b border-[#F1F5F9]">
                  <p className="text-sm font-semibold text-[#0F172A]">{user?.name}</p>
                  <p className="text-[11px] text-[#94A3B8] truncate">{user?.email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: roleColor }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: roleColor, fontFamily: 'Space Mono' }}>{user?.role?.replace('_', ' ')}</span>
                  </div>
                </div>
                <button onClick={logout} className="w-full text-left px-3 py-2 text-sm font-medium text-[#EF4444] hover:bg-red-50 transition-colors" style={{ fontFamily: 'Space Mono' }} data-testid="profile-logout">{t('nav.logOut')}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
