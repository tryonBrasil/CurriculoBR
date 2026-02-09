import React, { useState } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  shareUrl: string;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, shareUrl, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-8 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase">Compartilhar Currículo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Compartilhe este link para que outros vejam seu currículo:
        </p>

        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 break-all font-mono">{shareUrl}</p>
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
        >
          <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
          {copied ? 'Copiado!' : 'Copiar Link'}
        </button>

        <button
          onClick={onClose}
          className="w-full mt-3 py-4 text-slate-600 dark:text-slate-300 font-bold text-sm uppercase"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};

export default ShareModal;
