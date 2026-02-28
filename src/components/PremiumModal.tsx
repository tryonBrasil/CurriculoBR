import React, { useState } from 'react';

interface PremiumModalProps {
  onClose: () => void;
  templateLabel?: string;
}

const PREMIUM_BENEFITS = [
  { emoji: '🎨', text: '12 templates exclusivos desbloqueados' },
  { emoji: '♾️', text: 'Acesso vitalício — paga uma vez, usa sempre' },
  { emoji: '📱', text: 'Funciona no celular, tablet e computador' },
  { emoji: '⚡', text: 'Todos os recursos de IA incluídos' },
  { emoji: '🚀', text: 'Novos templates futuros incluídos sem custo extra' },
];

const PremiumModal: React.FC<PremiumModalProps> = ({ onClose, templateLabel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/create-preference', { method: 'POST' });
      if (!res.ok) throw new Error('Erro ao conectar com o servidor de pagamento.');
      const data = await res.json();

      // Prod usa init_point; sandbox_init_point é fallback apenas para ambiente de teste
      const checkoutUrl = data.init_point || data.sandbox_init_point;
      if (!checkoutUrl) throw new Error('Link de pagamento não retornado.');

      // Salva flag de "pagamento iniciado" para verificar ao voltar
      localStorage.setItem('cbr_pending_payment', '1');

      // Redireciona para o Mercado Pago
      window.location.href = checkoutUrl;
    } catch (e: any) {
      setError(e.message || 'Erro inesperado. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header gradiente */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 px-8 py-7 text-white relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="text-4xl mb-2">👑</div>
            <h2 className="text-2xl font-black tracking-tight leading-tight">
              {templateLabel
                ? <>O template <span className="text-yellow-300">"{templateLabel}"</span> é Premium</>
                : <>Desbloqueie o <span className="text-yellow-300">Premium</span></>
              }
            </h2>
            <p className="text-blue-100 text-sm mt-2">
              Pagamento único — sem assinatura, sem surpresa 🎉
            </p>
          </div>
        </div>

        {/* Benefícios */}
        <div className="px-8 py-6">
          <ul className="space-y-3 mb-6">
            {PREMIUM_BENEFITS.map((b, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="text-lg w-7 text-center">{b.emoji}</span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{b.text}</span>
              </li>
            ))}
          </ul>

          {/* Preço */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 mb-6 text-center border border-blue-100 dark:border-blue-800/40">
            <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Acesso vitalício por</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-slate-400 text-sm line-through">R$ 29,90</span>
              <span className="text-4xl font-black text-slate-900 dark:text-white">R$ 9,90</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Pagamento via Mercado Pago · Pix, cartão ou boleto</p>
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">⚠️ {error}</p>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {loading
              ? <><i className="fas fa-circle-notch fa-spin"></i> Preparando pagamento...</>
              : <>🔓 Desbloquear por R$ 9,90 →</>
            }
          </button>

          <button
            onClick={onClose}
            className="w-full mt-3 py-3 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Agora não, continuar com gratuito
          </button>

          <p className="text-center text-[10px] text-slate-300 dark:text-slate-600 mt-3">
            🔒 Pagamento seguro via Mercado Pago · SSL criptografado
          </p>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
