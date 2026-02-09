import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { resumeService, SavedResume } from '../services/resumeService';
import ResumesManager from './ResumesManager';
import ShareModal from './ShareModal';
import Toast from './Toast';

interface AuthenticatedHomeProps {
  user: any;
  onSelectResume: (resumeId: string) => void;
  onNewResume: () => void;
  onLogout: () => void;
}

const AuthenticatedHome: React.FC<AuthenticatedHomeProps> = ({ user, onSelectResume, onNewResume, onLogout }) => {
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    loadResumes();
  }, [user]);

  const loadResumes = async () => {
    try {
      setIsLoading(true);
      const data = await resumeService.listResumes(user.id);
      setResumes(data);
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Erro ao carregar currículos',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (resumeId: string) => {
    if (!confirm('Tem certeza que deseja deletar este currículo?')) return;

    try {
      await resumeService.deleteResume(resumeId);
      setResumes(resumes.filter(r => r.id !== resumeId));
      setToast({ message: 'Currículo deletado', type: 'success' });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Erro ao deletar',
        type: 'error',
      });
    }
  };

  const handleRename = async (resumeId: string, newTitle: string) => {
    try {
      await resumeService.renameResume(resumeId, newTitle);
      setResumes(resumes.map(r => (r.id === resumeId ? { ...r, title: newTitle } : r)));
      setToast({ message: 'Currículo renomeado', type: 'success' });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Erro ao renomear',
        type: 'error',
      });
    }
  };

  const handleShare = async (resumeId: string) => {
    try {
      const token = await resumeService.createPublicShare(user.id, resumeId);
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/?share=${token}`);
      setShowShareModal(true);
      setToast({ message: 'Link gerado com sucesso!', type: 'success' });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Erro ao gerar link',
        type: 'error',
      });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="h-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <i className="fas fa-file-invoice text-sm"></i>
          </div>
          <h1 className="font-black text-xl tracking-tighter text-slate-800 dark:text-white uppercase italic">
            Curriculo<span className="text-blue-600">BR</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 dark:text-slate-400">{user.email}</span>
          <button
            onClick={onLogout}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-bold text-xs uppercase transition-colors"
          >
            <i className="fas fa-sign-out-alt mr-2"></i>Sair
          </button>
        </div>
      </header>

      <main className="p-8 max-w-6xl mx-auto">
        <ResumesManager
          resumes={resumes}
          onSelect={onSelectResume}
          onNew={onNewResume}
          onDelete={handleDelete}
          onRename={handleRename}
          onShare={handleShare}
          isLoading={isLoading}
        />
      </main>

      <ShareModal isOpen={showShareModal} shareUrl={shareUrl} onClose={() => setShowShareModal(false)} />
    </div>
  );
};

export default AuthenticatedHome;
