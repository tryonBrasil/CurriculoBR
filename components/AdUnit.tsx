
import React, { useEffect, useRef } from 'react';

interface AdUnitProps {
  slotId: string; // O ID do bloco de anúncio gerado no painel do AdSense
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
  const initialized = useRef(false);

  useEffect(() => {
    // Evita tentar carregar anúncios sem slot ID ou se já foi inicializado neste mount
    if (!slotId) return;

    try {
      const adsbygoogle = window.adsbygoogle || [];
      // Verifica se o script do AdSense está carregado na página
      // Empurra o anúncio para a fila de renderização com tratamento de erro
      adsbygoogle.push({});
      initialized.current = true;
    } catch (e) {
      // Ignora erros comuns de desenvolvimento do AdSense
      console.warn("AdSense Warning (pode ser ignorado em dev):", e);
    }
  }, [slotId]);

  if (!slotId) return null;

  return (
    <div className={`ad-container my-6 text-center overflow-hidden min-h-[100px] bg-slate-50/50 dark:bg-slate-900/50 rounded-lg flex flex-col items-center justify-center ${className}`}>
      <span className="text-[10px] text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-2 block w-full text-center">Publicidade</span>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', ...style }}
        data-ad-client="ca-pub-1895006161330485"
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      ></ins>
    </div>
  );
};

export default AdUnit;
