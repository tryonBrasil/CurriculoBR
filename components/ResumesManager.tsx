import React, { useState } from 'react';
import { SavedResume } from '../services/resumeService';

interface ResumesManagerProps {
  resumes: SavedResume[];
  onSelect: (resumeId: string) => void;
  onNew: () => void;
  onDelete: (resumeId: string) => void;
  onRename: (resumeId: string, newTitle: string) => void;
  onShare: (resumeId: string) => void;
  isLoading: boolean;
}

const ResumesManager: React.FC<ResumesManagerProps> = ({
  resumes,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onShare,
  isLoading,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleRename = (resumeId: string, oldTitle: string) => {
    setEditingId(resumeId);
    setEditingTitle(oldTitle);
  };

  const confirmRename = async (resumeId: string) => {
    if (editingTitle.trim() && editingTitle !== resumes.find(r => r.id === resumeId)?.title) {
      onRename(resumeId, editingTitle);
    }
    setEditingId(null);
    setEditingTitle('');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Meus Currículos</h2>
        <button
          onClick={onNew}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm uppercase shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          + Novo Currículo
        </button>
      </div>

      {resumes.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
          <p className="mb-4 text-sm">Nenhum currículo salvo ainda</p>
          <p className="text-xs">Clique em "Novo Currículo" para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resumes.map(resume => (
            <div
              key={resume.id}
              className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 group hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                {editingId === resume.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => confirmRename(resume.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmRename(resume.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 bg-white dark:bg-slate-900 border border-blue-500 px-2 py-1 rounded text-sm font-bold outline-none dark:text-white"
                    autoFocus
                  />
                ) : (
                  <h3 className="font-bold text-slate-800 dark:text-white flex-1 cursor-pointer hover:text-blue-600" onClick={() => handleRename(resume.id, resume.title)}>
                    {resume.title}
                  </h3>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Atualizado: {new Date(resume.updatedAt).toLocaleDateString('pt-BR')}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => onSelect(resume.id)}
                  className="flex-1 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded font-bold text-xs uppercase transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => onShare(resume.id)}
                  className="flex-1 py-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-slate-700 rounded font-bold text-xs uppercase transition-colors"
                >
                  Compartilhar
                </button>
                <button
                  onClick={() => onDelete(resume.id)}
                  className="flex-1 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded font-bold text-xs uppercase transition-colors"
                >
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResumesManager;
