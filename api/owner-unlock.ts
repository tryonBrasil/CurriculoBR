import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/owner-unlock
 * Body: { secret: string }
 *
 * Rate limiting: máx 5 tentativas por IP a cada 15 minutos (in-memory).
 * Em produção com múltiplas instâncias Vercel, use Redis/KV para compartilhar o estado.
 */

// Rate limit in-memory (suficiente para Vercel serverless — instância única por região)
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS    = 15 * 60 * 1000; // 15 minutos

function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return (req as any).socket?.remoteAddress ?? 'unknown';
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Rate limiting ────────────────────────────────────────────────────
  const ip  = getClientIP(req);
  const now = Date.now();
  const rec = attempts.get(ip);

  if (rec) {
    if (now < rec.resetAt) {
      if (rec.count >= MAX_ATTEMPTS) {
        const retryAfter = Math.ceil((rec.resetAt - now) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({ error: `Muitas tentativas. Tente novamente em ${Math.ceil(retryAfter / 60)} minutos.` });
      }
      rec.count++;
    } else {
      attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    }
  } else {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }

  // ── Validação ────────────────────────────────────────────────────────
  const ownerSecret = process.env.OWNER_SECRET;
  if (!ownerSecret) {
    return res.status(503).json({ error: 'OWNER_SECRET não configurado no servidor.' });
  }

  const { secret } = req.body ?? {};
  if (!secret || typeof secret !== 'string') {
    return res.status(400).json({ error: 'Campo "secret" obrigatório.' });
  }

  // Comparação timing-safe (evita timing attacks)
  const a = Buffer.from(secret.padEnd(256));
  const b = Buffer.from(ownerSecret.padEnd(256));
  let diff = 0;
  for (let i = 0; i < 256; i++) diff |= a[i] ^ b[i];

  if (diff !== 0 || secret.length !== ownerSecret.length) {
    return new Promise(resolve =>
      setTimeout(() => {
        res.status(401).json({ error: 'Senha incorreta.' });
        resolve(undefined);
      }, 600)
    );
  }

  // Sucesso — zera o contador desse IP
  attempts.delete(ip);
  return res.status(200).json({ ok: true });
}
