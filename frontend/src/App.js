import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';
import Layout from './components/Layout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminCourses from './pages/admin/Courses';
import AdminUsers from './pages/admin/Users';
import AdminQuizzes from './pages/admin/Quizzes';
import AdminAssignments from './pages/admin/Assignments';
import AdminAnalytics from './pages/admin/Analytics';
import AdminCertificates from './pages/admin/Certificates';
import AdminNotifications from './pages/admin/Notifications';
import AdminSettings from './pages/admin/Settings';
import InstructorDashboard from './pages/instructor/Dashboard';
import StudentDashboard from './pages/student/Dashboard';
import StudentCourseView from './pages/student/CourseView';
import StudentQuizView from './pages/student/QuizView';
import ProfileSettings from './pages/ProfileSettings';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#F8FAFC]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-sm text-[#64748B]" style={{ fontFamily: 'Space Mono' }}>Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_reset_password) return <Navigate to="/reset-password" replace state={{ userId: user.user_id }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role === 'super_admin' ? 'admin' : user.role}`} replace />;
  return children;
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_reset_password) return <Navigate to="/reset-password" replace state={{ userId: user.user_id }} />;
  if (user.role === 'super_admin') return <Navigate to="/admin" replace />;
  if (user.role === 'instructor') return <Navigate to="/instructor" replace />;
  return <Navigate to="/student" replace />;
}

function AppRoutes() {
  const location = useLocation();
  if (location.hash?.includes('session_id=')) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<RoleRedirect />} />
      <Route path="/admin" element={<ProtectedRoute roles={['super_admin']}><Layout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="students" element={<AdminUsers role="student" />} />
        <Route path="instructors" element={<AdminUsers role="instructor" />} />
        <Route path="quizzes" element={<AdminQuizzes />} />
        <Route path="assignments" element={<AdminAssignments />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="certificates" element={<AdminCertificates />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="profile" element={<ProfileSettings />} />
      </Route>
      <Route path="/instructor" element={<ProtectedRoute roles={['instructor']}><Layout /></ProtectedRoute>}>
        <Route index element={<InstructorDashboard />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="assignments" element={<AdminAssignments />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="profile" element={<ProfileSettings />} />
      </Route>
      <Route path="/student" element={<ProtectedRoute roles={['student']}><Layout /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="courses/:courseId" element={<StudentCourseView />} />
        <Route path="quiz/:quizId" element={<StudentQuizView />} />
        <Route path="certificates" element={<AdminCertificates />} />
        <Route path="profile" element={<ProfileSettings />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '14px', borderRadius: '12px', padding: '12px 16px' },
            success: { style: { background: '#F0FDFA', color: '#0F766E', border: '1px solid #CCFBF1' }, iconTheme: { primary: '#0D9488', secondary: '#F0FDFA' } },
            error: { style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
