// src/components/Toast.jsx
// Global toast notification system
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
    success: <CheckCircle2 size={18} color="#059669" />,
    error: <XCircle size={18} color="#DC2626" />,
    info: <Info size={18} color="#7B61FF" />,
};
const BG = { success: '#ECFDF5', error: '#FEF2F2', info: '#EDE9FE' };
const BORDER = { success: '#A7F3D0', error: '#FECACA', info: '#C4B5FD' };
const COLOR = { success: '#065F46', error: '#991B1B', info: '#4C1D95' };

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const idRef = useRef(0);

    const toast = useCallback((message, type = 'info', duration = 3500) => {
        const id = ++idRef.current;
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
    }, []);

    const dismiss = (id) => setToasts(t => t.filter(x => x.id !== id));

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '340px', width: '100%', fontFamily: "'Poppins', sans-serif" }}>
                <style>{`
          @keyframes toastIn { from { opacity:0; transform:translateY(16px) scale(0.95); } to { opacity:1; transform:none; } }
          .toast-item { animation: toastIn 0.28s ease both; }
        `}</style>
                {toasts.map(t => (
                    <div key={t.id} className="toast-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '13px 14px', background: BG[t.type], border: `1px solid ${BORDER[t.type]}`, borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', color: COLOR[t.type], fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>
                        <span style={{ flexShrink: 0, marginTop: '1px' }}>{ICONS[t.type]}</span>
                        <span style={{ flex: 1 }}>{t.message}</span>
                        <button onClick={() => dismiss(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: COLOR[t.type], opacity: 0.6, flexShrink: 0 }}>
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
    return ctx;
}
