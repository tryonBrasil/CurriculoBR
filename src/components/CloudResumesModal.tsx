import React, { useEffect, useState } from 'react';
import { CloudResume } from '../hooks/useCloudSave';
import { AuthUser } from '../hooks/useAuth';

interface Props {
  user: AuthUser;
  resumes: CloudResume[];
  loading: boolean;
  onLoad: (resume: CloudResume) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onSignOut: () => void;
  currentResumeId?: string | null;
}

const CloudResumesModal: React.FC<Props> = ({
  user, resumes, loading, onLoad, onDelete, onClose, onSignOut, currentResumeId
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
    setConfirmDelete(null);
  };

  const formatDate = (d: Date) => {
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000)    return 'Agora mesmo';
    if (diff < 3_600_000) return `${Math.floor(diff/60000)}min atrás`;
    if (diff < 86_400_000) return `${Math.floor(diff/3_600_000)}h atrás`;
    return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'2-digit' });
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-5 text-white relative overflow-hidden shrink-0">
          <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h2 className="font-black text-lg">☁️ Meus Currículos</h2>
              <p className="text-blue-100 text-xs mt-0.5">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border-2 border-white/30" />
              )}
              <button onClick={onClose} className="text-white/60 hover:text-white transition-colors ml-2">
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <i className="fas fa-circle-notch fa-spin text-blue-600 text-2xl"></i>
              <p className="text-sm text-slate-400 font-bold">Carregando seus currículos...</p>
            </div>
          ) : resumes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📄</div>
              <p className="font-black text-slate-700 dark:text-white mb-1">Nenhum currículo salvo</p>
              <p className="text-sm text-slate-400">Use o botão "Salvar na nuvem" no editor para guardar seu trabalho.</p>
            </div>
          ) : (
            resumes.map(r => (
              <div
                key={r.id}
                className={`rounded-2xl border-2 p-4 transition-all ${
                  r.id === currentResumeId
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                {confirmDelete === r.id ? (
                  // Confirmação de exclusão inline
                  <div className="flex items-center gap-3">
                    <p className="flex-1 text-sm text-slate-600 dark:text-slate-300 font-medium">Apagar <strong>{r.name}</strong>?</p>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-lg transition-all disabled:opacity-50"
                    >
                      {deletingId === r.id ? <i className="fas fa-circle-notch fa-spin"></i> : 'Apagar'}
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {/* Ícone de doc */}
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                      <i className="fas fa-file-alt text-blue-500 text-sm"></i>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 dark:text-white text-sm truncate">{r.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {r.data.personalInfo?.fullName || 'Sem nome'} · {formatDate(r.updatedAt)}
                      </p>
                    </div>
                    {/* Ações */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => { onLoad(r); onClose(); }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all active:scale-95"
                      >
                        Abrir
                      </button>
                      <button
                        onClick={() => setConfirmDelete(r.id)}
                        className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={onSignOut}
            className="text-xs text-slate-400 hover:text-red-500 font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5"
          >
            <i className="fas fa-sign-out-alt text-xs"></i> Sair da conta
          </button>
          <button onClick={onClose} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black rounded-xl transition-all">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloudResumesModal;
