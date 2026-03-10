import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PremiumPlan } from '../hooks/usePremium';

interface PremiumModalProps {
  onClose: () => void;
  templateLabel?: string;
  onUnlocked?: (plan: PremiumPlan) => void;
  isExpired?: boolean;
  daysLeft?: number | null;
  uid?: string | null; // uid do Firebase — vincula o premium à conta
}

const STORAGE_KEY = 'cbr_premium_v2';

type Screen = 'choose-plan' | 'choose-pay' | 'pix-loading' | 'pix-qr' | 'pix-done' | 'pix-expired' | 'card-loading';

const PIX_POLL_MS = 5_000;

const PLANS = {
  avulso:   { label: 'Avulso',   emoji: '⚡', price: 9.90,  period: '7 dias de acesso · sem renovação' },
  monthly:  { label: 'Mensal',   emoji: '🚀', price: 14.90, period: 'por mês · cancele quando quiser' },
  yearly:   { label: 'Anual',    emoji: '🌟', price: 59.90, period: '~R$4,99/mês · economize 66%' },
  lifetime: { label: 'Vitalício',emoji: '👑', price: 29.90, period: 'paga uma vez · nunca expira' },
} as const;

const FEATURES: Record<PremiumPlan, string[][]> = {
  avulso:   [['🎨','12 templates premium desbloqueados'],['🤖','IA para melhorar o currículo'],['📄','Downloads PDF ilimitados'],['⏰','7 dias de acesso'],['✅','Sem renovação automática']],
  monthly:  [['🎨','12 templates premium desbloqueados'],['🤖','IA para melhorar o currículo'],['📄','Downloads PDF ilimitados'],['☁️','Salvar na nuvem'],['🔄','Cancele quando quiser']],
  yearly:   [['🎨','12 templates premium desbloqueados'],['🤖','IA para melhorar o currículo'],['📄','Downloads PDF ilimitados'],['☁️','Salvar na nuvem'],['💰','Economize R$118,90 vs mensal'],['🆓','2 meses grátis inclusos']],
  lifetime: [['🎨','12 templates premium desbloqueados'],['🤖','IA para melhorar o currículo'],['📄','Downloads PDF ilimitados'],['☁️','Salvar na nuvem'],['♾️','Nunca expira — paga uma vez'],['🚀','Todos os templates futuros grátis']],
};

const GRADIENTS: Record<PremiumPlan, string> = {
  avulso:   'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600',
  monthly:  'bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600',
  yearly:   'bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600',
  lifetime: 'bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500',
};

const BORDER: Record<PremiumPlan, string> = {
  avulso:   'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-blue-100',
  monthly:  'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-indigo-100',
  yearly:   'border-violet-600 bg-violet-50 dark:bg-violet-900/20 shadow-violet-100',
  lifetime: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-amber-100',
};

const CHECK_COLOR: Record<PremiumPlan, string> = {
  avulso: 'bg-blue-600', monthly: 'bg-indigo-600', yearly: 'bg-violet-600', lifetime: 'bg-amber-500',
};

const CTA_COLOR: Record<PremiumPlan, string> = {
  avulso:   'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
  monthly:  'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700',
  yearly:   'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700',
  lifetime: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
};

const PENDING_UID_KEY = 'cbr_pending_uid';

