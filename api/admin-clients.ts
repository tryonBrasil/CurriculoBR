import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'crypto';

function safeCompareBearer(received: string | undefined, secret: string): boolean {
  if (!received) return false;
  const expected = `Bearer ${secret}`;
  try {
    const a = Buffer.from(received.padEnd(512));
    const b = Buffer.from(expected.padEnd(512));
    return timingSafeEqual(a, b) && received.length === expected.length;
  } catch { return false; }
}

/**
 * /api/admin-clients — Registro de clientes e status VIP
 *
 * Rotas:
 *   POST /api/admin-clients { action:'sync', uid, email, displayName, photoURL, premium }
 *     → público (chamado pelo app quando o usuário faz login ou ativa premium)
 *     → cria/atualiza o registro do cliente no Firestore
 *
 *   GET  /api/admin-clients
 *     → protegido (Bearer <OWNER_SECRET>)
 *     → lista todos os clientes com status VIP + stats
 *
 * Coleção Firestore: clients_registry/{uid}
 */

const CLIENTS_COLLECTION = 'clients_registry';
const AVULSO_MS  = 7   * 24 * 60 * 60 * 1000;
const MONTHLY_MS = 30  * 24 * 60 * 60 * 1000;
const YEARLY_MS  = 365 * 24 * 60 * 60 * 1000;

function getExpiresAt(plan: string, activatedAt: number): Date | null {
  if (plan === 'lifetime') return null;
  if (plan === 'avulso' || plan === 'weekly') return new Date(activatedAt + AVULSO_MS);
  if (plan === 'monthly') return new Date(activatedAt + MONTHLY_MS);
  if (plan === 'yearly')  return new Date(activatedAt + YEARLY_MS);
  return null;
}

// ── Firebase Admin ──────────────────────────────────────────────────────────
let adminReady = false;

async function getDb() {
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  if (!adminReady && !getApps().length) {
    const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase Admin não configurado. Adicione FIREBASE_ADMIN_PROJECT_ID, ' +
        'FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY no Vercel.'
      );
    }
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    adminReady = true;
  }
  return getFirestore();
}

