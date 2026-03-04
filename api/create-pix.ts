import type { VercelRequest, VercelResponse } from '@vercel/node';

const PRICES: Record<string, number> = {
  avulso:   9.90,
  monthly:  14.90,
  yearly:   59.90,
  lifetime: 29.90,
  weekly:   9.90,
  lifetime: 19.99,
};

const DESCRIPTIONS: Record<string, string> = {
  weekly:   'CurriculoGO Premium — 7 Dias de Acesso',
  lifetime: 'CurriculoGO Premium — Acesso Vitalício',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' });

  const { email, plan = 'weekly' } = req.body ?? {};
  const resolvedPlan = plan === 'lifetime' ? 'lifetime' : 'weekly';
  const price       = PRICES[resolvedPlan];
  const description = DESCRIPTIONS[resolvedPlan];

  const payerEmail = (typeof email === 'string' && email.includes('@'))
    ? email
    : 'comprador@curriculogo.com.br';

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': `cbr-pix-${resolvedPlan}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: price,
        description,
        payment_method_id: 'pix',
        date_of_expiration: expiresAt,
        payer: { email: payerEmail },
        metadata: { product: 'curriculogo-premium', plan: resolvedPlan },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('MP Pix Error:', errText);
      return res.status(502).json({ error: 'Erro ao criar pagamento Pix no Mercado Pago' });
    }

    const payment   = await response.json();
    const qrCode    = payment.point_of_interaction?.transaction_data?.qr_code;
    const qrBase64  = payment.point_of_interaction?.transaction_data?.qr_code_base64;

    if (!qrCode) {
      return res.status(502).json({ error: 'QR Code Pix não gerado. Verifique se sua conta MP tem Pix habilitado.' });
    }

    return res.status(200).json({
      payment_id:      String(payment.id),
      qr_code:         qrCode,
      qr_code_base64:  qrBase64 ?? null,
      expires_at:      expiresAt,
      plan:            resolvedPlan,
    });
  } catch (error) {
    console.error('Pix creation failed:', error);
    return res.status(500).json({ error: 'Erro interno ao criar Pix' });
  }
}
