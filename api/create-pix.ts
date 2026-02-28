import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/create-pix
 * Body: { email?: string }
 *
 * Cria um pagamento Pix via API do Mercado Pago e retorna:
 *   { payment_id, qr_code, qr_code_base64, expires_at }
 *
 * O frontend exibe o QR code inline (sem redirecionar o usuário)
 * e faz polling em /api/check-pix?payment_id=xxx para detectar aprovação.
 *
 * Requer: MP_ACCESS_TOKEN no Vercel (mesma variável do checkout normal).
 * A conta MP precisa ter Pix habilitado (chave Pix cadastrada no MP).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' });
  }

  // Email do pagador — MP exige para Pix. Usamos um genérico se não fornecido.
  const { email } = req.body ?? {};
  const payerEmail = (typeof email === 'string' && email.includes('@'))
    ? email
    : 'comprador@curriculobr.com.br';

  // Expiração em 30 minutos a partir de agora
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        // Idempotency key baseada no timestamp — evita duplicatas em retentativas
        'X-Idempotency-Key': `cbr-pix-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: 9.90,
        description: 'CurriculoBR Premium — Acesso Vitalício',
        payment_method_id: 'pix',
        date_of_expiration: expiresAt,
        payer: {
          email: payerEmail,
        },
        metadata: {
          product: 'curriculo-br-premium',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('MP Pix Error:', errText);
      return res.status(502).json({ error: 'Erro ao criar pagamento Pix no Mercado Pago' });
    }

    const payment = await response.json();

    const qrCode = payment.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64;

    if (!qrCode) {
      console.error('MP Pix: qr_code não retornado', JSON.stringify(payment));
      return res.status(502).json({ error: 'QR Code Pix não gerado. Verifique se sua conta MP tem Pix habilitado.' });
    }

    return res.status(200).json({
      payment_id: String(payment.id),
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64 ?? null,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error('Pix creation failed:', error);
    return res.status(500).json({ error: 'Erro interno ao criar Pix' });
  }
}
