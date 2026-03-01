import React, { useState, useEffect } from 'react';

interface Props {
  defaultName: string;
  saving: boolean;
  onSave: (name: string) => void;
  onClose: () => void;
  isUpdate?: boolean;   // true = já existia, apenas atualiza
}

const SaveModal: React.FC<Props> = ({ defaultName, saving, onSave, onClose, isUpdate }) => {
  const [name, setName] = useState(defaultName);

  useEffect(() => { setName(defaultName); }, [defaultName]);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-7 animate-in zoom-in-95 duration-200">
        <div className="text-3xl mb-3">{isUpdate ? '🔄' : '💾'}</div>
        <h2 className="font-black text-xl text-slate-900 dark:text-white mb-1">
          {isUpdate ? 'Atualizar currículo' : 'Salvar na nuvem'}
        </h2>
        <p className="text-sm text-slate-400 mb-5">
          {isUpdate ? 'A versão anterior será sobrescrita.' : 'Dê um nome para identificar este currículo.'}
        </p>

        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
          Nome do currículo
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()); }}
          placeholder="Ex: Currículo Desenvolvedor, Vaga Marketing..."
          maxLength={60}
          autoFocus
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:border-blue-500 focus:outline-none transition-colors mb-5"
        />

        <div className="flex gap-3">
          <button
            onClick={() => name.trim() && onSave(name.trim())}
            disabled={!name.trim() || saving}
            className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
          >
            {saving
              ? <><i className="fas fa-circle-notch fa-spin"></i> Salvando...</>
              : <><i className="fas fa-cloud-upload-alt"></i> {isUpdate ? 'Atualizar' : 'Salvar'}</>
            }
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3.5 border-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl font-bold text-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveModal;
