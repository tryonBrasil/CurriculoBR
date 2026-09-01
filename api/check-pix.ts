import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRateLimiter } from './_rateLimiter';

// check-pix é chamado a cada 5s pelo frontend durante polling.
// Permitimos 30 chamadas por IP a cada 10 min (6 por minuto — suficiente para polling normal).
const rateLimit = createRateLimiter(30, 10 * 60 * 1000);
import { getDb } from './_firebaseAdmin';

/**
 * GET /api/check-pix?payment_id=xxx&uid=yyy
 *
 * Polling endpoint — frontend chama a cada 5s para saber se o Pix foi pago.
 * Quando aprovado, salva o premium no Firestore (clients_registry/{uid})
 * para que o plano fique vinculado à conta, não ao dispositivo.
 *
 * uid é opcional: se ausente, o plano não é salvo no servidor (apenas localStorage).
 */

const AVULSO_MS  = 7   * 24 * 60 * 60 * 1000;
const MONTHLY_MS = 30  * 24 * 60 * 60 * 1000;
const YEARLY_MS  = 365 * 24 * 60 * 60 * 1000;

function getExpiresAt(plan: string): string | null {
  const now = Date.now();
  if (plan === 'avulso' || plan === 'weekly') return new Date(now + AVULSO_MS).toISOString();
  if (plan === 'monthly') return new Date(now + MONTHLY_MS).toISOString();
  if (plan === 'yearly')  return new Date(now + YEARLY_MS).toISOString();
  return null; // lifetime
}

// ── Firebase Admin (lazy init) ─────────────────────────────────────────────

async function savePremiumToFirestore(uid: string, plan: string, paymentId: string) {
  try {
    const db = await getDb();
    await db.collection('clients_registry').doc(uid).set({
      plan,
      isVip:       true,
      isExpired:   false,
      activatedAt: new Date().toISOString(),
      expiresAt:   getExpiresAt(plan),
      paymentId,
    }, { merge: true });
  } catch (e) {
    console.error('[check-pix] Firestore save failed:', (e as any).message);
    // Falha silenciosa — o localStorage ainda ativa o premium no cliente
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { allowed, retryAfter } = rateLimit(req);
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Muitas requisições. Aguarde antes de verificar novamente.' });
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { payment_id, uid } = req.query;

  if (!payment_id || typeof payment_id !== 'string')
    return res.status(400).json({ error: 'payment_id é obrigatório' });
  if (!/^\d{1,20}$/.test(payment_id))
    return res.status(400).json({ error: 'payment_id inválido' });

  const safeUid = (typeof uid === 'string') ? uid.trim().slice(0, 128) : null;

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' });

  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${payment_id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) return res.status(502).json({ error: 'Não foi possível verificar o pagamento' });

    const payment = await response.json();
    const approved = payment.status === 'approved';

    // Se aprovado e temos uid → salvar no Firestore
    if (approved && safeUid) {
      const rawPlan  = payment.metadata?.plan ?? 'avulso';
      const VALID    = ['avulso','monthly','yearly','lifetime','weekly'];
      const plan     = VALID.includes(rawPlan) ? rawPlan : 'avulso';
      await savePremiumToFirestore(safeUid, plan, payment_id);
    }

    return res.status(200).json({
      approved,
      status:        payment.status,
      status_detail: payment.status_detail,
    });
  } catch (error) {
    console.error('check-pix failed:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
