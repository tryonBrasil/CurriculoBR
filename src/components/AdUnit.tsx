import React, { useEffect, useRef } from 'react';

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
  style 
}) => {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    // 1. Só executa se houver o slotId e se o script do Google já existir na janela
    if (typeof window !== 'undefined' && slotId) {
      try {
        // Verifica se o elemento já foi processado pelo Google (evita o erro 'All ins elements must be empty')
        // O AdSense adiciona um atributo 'data-adsbygoogle-status' após processar
        if (adRef.current && !adRef.current.getAttribute('data-adsbygoogle-status')) {
          const adsbygoogle = (window as any).adsbygoogle || [];
          adsbygoogle.push({});
        }
      } catch (e) {
        console.error("AdSense Error:", e);
      }
    }
  }, [slotId]); // Re-executa se o slot mudar (útil se você alternar tipos de ads)

  if (!slotId) return null;

  return (
    <div 
      className={`ad-container my-6 text-center overflow-hidden min-h-[100px] flex flex-col items-center justify-center ${className}`}
      // A key ajuda o React a entender que este é um elemento novo se o slot mudar
      key={slotId} 
    >
      <span className="text-[10px] text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-2 block w-full text-center">
        Publicidade
      </span>
      
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minWidth: '250px', ...style }}
        data-ad-client="ca-pub-1895006161330485"
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      ></ins>
    </div>
  );
};

export default AdUnit;
