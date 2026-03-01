import React, { useState } from 'react';

interface AuthModalProps {
  onClose: () => void;
  onSignIn: () => Promise<{ ok: boolean; error?: string }>;
  loading?: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSignIn, loading = false }) => {
  const [error, setError]     = useState('');
  const [signing, setSigning] = useState(false);

  const handleGoogle = async () => {
    setSigning(true);
    setError('');
    const result = await onSignIn();
    setSigning(false);
    if (result.ok) {
      onClose();
    } else if (result.error && result.error !== 'cancelled') {
      setError(result.error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-7 py-8 text-white text-center relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-4 -left-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="text-5xl mb-3">☁️</div>
            <h2 className="text-xl font-black tracking-tight">Salvar na Nuvem</h2>
            <p className="text-blue-100 text-sm mt-1.5">Entre para salvar e acessar seus currículos em qualquer dispositivo</p>
          </div>
        </div>

        <div className="px-7 py-7">

          {/* Benefícios */}
          <div className="space-y-3 mb-7">
            {[
              ['💾', 'Currículos salvos com segurança na nuvem'],
              ['📱', 'Acesse de qualquer dispositivo'],
              ['📂', 'Vários currículos organizados'],
              ['🔒', 'Seus dados são privados — só você acessa'],
            ].map(([icon, text], i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl w-7 text-center">{icon}</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">{text}</span>
              </div>
            ))}
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-red-600 dark:text-red-400">⚠️ {error}</p>
            </div>
          )}

          {/* Botão Google */}
          <button
            onClick={handleGoogle}
            disabled={signing}
            className="w-full py-4 flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-2xl font-black text-sm text-slate-700 dark:text-slate-200 transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          >
            {signing ? (
              <><i className="fas fa-circle-notch fa-spin text-blue-600"></i> Entrando...</>
            ) : (
              <>
                {/* Logo Google SVG */}
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continuar com Google
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-slate-400 mb-4">
            Sem senha. Sem cadastro. Apenas Google. 🔒
          </p>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Continuar sem login
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