// Rate limit: 1 sync por minuto por uid (evita flood)
const syncLimiter = new Map<string, number>();
function canSync(uid: string): boolean {
  const now = Date.now();
  if (now - (syncLimiter.get(uid) ?? 0) < 60_000) return false;
  syncLimiter.set(uid, now);
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.SITE_URL || 'https://curriculo-go.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── POST: sync | set-plan ─────────────────────────────────────────
  if (req.method === 'POST') {
    const { action, uid, email, displayName, photoURL, premium, plan: bodyPlan } = req.body ?? {};

    if (!action || !uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'Parâmetros inválidos.' });
    }

    // ── set-plan: requer autenticação admin ───────────────────────────
    if (action === 'set-plan') {
      const ownerSecretSP = process.env.OWNER_SECRET;
      const authSP        = req.headers.authorization;
      if (!ownerSecretSP || !safeCompareBearer(authSP, ownerSecretSP)) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      let dbSP: any;
      try { dbSP = await getDb(); }
      catch (e: any) { return res.status(503).json({ error: e.message }); }

      const safeUidSP  = uid.trim().slice(0, 128);
      const docRefSP   = dbSP.collection(CLIENTS_COLLECTION).doc(safeUidSP);
      const existingSP = await docRefSP.get();
      if (!existingSP.exists) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }

      const VALID_PLANS_SP = ['avulso', 'monthly', 'yearly', 'lifetime'];

      if (!bodyPlan || bodyPlan === 'free') {
        await docRefSP.set({
          plan: null, isVip: false, isExpired: false,
          activatedAt: null, expiresAt: null, paymentId: null,
        }, { merge: true });
        return res.status(200).json({ ok: true, message: 'Plano removido com sucesso.' });
      }

      if (!VALID_PLANS_SP.includes(bodyPlan)) {
        return res.status(400).json({ error: 'Plano inválido. Use: avulso, monthly, yearly, lifetime ou free.' });
      }

      const activatedAtSP = Date.now();
      const expiresAtSP   = getExpiresAt(bodyPlan, activatedAtSP);

      await docRefSP.set({
        plan:        bodyPlan,
        isVip:       true,
        isExpired:   false,
        activatedAt: new Date(activatedAtSP).toISOString(),
        expiresAt:   expiresAtSP ? expiresAtSP.toISOString() : null,
        paymentId:   'manual_owner',
      }, { merge: true });

      return res.status(200).json({ ok: true, message: `Plano ${bodyPlan} ativado com sucesso.` });
    }

    // ── sync: público ─────────────────────────────────────────────────
    if (action !== 'sync') {
      return res.status(400).json({ error: 'Ação inválida.' });
    }

    // Sync: salva APENAS dados de perfil — status VIP NUNCA aceito do cliente
    // (evita que qualquer pessoa mande premium:{plan:'lifetime'} e se torne VIP)
    const safeUid = uid.trim().slice(0, 128);
    if (!canSync(safeUid)) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    let db: any;
    try { db = await getDb(); }
    catch (e: any) { return res.status(503).json({ error: e.message }); }

    const now      = new Date().toISOString();
    const docRef   = db.collection(CLIENTS_COLLECTION).doc(safeUid);
    const existing = await docRef.get();

    // Apenas dados de perfil — nunca plan/isVip/paymentId do cliente
    const record: Record<string, any> = {
      uid:         safeUid,
      email:       (email       ?? existing.data()?.email       ?? '').toString().slice(0, 254),
      displayName: (displayName ?? existing.data()?.displayName ?? '').toString().slice(0, 128),
      photoURL:    (photoURL    ?? existing.data()?.photoURL    ?? '').toString().slice(0, 512),
      lastSeen:    now,
    };

    if (!existing.exists) record.createdAt = now;

    await docRef.set(record, { merge: true });
    return res.status(200).json({ ok: true });
  }



  // ── GET: status do cliente (público) — ?status=<uid> ──────────────
  // Chamado pelo app no login para verificar se o dono ativou um plano manualmente
  if (req.method === 'GET' && req.query.status) {
    const uid = String(req.query.status).slice(0, 128);
    if (!uid) return res.status(400).json({ error: 'uid inválido.' });

    try {
      const db  = await getDb();
      const doc = await db.collection(CLIENTS_COLLECTION).doc(uid).get();

      if (!doc.exists) return res.status(200).json({ found: false });

      const d = doc.data() ?? {};
      return res.status(200).json({
        found:       true,
        plan:        d['plan']        ?? null,
        isVip:       d['isVip']       ?? false,
        isExpired:   d['isExpired']   ?? false,
        activatedAt: d['activatedAt'] ?? null,
        expiresAt:   d['expiresAt']   ?? null,
        paymentId:   d['paymentId']   ?? null,
      });
    } catch (e: any) {
      console.error('[status-check]', e.message);
      return res.status(200).json({ found: false }); // falha silenciosa
    }
  }

  // ── GET: lista clientes (admin) ────────────────────────────────────
  if (req.method === 'GET') {
    const ownerSecret = process.env.OWNER_SECRET;
    const auth        = req.headers.authorization;

    if (!ownerSecret) return res.status(503).json({ error: 'OWNER_SECRET não configurado.' });
    if (!safeCompareBearer(auth, ownerSecret)) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }

    let db: any;
    try { db = await getDb(); }
    catch (e: any) { return res.status(503).json({ error: e.message }); }

    try {
      const snap    = await db.collection(CLIENTS_COLLECTION).orderBy('lastSeen', 'desc').get();
      const clients = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

      const stats = {
        total:    clients.length,
        vip:      clients.filter((c: any) => c.isVip).length,
        expired:  clients.filter((c: any) => c.isExpired && !c.isVip).length,
        free:     clients.filter((c: any) => !c.isVip && !c.isExpired && !c.plan).length,
        lifetime: clients.filter((c: any) => c.plan === 'lifetime' && c.isVip).length,
        yearly:   clients.filter((c: any) => c.plan === 'yearly'   && c.isVip).length,
        monthly:  clients.filter((c: any) => c.plan === 'monthly'  && c.isVip).length,
        avulso:   clients.filter((c: any) => (c.plan === 'avulso' || c.plan === 'weekly') && c.isVip).length,
      };

      return res.status(200).json({ clients, stats });
    } catch (e: any) {
      return res.status(500).json({ error: 'Erro ao listar clientes: ' + e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
