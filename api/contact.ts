import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRateLimiter } from './_rateLimiter';
import { timingSafeEqual } from 'crypto';

/**
 * /api/contact
 *
 * POST { nome, email, mensagem }  — público: envia mensagem
 * GET  /api/contact               — admin: lista mensagens
 * POST { action:'delete', id }    — admin: apaga mensagem
 */

// 3 mensagens por IP a cada hora
const rateLimit = createRateLimiter(3, 60 * 60 * 1000);

function safeCompareBearer(received: string | undefined, secret: string): boolean {
  if (!received) return false;
  const expected = `Bearer ${secret}`;
  try {
    const a = Buffer.from(received.padEnd(512));
    const b = Buffer.from(expected.padEnd(512));
    return timingSafeEqual(a, b) && received.length === expected.length;
  } catch { return false; }
}

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const siteUrl = process.env.SITE_URL || 'https://curriculo-go.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', siteUrl);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── GET: listar mensagens (admin) ─────────────────────────────────────────
  if (req.method === 'GET') {
    const ownerSecret = process.env.OWNER_SECRET;
    if (!ownerSecret || !safeCompareBearer(req.headers.authorization, ownerSecret)) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }
    try {
      const db   = await getDb();
      const snap = await db.collection('contact_messages')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
      const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.status(200).json({ messages });
    } catch (e: any) {
      // Sem índice: fallback sem orderBy
      try {
        const db   = await getDb();
        const snap = await db.collection('contact_messages').limit(100).get();
        const messages = snap.docs
          .map(d => ({ id: d.id, ...d.data() as any }))
          .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
        return res.status(200).json({ messages });
      } catch (e2: any) {
        return res.status(500).json({ error: e2.message });
      }
    }
  }

  // ── POST ──────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { action } = req.body ?? {};

    // Deletar mensagem (admin)
    if (action === 'delete') {
      const ownerSecret = process.env.OWNER_SECRET;
      if (!ownerSecret || !safeCompareBearer(req.headers.authorization, ownerSecret)) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const { id } = req.body;
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id obrigatório.' });
      try {
        const db = await getDb();
        await db.collection('contact_messages').doc(id.trim().slice(0, 64)).delete();
        return res.status(200).json({ ok: true });
      } catch (e: any) {
        return res.status(500).json({ error: e.message });
      }
    }

    // Envio público
    const { allowed, retryAfter } = rateLimit(req);
    if (!allowed) {
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: `Muitas tentativas. Aguarde ${retryAfter} segundos.` });
    }

    const { nome, email, mensagem } = req.body ?? {};

    if (!nome || typeof nome !== 'string' || nome.trim().length < 2)
      return res.status(400).json({ error: 'Nome inválido.' });
    if (!email || typeof email !== 'string' || !email.includes('@'))
      return res.status(400).json({ error: 'E-mail inválido.' });
    if (!mensagem || typeof mensagem !== 'string' || mensagem.trim().length < 10)
      return res.status(400).json({ error: 'Mensagem muito curta (mínimo 10 caracteres).' });
    if (mensagem.trim().length > 2000)
      return res.status(400).json({ error: 'Mensagem muito longa (máximo 2000 caracteres).' });

    const doc = {
      nome:      nome.trim().slice(0, 100),
      email:     email.trim().slice(0, 200),
      mensagem:  mensagem.trim().slice(0, 2000),
      lida:      false,
      createdAt: new Date().toISOString(),
    };

    try {
      const db = await getDb();
      await db.collection('contact_messages').add(doc);
      return res.status(201).json({ ok: true, message: 'Mensagem enviada com sucesso!' });
    } catch (e: any) {
      return res.status(500).json({ error: 'Erro ao salvar. Tente novamente.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
