import type { VercelRequest, VercelResponse } from '@vercel/node';

const PLANS: Record<string, { price: number; title: string; description: string }> = {
  weekly: {
    price:       7.99,
    title:       'CurrículoNexT Premium — 7 Dias de Acesso',
    description: 'Desbloqueio de todos os templates premium por 7 dias. Sem renovação automática.',
  },
  lifetime: {
    price:       19.99,
    title:       'CurrículoNexT Premium — Acesso Vitalício',
    description: 'Desbloqueio de todos os templates premium para sempre neste dispositivo.',
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' });

  const baseUrl =
    process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:5173');

  const { plan = 'weekly' } = req.body ?? {};
  const resolvedPlan = plan === 'lifetime' ? 'lifetime' : 'weekly';
  const { price, title, description } = PLANS[resolvedPlan];

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: [{
          id:          `curriculo-next-${resolvedPlan}`,
          title,
          description,
          quantity:    1,
          currency_id: 'BRL',
          unit_price:  price,
        }],
        payment_methods: {
          installments: 1,  // pagamento único
        },
        back_urls: {
          success: `${baseUrl}/premium-success`,
          failure: `${baseUrl}/premium-failure`,
          pending: `${baseUrl}/premium-pending`,
        },
        auto_return: 'approved',
        metadata: { product: 'curriculo-next-premium', plan: resolvedPlan },
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('MP Error:', err);
      return res.status(502).json({ error: 'Erro ao criar preferência no Mercado Pago' });
    }

    const data = await response.json();
    return res.status(200).json({
      id:                 data.id,
      init_point:         data.init_point,
      sandbox_init_point: data.sandbox_init_point,
      plan:               resolvedPlan,
    });
  } catch (error) {
    console.error('Preference creation failed:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
