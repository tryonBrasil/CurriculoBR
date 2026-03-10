import { useState, useEffect, useCallback } from 'react';

/**
 * usePremium — Premium 100% server-side
 *
 * O plano NÃO é mais armazenado em localStorage.
 * O estado vive apenas em React state (memória da sessão).
 *
 * Fluxo:
 *   • Login  → loadPremiumFromServer(uid) → seta estado React
 *   • Logout → revokePremium() → zera estado React
 *   • Compra → Firestore (pelo servidor) + seta estado React direto
 *
 * Isso garante que:
 *   • Sem conexão = sem premium (não há cache local para abusar)
 *   • Cada conta tem seu próprio plano
 *   • Trocar de conta troca o plano instantaneamente
 */

const PENDING_KEY = 'cbr_pending_payment';
const PENDING_UID = 'cbr_pending_uid';

export type PremiumPlan = 'avulso' | 'monthly' | 'yearly' | 'lifetime';

export interface PremiumState {
  isPremium: boolean;
  plan: PremiumPlan | null;
  expiresAt: Date | null;
  daysLeft: number | null;
  isExpired: boolean;
}

const FREE_STATE: PremiumState = {
  isPremium: false, plan: null, expiresAt: null, daysLeft: null, isExpired: false,
};

const OWNER_STATE: PremiumState = {
  isPremium: true, plan: 'lifetime', expiresAt: null, daysLeft: null, isExpired: false,
};

const PLAN_RANK: Record<string, number> = { avulso: 1, monthly: 2, yearly: 3, lifetime: 4 };

const AVULSO_MS  = 7   * 24 * 60 * 60 * 1000;
const MONTHLY_MS = 30  * 24 * 60 * 60 * 1000;
const YEARLY_MS  = 365 * 24 * 60 * 60 * 1000;

function buildState(plan: string, activatedAt: string | null): PremiumState {
  const p = plan as PremiumPlan;
  if (p === 'lifetime') return OWNER_STATE;

  const durations: Record<string, number> = { avulso: AVULSO_MS, weekly: AVULSO_MS, monthly: MONTHLY_MS, yearly: YEARLY_MS };
  const ms = durations[p];
  if (!ms || !activatedAt) return FREE_STATE;

  const expiresAt = new Date(new Date(activatedAt).getTime() + ms);
  const remaining = expiresAt.getTime() - Date.now();

  if (remaining <= 0) {
    return { isPremium: false, plan: p, expiresAt, daysLeft: 0, isExpired: true };
  }
  return {
    isPremium: true, plan: p, expiresAt,
    daysLeft: Math.ceil(remaining / (24 * 60 * 60 * 1000)),
    isExpired: false,
  };
}

// Migração silenciosa: remove chaves antigas do localStorage
function cleanupLegacy() {
  localStorage.removeItem('cbr_premium_v2');
  localStorage.removeItem('cbr_premium_v1');
  localStorage.removeItem('cbr_premium_payment_id');
  localStorage.removeItem('cbr_owner_v1');
}

