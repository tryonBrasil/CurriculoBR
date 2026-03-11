import type { VercelRequest } from '@vercel/node';

/**
 * Rate limiter simples em memória para Serverless Functions.
 * Limite: maxRequests por windowMs por IP.
 *
 * Nota: em múltiplas instâncias Vercel o estado não é compartilhado,
 * mas cada instância ainda protege contra bursts locais.
 */

interface Entry { count: number; resetAt: number; }

export function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, Entry>();

  // Limpeza periódica para evitar memory leak
  setInterval(() => {
    const now = Date.now();
    store.forEach((v, k) => { if (v.resetAt < now) store.delete(k); });
  }, windowMs * 2);

  return function check(req: VercelRequest): { allowed: boolean; retryAfter: number } {
    const ip = (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown'
    );

    const now    = Date.now();
    const entry  = store.get(ip);

    if (!entry || entry.resetAt < now) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfter: 0 };
    }

    if (entry.count >= maxRequests) {
      return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
    }

    entry.count++;
    return { allowed: true, retryAfter: 0 };
  };
}
