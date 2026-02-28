import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' });
  }

  // URL base da aplicação (Vercel injeta automaticamente em produção)
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:5173';

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            id: 'curriculo-br-premium',
            title: 'CurriculoBR Premium — Acesso Vitalício',
            description: 'Desbloqueio de todos os 10 templates premium para sempre neste dispositivo',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: 9.9,
          },
        ],
        payment_methods: {
          excluded_payment_types: [],
          installments: 1, // Pagamento único, sem parcelamento
        },
        back_urls: {
          success: `${baseUrl}/premium-success`,
          failure: `${baseUrl}/premium-failure`,
          pending: `${baseUrl}/premium-pending`,
        },
        auto_return: 'approved',
        // Metadata para rastreamento
        metadata: {
          product: 'curriculo-br-premium',
        },
        // Expiração de 30 min para não deixar links velhos ativos
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('MP Error:', err);
      return res.status(502).json({ error: 'Erro ao criar preferência no Mercado Pago' });
    }

    const data = await response.json();

    // Retorna apenas o necessário para o frontend
    return res.status(200).json({
      id: data.id,
      init_point: data.init_point,       // URL de checkout (produção)
      sandbox_init_point: data.sandbox_init_point, // URL sandbox (dev)
    });
  } catch (error) {
    console.error('Preference creation failed:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