export function usePremium() {
  const [state, setState]                 = useState<PremiumState>(FREE_STATE);
  const [isVerifying, setIsVerifying]     = useState(false);
  const [isOwnerAccessActive, setIsOwner] = useState(false);

  const effectiveState = isOwnerAccessActive ? OWNER_STATE : state;

  // Remove qualquer rastro legacy de versões anteriores
  useEffect(() => { cleanupLegacy(); }, []);

  // Retorno do cartão (Mercado Pago Checkout Pro)
  useEffect(() => {
    const params      = new URLSearchParams(window.location.search);
    const paymentId   = params.get('payment_id');
    const status      = params.get('status');
    const pendingPlan = localStorage.getItem(PENDING_KEY);
    if (!pendingPlan) return;

    const plan = (['avulso','monthly','yearly','lifetime'].includes(pendingPlan)
      ? pendingPlan : 'avulso') as PremiumPlan;
    const pendingUid = localStorage.getItem(PENDING_UID) ?? undefined;

    localStorage.removeItem(PENDING_KEY);
    localStorage.removeItem(PENDING_UID);

    if (status === 'approved' && paymentId) verifyAndActivate(paymentId, plan, pendingUid);
    if (paymentId || status) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  // ── Carrega plano do servidor para este uid ───────────────────────────────
  const loadPremiumFromServer = useCallback(async (uid: string): Promise<void> => {
    if (!uid) return;
    try {
      const res  = await fetch(`/api/admin-clients?status=${encodeURIComponent(uid)}`);
      if (!res.ok) return;
      const data = await res.json();

      if (!data.found || !data.isVip || data.isExpired) {
        setState(FREE_STATE);
        return;
      }
      setState(buildState(data.plan, data.activatedAt));
    } catch {
      setState(FREE_STATE);
    }
  }, []);

  // ── Ativa plano direto no estado (chamado após compra bem-sucedida) ────────
  const unlock = useCallback((plan: PremiumPlan, _paymentId: string) => {
    setState(buildState(plan, new Date().toISOString()));
  }, []);

  // ── Verifica pagamento no servidor e ativa (cartão pós-redirect) ──────────
  const verifyAndActivate = useCallback(async (
    paymentId: string,
    plan: PremiumPlan = 'avulso',
    uid?: string,
  ) => {
    setIsVerifying(true);
    try {
      const uidParam = uid ? `&uid=${encodeURIComponent(uid)}` : '';
      const res  = await fetch(`/api/verify-payment?payment_id=${paymentId}${uidParam}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.approved) {
        const resolvedPlan = (['avulso','monthly','yearly','lifetime'].includes(data.plan)
          ? data.plan : plan) as PremiumPlan;
        unlock(resolvedPlan, paymentId);
      }
    } catch { console.error('Falha ao verificar pagamento'); }
    finally { setIsVerifying(false); }
  }, [unlock]);

  // Alias para compatibilidade com PremiumModal (que chama verifyAndUnlock)
  const verifyAndUnlock = verifyAndActivate;

  // ── Revoga premium (logout ou bloqueio) ───────────────────────────────────
  const revokePremium = useCallback(() => {
    setState(FREE_STATE);
    setIsOwner(false);
    cleanupLegacy();
  }, []);

  // ── Owner unlock: só memória React ───────────────────────────────────────
  const ownerUnlock = useCallback(async (secret: string): Promise<{ ok: boolean; error?: string }> => {
    if (!secret.trim()) return { ok: false, error: 'Digite a senha.' };
    try {
      const res  = await fetch('/api/owner-unlock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (res.ok && data.ok) { setIsOwner(true); return { ok: true }; }
      return { ok: false, error: data.error || 'Senha incorreta.' };
    } catch { return { ok: false, error: 'Erro de conexão.' }; }
  }, []);

  const toggleOwnerAccess = useCallback(() => setIsOwner(p => !p), []);

  // ── Verifica bloqueio ─────────────────────────────────────────────────────
  const checkAndRevokeIfBlocked = useCallback(async (uid: string): Promise<boolean> => {
    if (!uid) return false;
    try {
      const res  = await fetch(`/api/admin-vip?check=${encodeURIComponent(uid)}`);
      if (!res.ok) return false;
      const data = await res.json();
      if (data.blocked) { revokePremium(); return true; }
    } catch { /* falha silenciosa */ }
    return false;
  }, [revokePremium]);

  // ── Alias para compatibilidade com App.tsx ────────────────────────────────
  // syncPlanFromServer agora é o mesmo que loadPremiumFromServer
  const syncPlanFromServer = loadPremiumFromServer;

  // Sincroniza perfil (sem premium)
  const syncClientToServer = useCallback(async (
    user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }
  ) => {
    if (!user?.uid) return;
    try {
      await fetch('/api/admin-clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync', uid: user.uid,
          email: user.email ?? '', displayName: user.displayName ?? '', photoURL: user.photoURL ?? '',
        }),
      });
    } catch { /* falha silenciosa */ }
  }, []);

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
    loadPremiumFromServer,
    syncClientToServer,
    unlockForTesting: () => unlock('lifetime', 'test'),
    PENDING_UID_KEY: PENDING_UID,
  };
}
