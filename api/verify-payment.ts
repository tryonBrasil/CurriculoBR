import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { payment_id } = req.query;

  if (!payment_id || typeof payment_id !== 'string') {
    return res.status(400).json({ error: 'payment_id é obrigatório' });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' });
  }

  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${payment_id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return res.status(502).json({ error: 'Não foi possível verificar o pagamento' });
    }

    const payment = await response.json();

    // Retorna apenas status e produto — nunca dados sensíveis do comprador
    return res.status(200).json({
      status: payment.status,           // approved | pending | rejected
      status_detail: payment.status_detail,
      approved: payment.status === 'approved',
      product: payment.metadata?.product ?? null,
    });
  } catch (error) {
    console.error('Payment verify failed:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
