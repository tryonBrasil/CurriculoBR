import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/owner-unlock
 * Body: { secret: string }
 *
 * Verifica a senha do dono (OWNER_SECRET no Vercel) e retorna { ok: true }.
 * O frontend usa isso para gravar o premium no localStorage — igual ao fluxo normal de pagamento.
 *
 * Configure a variável de ambiente OWNER_SECRET no painel do Vercel:
 *   Settings → Environment Variables → OWNER_SECRET = <sua senha secreta>
 *
 * A senha NUNCA aparece no código-fonte nem no bundle do frontend.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ownerSecret = process.env.OWNER_SECRET;

  // Se a variável não foi configurada, bloqueia tudo
  if (!ownerSecret) {
    return res.status(503).json({ error: 'OWNER_SECRET não configurado no servidor.' });
  }

  const { secret } = req.body ?? {};

  if (!secret || typeof secret !== 'string') {
    return res.status(400).json({ error: 'Campo "secret" obrigatório.' });
  }

  // Comparação timing-safe manual (evita timing attacks)
  const a = Buffer.from(secret.padEnd(256));
  const b = Buffer.from(ownerSecret.padEnd(256));
  let diff = 0;
  for (let i = 0; i < 256; i++) diff |= a[i] ^ b[i];

  if (diff !== 0 || secret.length !== ownerSecret.length) {
    // Pequeno delay para desincentivar brute-force
    return new Promise(resolve =>
      setTimeout(() => {
        res.status(401).json({ error: 'Senha incorreta.' });
        resolve(undefined);
      }, 600)
    );
  }

  return res.status(200).json({ ok: true });
}
