
import React, { useState, useEffect, useRef } from 'react';
import { TemplateId } from '../types';
import { MOCK_RESUME_DATA } from '../constants';
import ResumePreview from './ResumePreview';

interface Props {
  template: TemplateId;
  className?: string;
  fontSize?: number;
}

const TemplateThumbnail: React.FC<Props> = React.memo(({ template, className = "w-20 h-24", fontSize = 18 }) => {
  const [scale, setScale] = useState(0.08);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      // Verificação de segurança para compatibilidade
      if (!entries || entries.length === 0) return;

      for (const entry of entries) {
        if (entry.contentRect) {
          // 794px é a largura base A4 a 96DPI
          const width = entry.contentRect.width;
          if (width > 0) {
            const newScale = width / 794;
            setScale(newScale);
          }
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`overflow-hidden bg-white border border-slate-200 dark:border-slate-700 rounded-lg relative shrink-0 shadow-sm group-hover:border-blue-400 transition-colors ${className}`}>
      <div 
        className="origin-top-left absolute top-0 left-0 pointer-events-none select-none" 
        style={{ 
            transform: `scale(${scale}) translateZ(0)`, 
            width: '210mm', 
            height: '297mm',
            backfaceVisibility: 'hidden',
            WebkitFontSmoothing: 'subpixel-antialiased',
            MozOsxFontSmoothing: 'grayscale'
        }}
      >
        <ResumePreview data={MOCK_RESUME_DATA} template={template} fontSize={fontSize} />
      </div>
      <div className="absolute inset-0 bg-transparent z-10"></div>
    </div>
  );
});

export default TemplateThumbnail;
