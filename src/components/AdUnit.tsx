import React, { useEffect, useRef, useState } from 'react';

const CONSENT_KEY = 'curriculogo_cookie_consent';
const CONSENT_EVENT = 'curriculogo_consent_changed';

interface AdUnitProps {
  slotId: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const AdUnit: React.FC<AdUnitProps> = ({
  slotId,
  format = 'auto',
  responsive = true,
  className = '',
  style,
}) => {
  const adRef = useRef<HTMLModElement>(null);

  // Lê o estado inicial do localStorage e mantém reativo via evento customizado
  const [consent, setConsent] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(CONSENT_KEY);
  });

  // Escuta o evento disparado pelo CookieConsent quando o usuário decide
  useEffect(() => {
    const handler = () => {
      setConsent(localStorage.getItem(CONSENT_KEY));
    };
    window.addEventListener(CONSENT_EVENT, handler);
    return () => window.removeEventListener(CONSENT_EVENT, handler);
  }, []);

  // Empurra o anuncio para o AdSense apenas quando consent === 'accepted'
  useEffect(() => {
    if (consent !== 'accepted' || !slotId) return;
    if (typeof window === 'undefined') return;

    try {
      if (adRef.current && !adRef.current.getAttribute('data-adsbygoogle-status')) {
        const adsbygoogle = (window as any).adsbygoogle || [];
        adsbygoogle.push({});
      }
    } catch (e) {
      console.error('AdSense Error:', e);
    }
  }, [consent, slotId]);

  // Nao renderiza NADA enquanto o usuario nao aceitou — nem o <ins> vazio
  if (!slotId || consent !== 'accepted') return null;

  return (
    <div
      className={`ad-container my-6 text-center overflow-hidden min-h-[100px] flex flex-col items-center justify-center ${className}`}
    >
      <span className="text-[10px] text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-2 block w-full text-center">
        Publicidade
      </span>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minWidth: '250px', ...style }}
        data-ad-client="ca-pub-8618931854003885"
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      ></ins>
    </div>
  );
};

export default AdUnit;
