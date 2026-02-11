import React, { useState, useEffect } from 'react';
import API from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Award, Download } from 'lucide-react';

export default function Certificates() {
  const { user } = useAuth();
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = user?.role === 'student' ? { student_id: user.user_id } : {};
    API.get('/api/certificates', { params }).then(r => setCerts(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="certificates-page">
      <div><h1 className="text-2xl font-bold text-[#1C1917]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Certificates</h1><p className="text-sm text-[#57534E] mt-1">{certs.length} certificates issued</p></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {certs.map(c => (
          <div key={c.certificate_id} className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden hover:shadow-md transition-all duration-300" data-testid={`cert-${c.certificate_id}`}>
            <div className="h-32 bg-gradient-to-br from-[#0D9488] to-[#14B8A6] flex items-center justify-center">
              <Award size={48} className="text-white/30" />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-[#1C1917]" style={{ fontFamily: 'Plus Jakarta Sans' }}>{c.course_title}</h3>
              <p className="text-sm text-[#57534E] mt-1">Awarded to: {c.student_name}</p>
              <p className="text-xs text-[#A8A29E] mt-2">Issued: {new Date(c.issued_at).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
        {certs.length === 0 && <div className="col-span-full text-center py-12 text-[#A8A29E]">No certificates yet</div>}
      </div>
    </div>
  );
}
