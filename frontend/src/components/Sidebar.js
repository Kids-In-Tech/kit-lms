import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, BookOpen, Users, GraduationCap, FileQuestion, ClipboardList, BarChart3, Award, Bell, Settings, ChevronLeft, ChevronRight, LogOut, Menu, Zap, X, UserCircle, Megaphone } from 'lucide-react';

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/courses', icon: BookOpen, label: 'Courses' },
  { to: '/admin/students', icon: Users, label: 'Students' },
  { to: '/admin/instructors', icon: GraduationCap, label: 'Instructors' },
  { to: '/admin/quizzes', icon: FileQuestion, label: 'Quizzes' },
  { to: '/admin/assignments', icon: ClipboardList, label: 'Assignments' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/certificates', icon: Award, label: 'Certificates' },
  { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
  { to: '/admin/profile', icon: UserCircle, label: 'Profile' },
];

const instructorLinks = [
  { to: '/instructor', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/instructor/courses', icon: BookOpen, label: 'My Courses' },
  { to: '/instructor/assignments', icon: ClipboardList, label: 'Assignments' },
  { to: '/instructor/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/instructor/profile', icon: UserCircle, label: 'Profile' },
];

const studentLinks = [
  { to: '/student', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/student/certificates', icon: Award, label: 'Certificates' },
  { to: '/student/profile', icon: UserCircle, label: 'Profile' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = user?.role === 'super_admin' ? adminLinks : user?.role === 'instructor' ? instructorLinks : studentLinks;
  const roleLabel = user?.role === 'super_admin' ? 'SUPER ADMIN' : user?.role === 'instructor' ? 'INSTRUCTOR' : 'STUDENT';
  const roleColor = user?.role === 'super_admin' ? '#0D9488' : user?.role === 'instructor' ? '#8B5CF6' : '#F97316';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F172A]">
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-4 border-b border-white/10`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0D9488] to-[#14B8A6] flex items-center justify-center">
              <Zap className="text-white" size={15} />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">Kids In Tech</span>
              <span className="text-[9px] text-[#64748B] block -mt-0.5 tracking-wider uppercase" style={{ fontFamily: 'Space Mono' }}>LMS</span>
            </div>
          </div>
        )}
        {collapsed && <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0D9488] to-[#14B8A6] flex items-center justify-center"><Zap className="text-white" size={15} /></div>}
        <button onClick={() => setCollapsed(!collapsed)} className="hidden md:flex p-1 rounded-lg hover:bg-white/5 text-[#64748B] transition-colors" data-testid="sidebar-toggle">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: roleColor }} />
            <p className="text-[10px] font-bold tracking-widest" style={{ color: roleColor, fontFamily: 'Space Mono' }}>{roleLabel}</p>
          </div>
          <p className="text-sm font-medium text-[#E2E8F0] mt-1 truncate">{user?.name}</p>
        </div>
      )}

      <nav className="flex-1 overflow-auto py-3 px-2 space-y-0.5">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group
              ${isActive ? 'bg-[#0D9488]/15 text-[#14B8A6]' : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#E2E8F0]'}`
            }
            style={{ fontFamily: 'Space Mono' }}
            data-testid={`nav-${link.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <link.icon size={17} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
            {!collapsed && <span>{link.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-white/10">
        <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#94A3B8] hover:bg-red-500/10 hover:text-red-400 transition-all" style={{ fontFamily: 'Space Mono' }} data-testid="logout-btn">
          <LogOut size={17} />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(true)} className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-[#0F172A] rounded-xl shadow-lg text-white" data-testid="mobile-menu-btn">
        <Menu size={18} />
      </button>

      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />}

      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`} data-testid="sidebar-mobile">
        <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-white/60 hover:text-white z-10"><X size={18} /></button>
        {mobileOpen && sidebarContent}
      </aside>

      <aside className={`hidden md:flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`} data-testid="sidebar">
        {sidebarContent}
      </aside>
    </>
  );
}
