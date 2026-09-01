import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_firebaseAdmin';

/**
 * POST /api/mp-webhook
 *
 * Recebe notificações IPN/Webhook do MercadoPago.
 * Quando um pagamento é aprovado, salva o premium no Firestore —
 * independente de o frontend ter feito polling ou não.
 *
 * Configurar no painel MP → Suas integrações → Webhooks:
 *   URL: https://curriculo-go.vercel.app/api/mp-webhook
 *   Eventos: Pagamentos
 */

const AVULSO_MS  = 7   * 24 * 60 * 60 * 1000;
const MONTHLY_MS = 30  * 24 * 60 * 60 * 1000;
const YEARLY_MS  = 365 * 24 * 60 * 60 * 1000;

function getExpiresAt(plan: string): string | null {
  const now = Date.now();
  if (plan === 'avulso' || plan === 'weekly') return new Date(now + AVULSO_MS).toISOString();
  if (plan === 'monthly')  return new Date(now + MONTHLY_MS).toISOString();
  if (plan === 'yearly')   return new Date(now + YEARLY_MS).toISOString();
  return null; // lifetime
}

async function fetchPayment(paymentId: string) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('MP_ACCESS_TOKEN não configurado');

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`MP API ${res.status}`);
  return res.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // MP envia GET para validar o endpoint e POST com as notificações
  if (req.method === 'GET') return res.status(200).send('ok');
  if (req.method !== 'POST') return res.status(405).end();

  // Aceitar ambos os formatos: IPN (query) e Webhooks (body)
  const paymentId: string =
    String(req.query.id || req.body?.data?.id || req.body?.id || '').trim();

  const topic: string =
    String(req.query.topic || req.body?.type || '').trim();

  // Ignorar eventos que não são de pagamento
  if (topic && topic !== 'payment' && topic !== 'merchant_order') {
    return res.status(200).json({ skipped: true });
  }

  if (!paymentId || !/^\d{1,20}$/.test(paymentId)) {
    return res.status(400).json({ error: 'payment_id inválido' });
  }

  try {
    const payment = await fetchPayment(paymentId);

    if (payment.status !== 'approved') {
      return res.status(200).json({ status: payment.status, action: 'ignored' });
    }

    // Extrair uid e plan da descrição (gravados pelo create-pix / create-preference)
    const description: string = payment.description ?? '';
    const planMatch = description.match(/plan:(\w+)/);
    const uidMatch  = description.match(/uid:([A-Za-z0-9_-]{10,128})/);

    const plan = planMatch?.[1] ?? 'avulso';
    const uid  = uidMatch?.[1] ?? null;

    const VALID = ['avulso', 'monthly', 'yearly', 'lifetime', 'weekly'];
    if (!VALID.includes(plan)) {
      console.warn(`[webhook] plano desconhecido: ${plan}`);
      return res.status(200).json({ warning: 'plano desconhecido' });
    }

    // Salvar no Firestore
    const db = await getDb();
    const doc: Record<string, any> = {
      plan,
      paymentId,
      paymentMethod: payment.payment_type_id ?? 'unknown',
      amount:        payment.transaction_amount ?? null,
      activatedAt:   new Date().toISOString(),
      source:        'webhook',
    };
    const expiresAt = getExpiresAt(plan);
    if (expiresAt) doc.expiresAt = expiresAt;

    if (uid) {
      // Pagamento vinculado a uma conta
      await db.collection('clients_registry').doc(uid).set(doc, { merge: true });
      console.info(`[webhook] premium ${plan} salvo para uid ${uid}`);
    } else {
      // Pagamento sem uid — salva por payment_id para auditoria
      await db.collection('payments_anonymous').doc(paymentId).set(doc);
      console.info(`[webhook] pagamento anônimo ${paymentId} registrado`);
    }

    return res.status(200).json({ ok: true, plan, uid: uid ?? 'anonymous' });
  } catch (err: any) {
    console.error('[webhook] erro:', err.message);
    // Sempre retornar 200 para o MP não retentar em loop
    return res.status(200).json({ error: err.message });
  }
}
