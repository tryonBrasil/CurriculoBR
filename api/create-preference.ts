import type { VercelRequest, VercelResponse } from '@vercel/node';

const PLANS: Record<string, { price: number; title: string; description: string }> = {
  avulso: {
    price:       9.90,
    title:       'CurriculoGO Premium — 7 Dias de Acesso',
    description: 'Desbloqueio de todos os templates premium por 7 dias. Sem renovação automática.',
  },
  monthly: {
    price:       14.90,
    title:       'CurriculoGO Premium — Mensal',
    description: 'Desbloqueio de todos os templates premium por 30 dias.',
  },
  yearly: {
    price:       59.90,
    title:       'CurriculoGO Premium — Anual',
    description: 'Desbloqueio de todos os templates premium por 1 ano. Equivale a R$4,99/mês.',
  },
  lifetime: {
    price:       29.90,
    title:       'CurriculoGO Premium — Acesso Vitalício',
    description: 'Desbloqueio de todos os templates premium para sempre neste dispositivo.',
  },
  // Compatibilidade com plano antigo
  weekly: {
    price:       9.90,
    title:       'CurriculoGO Premium — 7 Dias de Acesso',
    description: 'Desbloqueio de todos os templates premium por 7 dias.',
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

  // Ignora qualquer price/amount enviado pelo cliente — preço definido exclusivamente no servidor
  const { plan = 'avulso' } = req.body ?? {};
  const resolvedPlan = (['avulso','monthly','yearly','lifetime','weekly'].includes(plan) ? plan : 'avulso') as string;
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
          id:          `curriculogo-${resolvedPlan}`,
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
        metadata: { product: 'curriculogo-premium', plan: resolvedPlan, version: '2' },
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    });

    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignora */ }
      console.error('MP Error:', response.status, errBody);

      if (response.status === 401) {
        return res.status(502).json({ error: 'Token do MercadoPago inválido ou expirado. Verifique MP_ACCESS_TOKEN no Vercel.' });
      }
      if (response.status === 400) {
        // Extrair mensagem do MP se possível
        try {
          const mp = JSON.parse(errBody);
          const detail = mp?.cause?.[0]?.description || mp?.message || 'Dados inválidos';
          return res.status(502).json({ error: `MercadoPago: ${detail}` });
        } catch { /* ignora */ }
      }
      return res.status(502).json({ error: `Erro ${response.status} no MercadoPago. Tente via Pix.` });
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
