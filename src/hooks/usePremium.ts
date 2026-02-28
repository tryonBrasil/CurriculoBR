import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cbr_premium_v1';
const PENDING_KEY = 'cbr_pending_payment';

export function usePremium() {
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [isVerifying, setIsVerifying] = useState(false);

  // Verifica pagamento ao voltar do Mercado Pago
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('payment_id');
    const status = params.get('status');
    const hasPending = localStorage.getItem(PENDING_KEY);

    if (!hasPending) return;

    // Remove o flag de pendente
    localStorage.removeItem(PENDING_KEY);

    // Se o MP já retornou status approved na URL
    if (status === 'approved' && paymentId) {
      verifyAndUnlock(paymentId);
    }

    // Limpa os params da URL para ficar limpa
    if (paymentId || status) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const verifyAndUnlock = useCallback(async (paymentId: string) => {
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/verify-payment?payment_id=${paymentId}`);
      if (!res.ok) throw new Error('Erro na verificação');
      const data = await res.json();
      if (data.approved) {
        localStorage.setItem(STORAGE_KEY, 'true');
        localStorage.setItem('cbr_premium_payment_id', paymentId);
        setIsPremium(true);
      }
    } catch (e) {
      console.error('Falha ao verificar pagamento:', e);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  // Para testar localmente: expõe unlock manual
  const unlockForTesting = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsPremium(true);
  }, []);

  const revokePremium = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('cbr_premium_payment_id');
    setIsPremium(false);
  }, []);

  return { isPremium, isVerifying, unlockForTesting, revokePremium };
}