const PremiumModal: React.FC<PremiumModalProps> = ({ onClose, templateLabel, onUnlocked, isExpired = false, uid }) => {
  const [screen, setScreen] = useState<Screen>('choose-plan');
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlan>('yearly');
  const [error, setError] = useState('');
  const [pixPaymentId, setPixPaymentId] = useState('');
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixQrBase64, setPixQrBase64] = useState('');
  const [pixExpiresAt, setPixExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (pollRef.current)  clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (screen !== 'pix-qr' || !pixExpiresAt) return;
    const tick = () => {
      const rem = pixExpiresAt.getTime() - Date.now();
      if (rem <= 0) { setTimeLeft('00:00'); setScreen('pix-expired'); if (pollRef.current) clearInterval(pollRef.current); if (timerRef.current) clearInterval(timerRef.current); return; }
      const m = Math.floor(rem / 60_000).toString().padStart(2, '0');
      const s = Math.floor((rem % 60_000) / 1_000).toString().padStart(2, '0');
      setTimeLeft(`${m}:${s}`);
    };
    tick();
    timerRef.current = setInterval(tick, 1_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen, pixExpiresAt]);

  const startPolling = useCallback((paymentId: string, plan: PremiumPlan) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const check = async () => {
      try {
        const uidParam = uid ? `&uid=${encodeURIComponent(uid)}` : '';
        const res = await fetch(`/api/check-pix?payment_id=${paymentId}${uidParam}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.approved) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ plan, activatedAt: Date.now(), paymentId }));
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setScreen('pix-done');
          onUnlocked?.(plan);
        } else if (data.status === 'cancelled' || data.status === 'rejected') {
          if (pollRef.current) clearInterval(pollRef.current);
          setError('Pagamento cancelado. Tente novamente.');
          setScreen('choose-pay');
        }
      } catch { /* ignora */ }
    };
    check();
    pollRef.current = setInterval(check, PIX_POLL_MS);
  }, [onUnlocked]);

  const handlePixCheckout = async () => {
    setError(''); setScreen('pix-loading');
    try {
      const res = await fetch('/api/create-pix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: selectedPlan }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as any).error || 'Erro ao gerar Pix.'); }
      const data = await res.json();
      setPixPaymentId(data.payment_id); setPixQrCode(data.qr_code); setPixQrBase64(data.qr_code_base64 ?? ''); setPixExpiresAt(new Date(data.expires_at));
      setScreen('pix-qr'); startPolling(data.payment_id, selectedPlan);
    } catch (e: any) { setError(e.message || 'Erro inesperado.'); setScreen('choose-pay'); }
  };

  const handleCardCheckout = async () => {
    setError(''); setScreen('card-loading');
    try {
      const res = await fetch('/api/create-preference', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: selectedPlan }) });
      if (!res.ok) throw new Error('Erro ao conectar com o servidor de pagamento.');
      const data = await res.json();
      const url = data.init_point || data.sandbox_init_point;
      if (!url) throw new Error('Link de pagamento não retornado.');
      localStorage.setItem('cbr_pending_payment', selectedPlan);
      if (uid) localStorage.setItem(PENDING_UID_KEY, uid);
      window.location.href = url;
    } catch (e: any) { setError(e.message || 'Erro inesperado.'); setScreen('choose-pay'); }
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(pixQrCode); setCopied(true); setTimeout(() => setCopied(false), 3_000); } catch { /* silencioso */ }
  };

  const plan = PLANS[selectedPlan];
  const headerGradient = screen === 'pix-done' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : isExpired && screen === 'choose-plan' ? 'bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500' : GRADIENTS[selectedPlan];
  const headerEmoji = screen === 'pix-done' ? '🎉' : screen.startsWith('pix') ? '💸' : plan.emoji;
  const headerTitle = screen === 'pix-done' ? 'Premium Ativado!' : screen === 'pix-qr' ? 'Pague com Pix' : screen === 'pix-expired' ? 'QR Code Expirado' : isExpired ? 'Seu acesso expirou 😔' : templateLabel ? <>Template <span className="text-yellow-300">"{templateLabel}"</span> é Premium</> : <>Desbloqueie o <span className="text-yellow-300">Premium</span></>;
  const headerSub = screen === 'pix-done' ? `Plano ${plan.label} ativado com sucesso! 🚀` : screen === 'pix-qr' ? 'Escaneie no seu banco ou copie o código abaixo' : isExpired ? 'Reative agora e continue criando currículos incríveis' : 'Sem renovação surpresa · sem cadastro · sem e-mail';

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className={`px-7 py-6 text-white relative overflow-hidden ${headerGradient}`}>
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="relative z-10 flex items-start gap-4">
            <div className="text-3xl leading-none mt-0.5">{headerEmoji}</div>
            <div className="flex-1">
              <h2 className="text-lg font-black tracking-tight leading-tight">{headerTitle}</h2>
              <p className="text-white/80 text-xs mt-1">{headerSub}</p>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors shrink-0"><i className="fas fa-times text-sm"></i></button>
          </div>
        </div>

        <div className="px-6 py-5 max-h-[72vh] overflow-y-auto">

          {/* TELA 1 — Escolha do plano */}
          {screen === 'choose-plan' && (
            <>
              {isExpired && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-2xl p-4 mb-4 flex items-center gap-3">
                  <span className="text-2xl">⏰</span>
                  <div>
                    <p className="text-sm font-black text-orange-700 dark:text-orange-400">Seu acesso expirou</p>
                    <p className="text-xs text-orange-600/80 mt-0.5">Reative para continuar com todos os templates</p>
                  </div>
                </div>
              )}

              {/* Comparativo */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Por que CurriculoGO?</p>
                {[['❌','Zety cobra R$150/mês após o trial'],['❌','LiveCareer bloqueia download até pagar'],['✅','Sem renovação automática, sem pegadinha'],['✅','Sem cadastro. Pague e use agora.']].map(([icon, text], i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <span className="text-sm w-5 shrink-0">{icon}</span>
                    <span className={`text-xs ${i < 2 ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300 font-semibold'}`}>{text}</span>
                  </div>
                ))}
              </div>

              {/* Cards 2x2 */}
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                {(['avulso','monthly','yearly','lifetime'] as PremiumPlan[]).map((p) => {
                  const pl = PLANS[p];
                  const isSelected = selectedPlan === p;
                  return (
                    <button key={p} onClick={() => setSelectedPlan(p)}
                      className={`relative rounded-2xl p-3.5 border-2 text-left transition-all shadow-lg dark:shadow-none ${isSelected ? BORDER[p] : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                    >
                      {p === 'yearly' && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-md">✨ Mais popular</div>
                      )}
                      <div className={`text-lg mb-1.5 ${p === 'yearly' ? 'mt-1' : ''}`}>{pl.emoji}</div>
                      <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{pl.label}</p>
                      <div className="flex items-baseline gap-0.5 mt-1">
                        <span className="text-xl font-black text-slate-900 dark:text-white">R${Math.floor(pl.price)}</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">,{(pl.price % 1).toFixed(2).slice(2)}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{pl.period.split('·')[0]}</p>
                      {p === 'yearly' && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Economize 66%</p>}
                      {p === 'lifetime' && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Nunca expira</p>}
                      {isSelected && (
                        <div className={`absolute top-2 right-2 w-4 h-4 ${CHECK_COLOR[p]} rounded-full flex items-center justify-center`}>
                          <i className="fas fa-check text-white text-[7px]"></i>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Features */}
              <div className={`rounded-2xl p-4 mb-4 border ${
                selectedPlan === 'yearly' ? 'bg-violet-50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-900/30' :
                selectedPlan === 'lifetime' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100' :
                selectedPlan === 'monthly' ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100' :
                'bg-blue-50 dark:bg-blue-900/10 border-blue-100'
              }`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2.5 ${
                  selectedPlan === 'yearly' ? 'text-violet-600' : selectedPlan === 'lifetime' ? 'text-amber-600' : selectedPlan === 'monthly' ? 'text-indigo-600' : 'text-blue-600'
                }`}>{plan.emoji} Plano {plan.label} inclui</p>
                <div className="space-y-1.5">
                  {FEATURES[selectedPlan].map(([emoji, text], i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm">{emoji}</span>
                      <span className="text-xs text-slate-700 dark:text-slate-300">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button onClick={() => setScreen('choose-pay')} className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] text-white mb-3 ${CTA_COLOR[selectedPlan]}`}>
                {plan.emoji} Quero o plano {plan.label} — R$ {plan.price.toFixed(2).replace('.', ',')}
              </button>
              <button onClick={onClose} className="w-full py-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors">Agora não, continuar grátis</button>
              <p className="text-center text-[10px] text-slate-300 dark:text-slate-600 mt-3">🔒 Pagamento seguro via Mercado Pago · SSL criptografado</p>
            </>
          )}

          {/* TELA 2 — Método de pagamento */}
          {screen === 'choose-pay' && (
            <>
              <div className={`rounded-2xl p-4 mb-5 border ${selectedPlan === 'yearly' ? 'bg-violet-50 dark:bg-violet-900/10 border-violet-200' : selectedPlan === 'lifetime' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200' : selectedPlan === 'monthly' ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Plano selecionado</p>
                    <p className="font-black text-slate-900 dark:text-white">{plan.emoji} {plan.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{plan.period}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-slate-900 dark:text-white">R$ {plan.price.toFixed(2).replace('.', ',')}</p>
                    <button onClick={() => setScreen('choose-plan')} className="text-[10px] text-blue-600 hover:underline font-bold mt-1">Trocar plano</button>
                  </div>
                </div>
              </div>
              {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-4"><p className="text-xs text-red-600 dark:text-red-400 font-medium">⚠️ {error}</p></div>}
              <button onClick={handlePixCheckout} className="w-full py-4 bg-[#32bcad] hover:bg-[#2aa99a] active:scale-[0.98] text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 mb-3">
                <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor"><path d="M370.3 345.7c-23.4 23.4-54.5 36.3-87.6 36.3s-64.2-12.9-87.6-36.3l-94.3-94.3c-5.1-5.1-13.3-5.1-18.4 0l-64 64c-5.1 5.1-5.1 13.3 0 18.4l94.3 94.3c47.5 47.5 110.6 73.6 177.7 73.6s130.2-26.1 177.7-73.6l94.3-94.3c5.1-5.1 5.1-13.3 0-18.4l-64-64c-5.1-5.1-13.3-5.1-18.4 0l-109.7 94.3zm-202.6-179.4c23.4-23.4 54.5-36.3 87.6-36.3s64.2 12.9 87.6 36.3l94.3 94.3c5.1 5.1 13.3 5.1 18.4 0l64-64c5.1-5.1 5.1-13.3 0-18.4l-94.3-94.3C377.8 36.4 314.7 10.3 247.6 10.3S117.4 36.4 69.9 83.9L-24.4 178.2c-5.1 5.1-5.1 13.3 0 18.4l64 64c5.1 5.1 13.3 5.1 18.4 0l109.7-94.3z"/></svg>
                Pagar com Pix — Instantâneo
              </button>
              <div className="flex items-center gap-3 my-3"><div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ou</span><div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div></div>
              <button onClick={handleCardCheckout} className="w-full py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 border-2 border-slate-200 dark:border-slate-600 hover:border-blue-400 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 mb-3">
                <i className="fas fa-credit-card text-slate-400 text-sm"></i> Cartão de Crédito ou Boleto
              </button>
              <button onClick={() => setScreen('choose-plan')} className="w-full py-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors">← Voltar</button>
              <p className="text-center text-[10px] text-slate-300 dark:text-slate-600 mt-3">🔒 Pagamento seguro via Mercado Pago · SSL criptografado</p>
            </>
          )}

          {/* Carregando */}
          {(screen === 'pix-loading' || screen === 'card-loading') && (
            <div className="flex flex-col items-center py-10 gap-4">
              <div className="w-14 h-14 bg-blue-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                <i className="fas fa-circle-notch fa-spin text-blue-600 text-2xl"></i>
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{screen === 'pix-loading' ? 'Gerando seu QR Code Pix...' : 'Redirecionando para o Mercado Pago...'}</p>
            </div>
          )}

          {/* QR Code Pix */}
          {screen === 'pix-qr' && (
            <div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500">{plan.emoji} {plan.label}</span>
                <span className="font-black text-slate-900 dark:text-white">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">QR Code expira em</span>
                <span className={`text-sm font-black tabular-nums ${timeLeft.startsWith('0') && parseInt(timeLeft.split(':')[1]) < 5 ? 'text-red-500 animate-pulse' : 'text-slate-700 dark:text-white'}`}><i className="fas fa-clock mr-1 text-xs opacity-70"></i>{timeLeft}</span>
              </div>
              <div className="flex justify-center mb-3">
                {pixQrBase64 ? (
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm"><img src={`data:image/png;base64,${pixQrBase64}`} alt="QR Code Pix" className="w-44 h-44" /></div>
                ) : (
                  <div className="w-44 h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center"><i className="fas fa-qrcode text-slate-300 text-6xl"></i></div>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 mb-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <span className="inline-block w-1.5 h-1.5 bg-[#32bcad] rounded-full animate-pulse"></span> Aguardando pagamento automaticamente
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pix copia e cola</p>
              <div className="flex gap-2 mb-4">
                <div className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 overflow-hidden"><p className="text-xs text-slate-500 font-mono truncate select-all">{pixQrCode}</p></div>
                <button onClick={handleCopy} className={`shrink-0 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${copied ? 'bg-green-500 text-white' : 'bg-[#32bcad] hover:bg-[#2aa99a] text-white'}`}>
                  {copied ? <><i className="fas fa-check mr-1"></i>Copiado</> : <><i className="fas fa-copy mr-1"></i>Copiar</>}
                </button>
              </div>
              <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); if (timerRef.current) clearInterval(timerRef.current); setScreen('choose-pay'); }} className="w-full py-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors">← Escolher outro método</button>
            </div>
          )}

          {/* Pix expirado */}
          {screen === 'pix-expired' && (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4"><i className="fas fa-clock text-amber-500 text-2xl"></i></div>
              <p className="font-black text-slate-900 dark:text-white text-base mb-2">QR Code expirou</p>
              <p className="text-sm text-slate-500 mb-6">O código Pix expirou. Clique abaixo para gerar um novo.</p>
              <button onClick={() => { setError(''); setScreen('choose-pay'); }} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg">Gerar novo QR Code</button>
            </div>
          )}

          {/* Sucesso */}
          {screen === 'pix-done' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><i className="fas fa-check-circle text-green-500 text-3xl"></i></div>
              <p className="font-black text-slate-900 dark:text-white text-lg mb-3">Pagamento confirmado!</p>
              <div className={`rounded-2xl px-4 py-3 mb-4 inline-flex items-center gap-2 border ${selectedPlan === 'lifetime' ? 'bg-amber-50 border-amber-200' : selectedPlan === 'yearly' ? 'bg-violet-50 border-violet-200' : selectedPlan === 'monthly' ? 'bg-indigo-50 border-indigo-200' : 'bg-blue-50 border-blue-100'}`}>
                <span className="text-xl">{plan.emoji}</span>
                <span className={`text-sm font-black ${selectedPlan === 'lifetime' ? 'text-amber-700' : selectedPlan === 'yearly' ? 'text-violet-700' : selectedPlan === 'monthly' ? 'text-indigo-700' : 'text-blue-700'}`}>Plano {plan.label} ativado!</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {selectedPlan === 'lifetime' && 'Templates premium liberados para sempre. 🚀'}
                {selectedPlan === 'yearly'   && 'Templates premium liberados por 1 ano.'}
                {selectedPlan === 'monthly'  && 'Templates premium liberados por 30 dias.'}
                {selectedPlan === 'avulso'   && 'Templates premium liberados por 7 dias.'}
              </p>
              <button onClick={onClose} className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg"><i className="fas fa-magic mr-2"></i>Começar a usar →</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
