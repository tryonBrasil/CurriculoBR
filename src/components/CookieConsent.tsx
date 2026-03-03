import React, { useState, useEffect } from 'react';

const COOKIE_KEY = 'curriculonext_cookie_consent';

const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on first render
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6 animate-in slide-in-from-bottom-4 duration-500"
      role="dialog"
      aria-label="Aviso de cookies"
    >
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
        
        {/* Icon */}
        <div className="w-10 h-10 bg-blue-50 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
          <i className="fas fa-cookie-bite text-blue-600 text-lg"></i>
        </div>

        {/* Text */}
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-800 dark:text-white mb-1">
            Usamos cookies 🍪
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Utilizamos cookies para melhorar sua experiência e exibir anúncios relevantes via Google AdSense.
            Seus dados de currículo ficam somente no seu dispositivo. Veja nossa{' '}
            <a
              href="/privacidade"
              className="text-blue-600 hover:underline font-semibold"
              onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/privacidade'); window.dispatchEvent(new PopStateEvent('popstate')); }}
            >
              Política de Privacidade
            </a>.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 shrink-0 w-full md:w-auto">
          <button
            onClick={decline}
            className="flex-1 md:flex-none px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
          >
            Recusar
          </button>
          <button
            onClick={accept}
            className="flex-1 md:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors shadow-lg"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
