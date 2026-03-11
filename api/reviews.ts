import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'crypto';

/**
 * /api/reviews
 *
 * GET  /api/reviews                        — público: lista aprovados (máx. 30)
 * GET  /api/reviews?pending=1              — admin: lista pendentes
 * POST /api/reviews { name, role, city, stars, text } — público: envia depoimento
 * POST /api/reviews { action, id, ... }    — admin: aprovar / rejeitar
 */

const COLLECTION = 'reviews';

function safeCompareBearer(received: string | undefined, secret: string): boolean {
  if (!received) return false;
  const expected = `Bearer ${secret}`;
  try {
    const a = Buffer.from(received.padEnd(512));
    const b = Buffer.from(expected.padEnd(512));
    return timingSafeEqual(a, b) && received.length === expected.length;
  } catch { return false; }
}

// Rate limit por IP: 1 envio por hora
const submitLimiter = new Map<string, number>();
function canSubmit(ip: string): boolean {
  const now = Date.now();
  if (now - (submitLimiter.get(ip) ?? 0) < 60 * 60 * 1000) return false;
  submitLimiter.set(ip, now);
  return true;
}
function getIP(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  return typeof fwd === 'string' ? fwd.split(',')[0].trim() : 'unknown';
}

// Firebase Admin
let adminReady = false;
async function getDb() {
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  if (!adminReady && !getApps().length) {
    const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) throw new Error('Firebase Admin não configurado.');
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    adminReady = true;
  }
  return getFirestore();
}

// Filtro básico anti-spam (palavras proibidas)
const BLOCKED = ['puta','viado','merda','caralho','porra','foda','buceta','cu ','vsf','fdp','safado'];
function hasSpam(text: string): boolean {
  const t = text.toLowerCase();
  return BLOCKED.some(w => t.includes(w));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const siteUrl = process.env.SITE_URL || 'https://curriculo-go.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', siteUrl);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── GET: listar depoimentos ───────────────────────────────────────────────
  if (req.method === 'GET') {
    const isPending = req.query.pending === '1';

    // Pendentes: exige autenticação admin
    if (isPending) {
      const ownerSecret = process.env.OWNER_SECRET;
      if (!ownerSecret || !safeCompareBearer(req.headers.authorization, ownerSecret)) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
    }

    try {
      const db   = await getDb();
      // Sem orderBy para evitar necessidade de índice composto no Firestore
      // A ordenação é feita em memória após o get()
      const snap = await db.collection(COLLECTION)
        .where('status', '==', isPending ? 'pending' : 'approved')
        .limit(isPending ? 50 : 30)
        .get();

      const reviews = snap.docs
        .map(d => ({ id: d.id, ...d.data() as any }))
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
      return res.status(200).json({ reviews });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── POST ──────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { action } = req.body ?? {};

    // ── Ação admin: aprovar / rejeitar ──────────────────────────────────────
    if (action === 'approve' || action === 'reject' || action === 'delete') {
      const ownerSecret = process.env.OWNER_SECRET;
      if (!ownerSecret || !safeCompareBearer(req.headers.authorization, ownerSecret)) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      const { id } = req.body;
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id obrigatório.' });
      const safeId = id.trim().slice(0, 64);

      try {
        const db  = await getDb();
        const ref = db.collection(COLLECTION).doc(safeId);
        if (action === 'delete' || action === 'reject') {
          await ref.delete();
          return res.status(200).json({ ok: true, message: 'Depoimento removido.' });
        }
        await ref.update({ status: 'approved', approvedAt: new Date().toISOString() });
        return res.status(200).json({ ok: true, message: 'Depoimento aprovado.' });
      } catch (e: any) {
        return res.status(500).json({ error: e.message });
      }
    }

    // ── Envio público de novo depoimento ─────────────────────────────────────
    if (!canSubmit(getIP(req))) {
      return res.status(429).json({ error: 'Você já enviou um depoimento recentemente. Tente mais tarde.' });
    }

    const { name, role, city, stars, text } = req.body ?? {};

    // Validação
    if (!name || typeof name !== 'string' || name.trim().length < 2)
      return res.status(400).json({ error: 'Nome inválido.' });
    if (!text || typeof text !== 'string' || text.trim().length < 20)
      return res.status(400).json({ error: 'Depoimento muito curto (mínimo 20 caracteres).' });
    if (text.trim().length > 400)
      return res.status(400).json({ error: 'Depoimento muito longo (máximo 400 caracteres).' });
    if (!stars || typeof stars !== 'number' || stars < 1 || stars > 5)
      return res.status(400).json({ error: 'Avaliação inválida.' });
    if (hasSpam(text) || hasSpam(name))
      return res.status(400).json({ error: 'Conteúdo não permitido.' });

    const COLORS = ['from-blue-500 to-cyan-600','from-pink-500 to-rose-600','from-violet-500 to-purple-600',
                    'from-green-500 to-emerald-600','from-amber-500 to-orange-600','from-indigo-500 to-blue-600'];

    const doc = {
      name:        name.trim().slice(0, 60),
      role:        (role ?? '').toString().trim().slice(0, 60),
      city:        (city ?? '').toString().trim().slice(0, 60),
      stars:       Math.round(stars),
      text:        text.trim().slice(0, 400),
      avatar:      name.trim()[0].toUpperCase(),
      color:       COLORS[Math.floor(Math.random() * COLORS.length)],
      status:      'pending',   // owner aprova antes de publicar
      createdAt:   new Date().toISOString(),
      approvedAt:  null,
    };

    try {
      const db  = await getDb();
      const ref = await db.collection(COLLECTION).add(doc);
      return res.status(201).json({ ok: true, id: ref.id, message: 'Depoimento enviado! Será publicado após revisão.' });
    } catch (e: any) {
      return res.status(500).json({ error: 'Erro ao salvar. Tente novamente.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
