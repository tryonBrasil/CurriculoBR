import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/check-pix?payment_id=xxx
 *
 * Polling endpoint — o frontend chama a cada 5 segundos para saber se o Pix foi pago.
 * Retorna: { approved: boolean, status: string }
 *
 * É intencionalmente simples: só retorna o necessário para o frontend agir.
 * Reutiliza a mesma lógica do verify-payment.ts, mas separado para semântica clara.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { payment_id } = req.query;
  if (!payment_id || typeof payment_id !== 'string') {
    return res.status(400).json({ error: 'payment_id é obrigatório' });
  }
  // Valida formato: apenas dígitos (IDs do Mercado Pago são numéricos)
  if (!/^\d{1,20}$/.test(payment_id)) {
    return res.status(400).json({ error: 'payment_id inválido' });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' });
  }

  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${payment_id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      return res.status(502).json({ error: 'Não foi possível verificar o pagamento' });
    }

    const payment = await response.json();

    return res.status(200).json({
      approved: payment.status === 'approved',
      status: payment.status,           // pending | approved | cancelled | rejected
      status_detail: payment.status_detail,
    });
  } catch (error) {
    console.error('check-pix failed:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
