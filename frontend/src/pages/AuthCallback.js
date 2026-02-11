import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const { processSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = location.hash || window.location.hash;
    const sessionId = new URLSearchParams(hash.replace('#', '?')).get('session_id');
    if (!sessionId) { navigate('/login'); return; }

    processSession(sessionId).then(user => {
      const path = user.role === 'super_admin' ? '/admin' : user.role === 'instructor' ? '/instructor' : '/student';
      navigate(path, { replace: true, state: { user } });
    }).catch(() => navigate('/login'));
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-[#FAFAF9]">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#14B8A6] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-[#57534E] text-sm">Authenticating...</p>
      </div>
    </div>
  );
}
