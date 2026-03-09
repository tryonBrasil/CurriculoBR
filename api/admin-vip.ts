import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * /api/admin-vip — Gerenciamento de VIP bloqueados
 *
 * Rotas:
 *   GET  /api/admin-vip?check=<uid>            — público: verifica se UID está bloqueado
 *   GET  /api/admin-vip                         — admin: lista todos os bloqueados
 *   POST /api/admin-vip { action, uid, email, reason } — admin: bloquear ou desbloquear
 *
 * Autenticação admin: header  Authorization: Bearer <OWNER_SECRET>
 *
 * Variáveis de ambiente necessárias (Vercel → Settings → Environment Variables):
 *   OWNER_SECRET                — senha do painel do dono
 *   FIREBASE_ADMIN_PROJECT_ID   — ex: curriculogo-12345
 *   FIREBASE_ADMIN_CLIENT_EMAIL — ex: firebase-adminsdk-xxx@projeto.iam.gserviceaccount.com
 *   FIREBASE_ADMIN_PRIVATE_KEY  — chave privada da service account (cole com as quebras de linha)
 *
 * Como obter as credenciais Firebase Admin:
 *   Firebase Console → Configurações do projeto → Contas de serviço → Gerar nova chave privada
 */

const VIP_COLLECTION = 'vip_blocks';

// ── Firebase Admin (lazy init, compatível com Vercel Serverless) ──────────────
let adminInitialized = false;

async function getFirestoreAdmin() {
  // firebase-admin: adicione ao package.json → "firebase-admin": "^12.0.0"
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  if (!adminInitialized && !getApps().length) {
    const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase Admin não configurado. ' +
        'Adicione FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY no Vercel.'
      );
    }

    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    adminInitialized = true;
  }

  return getFirestore();
}

// ── Rate limiting simples (in-memory, suficiente para Vercel por região) ──────
const adminAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now  = Date.now();
  const rec  = adminAttempts.get(ip);
  const WINDOW = 15 * 60 * 1000;
  const MAX    = 20;

  if (rec && now < rec.resetAt) {
    if (rec.count >= MAX) return false;
    rec.count++;
  } else {
    adminAttempts.set(ip, { count: 1, resetAt: now + WINDOW });
  }
  return true;
}

function getIP(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  return typeof fwd === 'string' ? fwd.split(',')[0].trim() : 'unknown';
}

// ── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── Rota pública: checar se UID está bloqueado ──────────────────────
  if (req.method === 'GET' && req.query.check) {
    const uid = String(req.query.check).slice(0, 128);
    if (!uid) return res.status(400).json({ error: 'uid inválido.' });

    try {
      const db  = await getFirestoreAdmin();
      const doc = await db.collection(VIP_COLLECTION).doc(uid).get();
      return res.status(200).json({ blocked: doc.exists });
    } catch (e: any) {
      console.error('[vip-check]', e.message);
      return res.status(200).json({ blocked: false }); // falha silenciosa — não priva acesso
    }
  }

  // ── Rotas protegidas: requer Authorization: Bearer <OWNER_SECRET> ───
  if (!checkRateLimit(getIP(req))) {
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde e tente novamente.' });
  }

  const ownerSecret = process.env.OWNER_SECRET;
  const auth        = req.headers.authorization;

  if (!ownerSecret) {
    return res.status(503).json({ error: 'OWNER_SECRET não configurado no servidor.' });
  }

  if (!auth || auth !== `Bearer ${ownerSecret}`) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  let db: any;
  try {
    db = await getFirestoreAdmin();
  } catch (e: any) {
    return res.status(503).json({ error: e.message });
  }

  // ── GET /api/admin-vip — listar todos os bloqueados ─────────────────
  if (req.method === 'GET') {
    try {
      const snap    = await db.collection(VIP_COLLECTION).orderBy('blockedAt', 'desc').get();
      const blocked = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      return res.status(200).json({ blocked, total: blocked.length });
    } catch (e: any) {
      return res.status(500).json({ error: 'Erro ao listar bloqueados: ' + e.message });
    }
  }

  // ── POST /api/admin-vip — bloquear ou desbloquear ───────────────────
  if (req.method === 'POST') {
    const { action, uid, email, reason } = req.body ?? {};

    if (!action || !uid || typeof uid !== 'string') {
      return res.status(400).json({ error: '"action" e "uid" são obrigatórios.' });
    }

    const safeUid    = uid.trim().slice(0, 128);
    const safeEmail  = (email  ?? '').toString().slice(0, 254);
    const safeReason = (reason ?? 'Pagamento não realizado').toString().slice(0, 200);

    if (action === 'block') {
      await db.collection(VIP_COLLECTION).doc(safeUid).set({
        uid:       safeUid,
        email:     safeEmail,
        reason:    safeReason,
        blockedAt: new Date().toISOString(),
        blockedBy: 'owner',
      });
      return res.status(200).json({ ok: true, message: `VIP de ${safeEmail || safeUid} bloqueado.` });
    }

    if (action === 'unblock') {
      const docRef = db.collection(VIP_COLLECTION).doc(safeUid);
      const doc    = await docRef.get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Usuário não encontrado na lista de bloqueados.' });
      }
      await docRef.delete();
      return res.status(200).json({ ok: true, message: `VIP de ${safeEmail || safeUid} desbloqueado.` });
    }

    return res.status(400).json({ error: 'action deve ser "block" ou "unblock".' });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
