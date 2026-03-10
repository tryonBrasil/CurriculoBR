import { useState, useEffect, useCallback } from 'react';

// ── Chaves de storage ──────────────────────────────────────────────────
const STORAGE_KEY  = 'cbr_premium_v2';
const PENDING_KEY  = 'cbr_pending_payment';

// OWNER_KEY REMOVIDA intencionalmente.
// O acesso de dono vive APENAS em estado React (memória da sessão).
// Vantagens:
//   • Nenhum rastro no localStorage — DevTools não revela nada
//   • Desaparece automaticamente ao fechar/recarregar a aba
//   • Não pode ser ativado manualmente por qualquer usuário

// ── Tipos públicos ─────────────────────────────────────────────────────
export type PremiumPlan = 'avulso' | 'monthly' | 'yearly' | 'lifetime';

export interface PremiumState {
  isPremium: boolean;
  plan: PremiumPlan | null;
  expiresAt: Date | null;
  daysLeft: number | null;
  isExpired: boolean;
}

const AVULSO_MS  = 7  * 24 * 60 * 60 * 1000;
const MONTHLY_MS = 30 * 24 * 60 * 60 * 1000;
const YEARLY_MS  = 365 * 24 * 60 * 60 * 1000;

function getDurationMs(plan: PremiumPlan): number | null {
  if (plan === 'avulso')  return AVULSO_MS;
  if (plan === 'monthly') return MONTHLY_MS;
  if (plan === 'yearly')  return YEARLY_MS;
  return null;
}

// loadState lê APENAS plano pago — nunca mais o OWNER_KEY
function loadState(): PremiumState {
  // Migração v1 → v2
  if (localStorage.getItem('cbr_premium_v1') === 'true') {
    const paymentId = localStorage.getItem('cbr_premium_payment_id') ?? 'migrated_v1';
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ plan: 'lifetime', activatedAt: Date.now(), paymentId }));
    localStorage.removeItem('cbr_premium_v1');
  }
  // Migra 'weekly' → 'avulso'
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

  // Remove chave legada do dono (se ainda existir de versões antigas)
  localStorage.removeItem('cbr_owner_v1');

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

// Estado VIP virtual do dono — não persiste em lugar nenhum
const OWNER_PREMIUM_STATE: PremiumState = {
  isPremium: true,
  plan: 'lifetime',
  expiresAt: null,
  daysLeft: null,
  isExpired: false,
};

export function usePremium() {
  const [state, setState]                 = useState<PremiumState>(loadState);
  const [isVerifying, setIsVerifying]     = useState(false);
  // ── ACESSO DE DONO: apenas React state, zero localStorage ───────────
  const [isOwnerAccessActive, setIsOwner] = useState(false);

  // O que o app enxerga: se o dono estiver ativo, sobrepõe o plano real
  const effectiveState = isOwnerAccessActive ? OWNER_PREMIUM_STATE : state;

  useEffect(() => {
    const id = setInterval(() => {
      if (!isOwnerAccessActive) setState(loadState());
    }, 60_000);
    return () => clearInterval(id);
  }, [isOwnerAccessActive]);

  useEffect(() => {
    const onStorage = () => {
      if (!isOwnerAccessActive) setState(loadState());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isOwnerAccessActive]);

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const paymentId = params.get('payment_id');
    const status    = params.get('status');
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
      const res  = await fetch(`/api/verify-payment?payment_id=${paymentId}`);
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
    setIsOwner(false);
    setState(loadState());
  }, []);

  // ownerUnlock: confirma senha com o servidor e ativa APENAS em memória
  const ownerUnlock = useCallback(async (secret: string): Promise<{ ok: boolean; error?: string }> => {
    if (!secret.trim()) return { ok: false, error: 'Digite a senha.' };
    try {
      const res  = await fetch('/api/owner-unlock', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setIsOwner(true); // ← só React state, zero localStorage
        return { ok: true };
      }
      return { ok: false, error: data.error || 'Senha incorreta.' };
    } catch { return { ok: false, error: 'Erro de conexão.' }; }
  }, []);

  // toggleOwnerAccess: liga/desliga sem tocar no localStorage
  const toggleOwnerAccess = useCallback(() => {
    setIsOwner(prev => !prev);
  }, []);

  // Verifica se o uid está bloqueado pelo admin
  const checkAndRevokeIfBlocked = async (uid: string): Promise<boolean> => {
    if (!uid) return false;
    try {
      const res  = await fetch(`/api/admin-vip?check=${encodeURIComponent(uid)}`);
      if (!res.ok) return false;
      const data = await res.json();
      if (data.blocked) {
        localStorage.removeItem(STORAGE_KEY);
        setIsOwner(false);
        setState(loadState());
        return true;
      }
    } catch { /* falha silenciosa */ }
    return false;
  };

  // Consulta o servidor para ver se o admin ativou um plano manualmente
  const syncPlanFromServer = async (uid: string): Promise<void> => {
    if (!uid || isOwnerAccessActive) return;
    try {
      const res  = await fetch(`/api/admin-clients?status=${encodeURIComponent(uid)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.found || !data.isVip || data.isExpired) return;

      const localRaw = localStorage.getItem(STORAGE_KEY);
      const local    = localRaw ? JSON.parse(localRaw) : null;

      const serverPlanRank: Record<string, number> = { avulso: 1, monthly: 2, yearly: 3, lifetime: 4 };
      const serverRank = serverPlanRank[data.plan] ?? 0;
      const localRank  = local?.plan ? (serverPlanRank[local.plan] ?? 0) : 0;

      if (serverRank > localRank || !local) {
        const activatedAt = data.activatedAt ? new Date(data.activatedAt).getTime() : Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          plan:      data.plan,
          activatedAt,
          paymentId: data.paymentId ?? 'server_sync',
        }));
        setState(loadState());
      }
    } catch { /* falha silenciosa */ }
  };

  // Sincroniza apenas dados de perfil (sem premium — servidor ignora mesmo)
  const syncClientToServer = async (
    user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }
  ) => {
    if (!user?.uid) return;
    try {
      await fetch('/api/admin-clients', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:      'sync',
          uid:         user.uid,
          email:       user.email       ?? '',
          displayName: user.displayName ?? '',
          photoURL:    user.photoURL    ?? '',
        }),
      });
    } catch { /* falha silenciosa */ }
  };

  return {
    ...effectiveState,
    isVerifying,
    isOwnerAccessActive,
    unlock,
    verifyAndUnlock,
    revokePremium,
    ownerUnlock,
    toggleOwnerAccess,
    checkAndRevokeIfBlocked,
    syncPlanFromServer,
    syncClientToServer,
    unlockForTesting: () => unlock('lifetime', 'test'),
  };
}
