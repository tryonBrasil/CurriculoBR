import React, { useState, useRef } from 'react';

interface Props {
  imageSrc: string;
  onConfirm: (croppedImage: string) => void;
  onCancel: () => void;
}

const PhotoCropModal: React.FC<Props> = ({ imageSrc, onConfirm, onCancel }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleCrop = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !imageRef.current) return;

    // Tamanho final (Alta densidade para impressão)
    const outputSize = 600;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const img = imageRef.current;
    const guideSize = 250; // Tamanho do círculo guia na tela
    const screenToCanvasScale = outputSize / guideSize;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, outputSize, outputSize);
    
    ctx.save();
    
    // 1. Move para o centro do canvas
    ctx.translate(outputSize / 2, outputSize / 2);
    
    // 2. Aplica escala (Zoom do usuário)
    ctx.scale(zoom, zoom);
    
    // 3. Aplica o deslocamento (Offset escalado do visor da tela para o canvas real)
    ctx.translate(offset.x * screenToCanvasScale / zoom, offset.y * screenToCanvasScale / zoom);

    // 4. Calcula dimensões de desenho mantendo aspecto
    const nativeWidth = img.naturalWidth;
    const nativeHeight = img.naturalHeight;
    const aspect = nativeHeight / nativeWidth;
    
    // Desenha mantendo o tamanho base de 250px (visualmente) mas escalado para os 600px do canvas
    const drawWidth = outputSize;
    const drawHeight = outputSize * aspect;

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    
    ctx.restore();

    // Exporta em alta qualidade
    onConfirm(canvas.toDataURL('image/jpeg', 0.95));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-slate-800 uppercase tracking-tight">Ajustar Foto</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
        </div>

        <div className="p-8">
          <div 
            ref={containerRef}
            className="relative w-full aspect-square bg-slate-100 rounded-2xl overflow-hidden cursor-move touch-none flex items-center justify-center"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            {/* Overlay Guia */}
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
               <div className="w-[250px] h-[250px] rounded-full border-2 border-white border-dashed shadow-[0_0_0_9999px_rgba(15,23,42,0.4)]"></div>
            </div>

            <img 
              ref={imageRef}
              src={imageSrc} 
              alt="Crop" 
              className="max-w-none transition-transform duration-75 select-none pointer-events-none"
              style={{ 
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                width: '250px'
              }} 
            />
          </div>

          <div className="mt-8 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="4" 
                step="0.01" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={onCancel}
                className="flex-1 py-3 px-4 border border-slate-200 rounded-xl font-bold text-xs text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCrop}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoCropModal;