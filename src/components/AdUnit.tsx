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
  const pushed = useRef(false);

  const [consent, setConsent] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(CONSENT_KEY);
  });

  // Escuta mudança de consentimento
  useEffect(() => {
    const handler = () => setConsent(localStorage.getItem(CONSENT_KEY));
    window.addEventListener(CONSENT_EVENT, handler);
    return () => window.removeEventListener(CONSENT_EVENT, handler);
  }, []);

  // Empurra o anúncio ao AdSense assim que o componente monta.
  // O anúncio é exibido SEMPRE — não personalizado por padrão (NPA),
  // personalizado somente após o usuário aceitar os cookies.
  // Isso garante que o revisor do Google veja os anúncios na primeira visita.
  useEffect(() => {
    if (!slotId || typeof window === 'undefined') return;
    if (pushed.current) return;
    pushed.current = true;

    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      ((window as any).adsbygoogle as any[]).push({});
    } catch (e) {
      console.error('AdSense Error:', e);
    }
  }, [slotId]);

  if (!slotId) return null;

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
