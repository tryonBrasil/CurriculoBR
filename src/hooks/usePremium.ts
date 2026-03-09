import { useState, useEffect, useCallback } from 'react';

// ── Chaves de storage ──────────────────────────────────────────────────
const STORAGE_KEY  = 'cbr_premium_v2';
const OWNER_KEY    = 'cbr_owner_v1';
const PENDING_KEY  = 'cbr_pending_payment';

// ── Tipos públicos ─────────────────────────────────────────────────────
export type PremiumPlan = 'avulso' | 'monthly' | 'yearly' | 'lifetime';

export interface PremiumState {
  isPremium: boolean;
  plan: PremiumPlan | null;
  expiresAt: Date | null;
  daysLeft: number | null;
  isExpired: boolean;
}

const AVULSO_MS  = 7  * 24 * 60 * 60 * 1000;   // 7 dias
const MONTHLY_MS = 30 * 24 * 60 * 60 * 1000;   // 30 dias
const YEARLY_MS  = 365 * 24 * 60 * 60 * 1000;  // 365 dias

function getDurationMs(plan: PremiumPlan): number | null {
  if (plan === 'avulso')  return AVULSO_MS;
  if (plan === 'monthly') return MONTHLY_MS;
  if (plan === 'yearly')  return YEARLY_MS;
  return null; // lifetime = sem expiração
}

function loadState(): PremiumState {
  // ── Migração de usuários com plano antigo ──
  if (localStorage.getItem('cbr_premium_v1') === 'true') {
    const paymentId = localStorage.getItem('cbr_premium_payment_id') ?? 'migrated_v1';
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ plan: 'lifetime', activatedAt: Date.now(), paymentId }));
    localStorage.removeItem('cbr_premium_v1');
  }
  // Migra 'weekly' antigo para 'avulso'
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.plan === 'weekly') {
        saved.plan = 'avulso';
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      }
    }
  } catch { /* ignora */ }

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

    const durationMs = getDurationMs(saved.plan);
    if (durationMs) {
      const expiresAt = new Date(saved.activatedAt + durationMs);
      const remaining = expiresAt.getTime() - Date.now();
      if (remaining <= 0) {
        return { isPremium: false, plan: saved.plan, expiresAt, daysLeft: 0, isExpired: true };
      }
      const daysLeft = Math.ceil(remaining / (24 * 60 * 60 * 1000));
      return { isPremium: true, plan: saved.plan, expiresAt, daysLeft, isExpired: false };
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

  useEffect(() => {
    const id = setInterval(() => setState(loadState()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onStorage = () => setState(loadState());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('payment_id');
    const status = params.get('status');
    const pendingValue = localStorage.getItem(PENDING_KEY);
    if (!pendingValue) return;
    const plan: PremiumPlan = (['avulso','monthly','yearly','lifetime'].includes(pendingValue)
      ? pendingValue : 'avulso') as PremiumPlan;
    localStorage.removeItem(PENDING_KEY);
    if (status === 'approved' && paymentId) verifyAndUnlock(paymentId, plan);
    if (paymentId || status) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const unlock = useCallback((plan: PremiumPlan, paymentId: string) => {
    saveState(plan, paymentId);
    setState(loadState());
  }, []);

  const verifyAndUnlock = useCallback(async (paymentId: string, plan: PremiumPlan = 'avulso') => {
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/verify-payment?payment_id=${paymentId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.approved) {
        const resolvedPlan: PremiumPlan = (['avulso','monthly','yearly','lifetime'].includes(data.plan)
          ? data.plan : plan) as PremiumPlan;
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

  // Verifica com o servidor se o uid está na lista de bloqueados.
  // Chamado quando o usuário faz login. Se bloqueado, revoga o premium local.
  const checkAndRevokeIfBlocked = async (uid: string): Promise<boolean> => {
    if (!uid) return false;
    try {
      const res = await fetch(`/api/admin-vip?check=${encodeURIComponent(uid)}`);
      if (!res.ok) return false;
      const data = await res.json();
      if (data.blocked) {
        localStorage.removeItem(STORAGE_KEY);
        setState(loadState());
        return true;
      }
    } catch { /* falha silenciosa — não priva acesso por erro de rede */ }
    return false;
  };

  return {
    ...state,
    isVerifying,
    unlock,
    verifyAndUnlock,
    revokePremium,
    ownerUnlock,
    checkAndRevokeIfBlocked,
    unlockForTesting: () => unlock('lifetime', 'test'),
  };
}
