import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PremiumModalProps {
  onClose: () => void;
  templateLabel?: string;
  onUnlocked?: () => void;
}

const PREMIUM_BENEFITS = [
  { emoji: '🎨', text: '12 templates exclusivos desbloqueados' },
  { emoji: '♾️', text: 'Acesso vitalício — paga uma vez, usa sempre' },
  { emoji: '📱', text: 'Funciona no celular, tablet e computador' },
  { emoji: '⚡', text: 'Todos os recursos de IA incluídos' },
  { emoji: '🚀', text: 'Novos templates futuros sem custo extra' },
];

const STORAGE_KEY = 'cbr_premium_v1';

type Screen =
  | 'choose'
  | 'pix-loading'
  | 'pix-qr'
  | 'pix-done'
  | 'pix-expired'
  | 'card-loading';

const PIX_POLL_INTERVAL_MS = 5_000;

const PremiumModal: React.FC<PremiumModalProps> = ({ onClose, templateLabel, onUnlocked }) => {
  const [screen, setScreen] = useState<Screen>('choose');
  const [error, setError] = useState('');

  const [pixPaymentId, setPixPaymentId] = useState('');
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixQrBase64, setPixQrBase64] = useState('');
  const [pixExpiresAt, setPixExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [copied, setCopied] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (screen !== 'pix-qr' || !pixExpiresAt) return;

    const tick = () => {
      const remaining = pixExpiresAt.getTime() - Date.now();
      if (remaining <= 0) {
        setTimeLeft('00:00');
        setScreen('pix-expired');
        if (pollRef.current) clearInterval(pollRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      const m = Math.floor(remaining / 60_000).toString().padStart(2, '0');
      const s = Math.floor((remaining % 60_000) / 1_000).toString().padStart(2, '0');
      setTimeLeft(`${m}:${s}`);
    };

    tick();
    timerRef.current = setInterval(tick, 1_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen, pixExpiresAt]);

  const startPolling = useCallback((paymentId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    const check = async () => {
      try {
        const res = await fetch(`/api/check-pix?payment_id=${paymentId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.approved) {
          localStorage.setItem(STORAGE_KEY, 'true');
          localStorage.setItem('cbr_premium_payment_id', paymentId);
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setScreen('pix-done');
          onUnlocked?.();
        } else if (data.status === 'cancelled' || data.status === 'rejected') {
          if (pollRef.current) clearInterval(pollRef.current);
          setError('Pagamento cancelado ou recusado. Tente novamente.');
          setScreen('choose');
        }
      } catch {
        // ignora erros de rede — tenta no próximo tick
      }
    };

    check();
    pollRef.current = setInterval(check, PIX_POLL_INTERVAL_MS);
  }, [onUnlocked]);

  const handlePixCheckout = async () => {
    setError('');
    setScreen('pix-loading');
    try {
      const res = await fetch('/api/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao gerar Pix. Tente outro método.');
      }
      const data = await res.json();
      setPixPaymentId(data.payment_id);
      setPixQrCode(data.qr_code);
      setPixQrBase64(data.qr_code_base64 ?? '');
      setPixExpiresAt(new Date(data.expires_at));
      setScreen('pix-qr');
      startPolling(data.payment_id);
    } catch (e: any) {
      setError(e.message || 'Erro inesperado.');
      setScreen('choose');
    }
  };

  const handleCardCheckout = async () => {
    setError('');
    setScreen('card-loading');
    try {
      const res = await fetch('/api/create-preference', { method: 'POST' });
      if (!res.ok) throw new Error('Erro ao conectar com o servidor de pagamento.');
      const data = await res.json();
      const checkoutUrl = data.init_point || data.sandbox_init_point;
      if (!checkoutUrl) throw new Error('Link de pagamento não retornado.');
      localStorage.setItem('cbr_pending_payment', '1');
      window.location.href = checkoutUrl;
    } catch (e: any) {
      setError(e.message || 'Erro inesperado. Tente novamente.');
      setScreen('choose');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixQrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3_000);
    } catch { /* fallback silencioso */ }
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 px-7 py-6 text-white relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="relative z-10 flex items-start gap-4">
            <div className="text-3xl leading-none mt-0.5">
              {screen === 'pix-done' ? '🎉' : screen === 'pix-qr' || screen === 'pix-loading' ? '💸' : '👑'}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black tracking-tight leading-tight">
                {screen === 'pix-done'
                  ? 'Premium Ativado!'
                  : screen === 'pix-qr'
                  ? 'Pague com Pix'
                  : screen === 'pix-expired'
                  ? 'QR Code Expirado'
                  : templateLabel
                  ? <>Template <span className="text-yellow-300">"{templateLabel}"</span> é Premium</>
                  : <>Desbloqueie o <span className="text-yellow-300">Premium</span></>}
              </h2>
              <p className="text-blue-100 text-xs mt-1">
                {screen === 'pix-done'
                  ? 'Todos os 12 templates estão desbloqueados!'
                  : screen === 'pix-qr'
                  ? 'Escaneie no seu banco ou copie o código abaixo'
                  : 'Pagamento único · sem assinatura · sem surpresa'}
              </p>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors shrink-0">
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        <div className="px-7 py-6">

          {/* TELA: pix-done */}
          {screen === 'pix-done' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-check-circle text-green-500 text-3xl"></i>
              </div>
              <p className="font-black text-slate-900 dark:text-white text-lg mb-2">Pagamento confirmado!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Seus 12 templates premium estão liberados neste dispositivo para sempre.
              </p>
              <button onClick={onClose} className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg">
                <i className="fas fa-magic mr-2"></i>Começar a usar →
              </button>
            </div>
          )}

          {/* TELA: pix-loading */}
          {screen === 'pix-loading' && (
            <div className="flex flex-col items-center py-10 gap-4">
              <div className="w-14 h-14 bg-blue-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                <i className="fas fa-circle-notch fa-spin text-blue-600 text-2xl"></i>
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Gerando seu QR Code Pix...</p>
            </div>
          )}

          {/* TELA: card-loading */}
          {screen === 'card-loading' && (
            <div className="flex flex-col items-center py-10 gap-4">
              <div className="w-14 h-14 bg-blue-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                <i className="fas fa-circle-notch fa-spin text-blue-600 text-2xl"></i>
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Redirecionando para o Mercado Pago...</p>
            </div>
          )}

          {/* TELA: pix-qr */}
          {screen === 'pix-qr' && (
            <div>
              {/* Timer */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expira em</span>
                <span className={`text-sm font-black tabular-nums ${timeLeft.startsWith('0') && parseInt(timeLeft.split(':')[1]) < 5 ? 'text-red-500 animate-pulse' : 'text-slate-700 dark:text-white'}`}>
                  <i className="fas fa-clock mr-1 text-xs opacity-70"></i>{timeLeft}
                </span>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-3">
                {pixQrBase64 ? (
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <img src={`data:image/png;base64,${pixQrBase64}`} alt="QR Code Pix" className="w-44 h-44" />
                  </div>
                ) : (
                  <div className="w-44 h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                    <i className="fas fa-qrcode text-slate-300 dark:text-slate-600 text-6xl"></i>
                  </div>
                )}
              </div>

              {/* Polling indicator */}
              <div className="flex items-center justify-center gap-2 mb-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <span className="inline-block w-1.5 h-1.5 bg-[#32bcad] rounded-full animate-pulse"></span>
                Aguardando pagamento automaticamente
              </div>

              {/* Copia e cola */}
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pix copia e cola</p>
              <div className="flex gap-2 mb-4">
                <div className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 overflow-hidden">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate select-all">{pixQrCode}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className={`shrink-0 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
                    copied ? 'bg-green-500 text-white' : 'bg-[#32bcad] hover:bg-[#2aa99a] text-white'
                  }`}
                >
                  {copied ? <><i className="fas fa-check mr-1"></i>Copiado</> : <><i className="fas fa-copy mr-1"></i>Copiar</>}
                </button>
              </div>

              {/* Valor */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">Valor</span>
                <span className="font-black text-slate-900 dark:text-white">R$ 9,90</span>
              </div>

              <button
                onClick={() => {
                  if (pollRef.current) clearInterval(pollRef.current);
                  if (timerRef.current) clearInterval(timerRef.current);
                  setScreen('choose');
                }}
                className="w-full py-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                ← Escolher outro método
              </button>
            </div>
          )}

          {/* TELA: pix-expired */}
          {screen === 'pix-expired' && (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-clock text-amber-500 text-2xl"></i>
              </div>
              <p className="font-black text-slate-900 dark:text-white text-base mb-2">QR Code expirado</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">O código Pix expirou após 30 minutos. Clique abaixo para gerar um novo.</p>
              <button
                onClick={() => { setError(''); setScreen('choose'); }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg"
              >
                Gerar novo QR Code
              </button>
            </div>
          )}

          {/* TELA: choose */}
          {screen === 'choose' && (
            <>
              <ul className="space-y-2.5 mb-5">
                {PREMIUM_BENEFITS.map((b, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="text-base w-6 text-center">{b.emoji}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{b.text}</span>
                  </li>
                ))}
              </ul>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 mb-5 text-center border border-blue-100 dark:border-blue-800/40">
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Acesso vitalício por</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-slate-400 text-sm line-through">R$ 29,90</span>
                  <span className="text-4xl font-black text-slate-900 dark:text-white">R$ 9,90</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Pagamento único · sem assinatura</p>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-4">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">⚠️ {error}</p>
                </div>
              )}

              {/* PIX — destaque */}
              <button
                onClick={handlePixCheckout}
                className="w-full py-4 bg-[#32bcad] hover:bg-[#2aa99a] active:scale-[0.98] text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 mb-3"
              >
                <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor">
                  <path d="M370.3 345.7c-23.4 23.4-54.5 36.3-87.6 36.3s-64.2-12.9-87.6-36.3l-94.3-94.3c-5.1-5.1-13.3-5.1-18.4 0l-64 64c-5.1 5.1-5.1 13.3 0 18.4l94.3 94.3c47.5 47.5 110.6 73.6 177.7 73.6s130.2-26.1 177.7-73.6l94.3-94.3c5.1-5.1 5.1-13.3 0-18.4l-64-64c-5.1-5.1-13.3-5.1-18.4 0l-109.7 94.3zm-202.6-179.4c23.4-23.4 54.5-36.3 87.6-36.3s64.2 12.9 87.6 36.3l94.3 94.3c5.1 5.1 13.3 5.1 18.4 0l64-64c5.1-5.1 5.1-13.3 0-18.4l-94.3-94.3C377.8 36.4 314.7 10.3 247.6 10.3S117.4 36.4 69.9 83.9L-24.4 178.2c-5.1 5.1-5.1 13.3 0 18.4l64 64c5.1 5.1 13.3 5.1 18.4 0l109.7-94.3z"/>
                </svg>
                Pagar com Pix — Instantâneo
              </button>

              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ou</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
              </div>

              <button
                onClick={handleCardCheckout}
                className="w-full py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-blue-400 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2.5"
              >
                <i className="fas fa-credit-card text-slate-400 text-sm"></i>
                Cartão de Crédito ou Boleto
              </button>

              <button onClick={onClose} className="w-full mt-3 py-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors">
                Agora não, continuar grátis
              </button>

              <p className="text-center text-[10px] text-slate-300 dark:text-slate-600 mt-3">
                🔒 Pagamento seguro via Mercado Pago · SSL criptografado
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
