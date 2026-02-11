import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger', loading = false }) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const colors = variant === 'danger'
    ? { bg: 'bg-red-50', icon: 'text-[#EF4444]', btn: 'bg-[#EF4444] hover:bg-red-600' }
    : { bg: 'bg-amber-50', icon: 'text-amber-500', btn: 'bg-amber-500 hover:bg-amber-600' };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" data-testid="confirm-modal">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-up" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-4`}>
            {variant === 'danger' ? <Trash2 size={22} className={colors.icon} /> : <AlertTriangle size={22} className={colors.icon} />}
          </div>
          <h3 className="text-lg font-bold text-[#0F172A] mb-1.5">{title}</h3>
          <p className="text-sm text-[#64748B] leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center gap-3 p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-2xl">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 text-sm font-bold text-[#64748B] bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F1F5F9] transition-all" style={{ fontFamily: 'Space Mono' }} data-testid="confirm-cancel-btn">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-all active:scale-[0.97] disabled:opacity-50 ${colors.btn}`} style={{ fontFamily: 'Space Mono' }} data-testid="confirm-action-btn">
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
