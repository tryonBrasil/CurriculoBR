import { useState, useEffect, useCallback } from 'react';

// ── Chaves de storage ──────────────────────────────────────────────────
const STORAGE_KEY  = 'cbr_premium_v2';   // { plan, activatedAt, paymentId }
const OWNER_KEY    = 'cbr_owner_v1';
const PENDING_KEY  = 'cbr_pending_payment';

// ── Tipos públicos ─────────────────────────────────────────────────────
export type PremiumPlan = 'weekly' | 'lifetime';

export interface PremiumState {
  isPremium: boolean;
  plan: PremiumPlan | null;
  expiresAt: Date | null;
  daysLeft: number | null;
  isExpired: boolean;
}

const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;

function loadState(): PremiumState {
  if (localStorage.getItem(OWNER_KEY) === 'true') {
    return { isPremium: true, plan: 'lifetime', expiresAt: null, daysLeft: null, isExpired: false };
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { isPremium: false, plan: null, expiresAt: null, daysLeft: null, isExpired: false };

  try {
    const saved = JSON.parse(raw) as { plan: PremiumPlan; activatedAt: number; paymentId?: string };

    if (saved.plan === 'lifetime') {
      return { isPremium: true, plan: 'lifetime', expiresAt: null, daysLeft: null, isExpired: false };
    }

    if (saved.plan === 'weekly') {
      const expiresAt = new Date(saved.activatedAt + WEEKLY_MS);
      const remaining = expiresAt.getTime() - Date.now();
      if (remaining <= 0) {
        return { isPremium: false, plan: 'weekly', expiresAt, daysLeft: 0, isExpired: true };
      }
      const daysLeft = Math.ceil(remaining / (24 * 60 * 60 * 1000));
      return { isPremium: true, plan: 'weekly', expiresAt, daysLeft, isExpired: false };
    }
  } catch { /* JSON corrompido */ }

  return { isPremium: false, plan: null, expiresAt: null, daysLeft: null, isExpired: false };
}

function saveState(plan: PremiumPlan, paymentId: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ plan, activatedAt: Date.now(), paymentId }));
}

export function usePremium() {
  const [state, setState] = useState<PremiumState>(loadState);
  const [isVerifying, setIsVerifying] = useState(false);

  // Reavalia a cada minuto
  useEffect(() => {
    const id = setInterval(() => setState(loadState()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Sync entre abas
  useEffect(() => {
    const onStorage = () => setState(loadState());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Retorno do Mercado Pago via cartão
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('payment_id');
    const status = params.get('status');
    const plan = (params.get('plan') as PremiumPlan | null) ?? 'weekly';
    const hasPending = localStorage.getItem(PENDING_KEY);
    if (!hasPending) return;
    localStorage.removeItem(PENDING_KEY);
    if (status === 'approved' && paymentId) verifyAndUnlock(paymentId, plan);
    if (paymentId || status) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const unlock = useCallback((plan: PremiumPlan, paymentId: string) => {
    saveState(plan, paymentId);
    setState(loadState());
  }, []);

  const verifyAndUnlock = useCallback(async (paymentId: string, plan: PremiumPlan = 'weekly') => {
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/verify-payment?payment_id=${paymentId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.approved) {
        const resolvedPlan: PremiumPlan = data.plan === 'lifetime' ? 'lifetime' : plan;
        unlock(resolvedPlan, paymentId);
      }
    } catch { console.error('Falha ao verificar pagamento'); }
    finally { setIsVerifying(false); }
  }, [unlock]);

  const revokePremium = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(OWNER_KEY);
    setState(loadState());
  }, []);

  const ownerUnlock = useCallback(async (secret: string): Promise<{ ok: boolean; error?: string }> => {
    if (!secret.trim()) return { ok: false, error: 'Digite a senha.' };
    try {
      const res = await fetch('/api/owner-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        localStorage.setItem(OWNER_KEY, 'true');
        setState(loadState());
        return { ok: true };
      }
      return { ok: false, error: data.error || 'Senha incorreta.' };
    } catch { return { ok: false, error: 'Erro de conexão.' }; }
  }, []);

  return {
    ...state,
    isVerifying,
    unlock,
    verifyAndUnlock,
    revokePremium,
    ownerUnlock,
    unlockForTesting: () => unlock('lifetime', 'test'),
  };
}
