import React, { useState, useEffect, useCallback } from 'react';
import { ResumeData, TemplateId, SectionId } from './types';
import { INITIAL_RESUME_DATA, MOCK_RESUME_DATA } from './constants';

// Componentes
import Input from './components/Input';
import ResumePreview from './components/ResumePreview';
import Toast from './components/Toast';
import TemplateThumbnail from './components/TemplateThumbnail';
import ConfirmModal from './components/ConfirmModal';
import AdUnit from './components/AdUnit'; 

// Hooks e Serviços
import { useResumeHistory } from './hooks/useResumeHistory';
import { validateEmailError } from './services/validationService';

const STEPS = [
  { id: 'info', label: 'Dados', icon: 'fa-id-card' },
  { id: 'experience', label: 'Experiência', icon: 'fa-briefcase' },
  { id: 'education', label: 'Educação', icon: 'fa-graduation-cap' },
  { id: 'skills', label: 'Habilidades', icon: 'fa-bolt' },
  { id: 'summary', label: 'Resumo', icon: 'fa-align-left' },
];

const TEMPLATES: { id: TemplateId; label: string; desc: string }[] = [
  { id: 'modern', label: 'Moderno', desc: 'Limpo e profissional' },
  { id: 'classic', label: 'Clássico', desc: 'Elegante e tradicional' },
  { id: 'minimalist', label: 'Minimalista', desc: 'Foco no conteúdo' },
  { id: 'creative', label: 'Criativo', desc: 'Destaque visual' },
];

export default function App() {
  const [data, setData] = useState<ResumeData>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('resume-data') : null;
    return saved ? JSON.parse(saved) : INITIAL_RESUME_DATA;
  });

  const [view, setView] = useState<'home' | 'templates' | 'editor' | 'privacy' | 'terms'>('home');
  const [activeStep, setActiveStep] = useState<SectionId>('info');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const { addToHistory } = useResumeHistory(data);

  useEffect(() => {
    localStorage.setItem('resume-data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const updateData = useCallback((newData: Partial<ResumeData>) => {
    setData(prev => {
      const updated = { ...prev, ...newData };
      addToHistory(updated);
      return updated;
    });
  }, [addToHistory]);

  const handleClearData = () => {
    setData(INITIAL_RESUME_DATA);
    setIsClearing(false);
    setToast({ message: 'Dados limpos!', type: 'success' });
  };

  // --- SUB-VIEWS (Privacidade e Termos) ---
  if (view === 'privacy' || view === 'terms') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 md:p-20">
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-xl">
          <button onClick={() => setView('home')} className="text-blue-600 font-black text-[10px] mb-8 uppercase italic">← Voltar</button>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase mb-6">
            {view === 'privacy' ? 'Política de Privacidade' : 'Termos de Uso'}
          </h1>
          <div className="text-slate-500 dark:text-slate-400 leading-relaxed space-y-4">
            <p>Seus dados são processados apenas no seu navegador. O CurriculoBR utiliza a API do Gemini para melhoria de texto e o AdSense para anúncios.</p>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: HOME ---
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col transition-colors">
        <header className="h-24 flex items-center justify-between px-8 md:px-20">
          <h1 className="font-black text-2xl text-slate-800 dark:text-white italic uppercase">Curriculo<span className="text-blue-600">BR</span></h1>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-slate-400"><i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i></button>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-12">
          <div className="max-w-3xl space-y-6">
            <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter italic">O currículo que te leva à <span className="text-blue-600">entrevista.</span></h2>
            <p className="text-slate-500 text-lg">Crie seu currículo profissional em minutos com inteligência artificial.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setView('templates')} className="bg-blue-600 text-white px-10 py-5 rounded-3xl font-black uppercase text-sm shadow-xl">Começar Agora</button>
            <button onClick={() => { updateData(MOCK_RESUME_DATA); setView('editor'); }} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white px-10 py-5 rounded-3xl font-black uppercase text-sm">Ver Exemplo</button>
          </div>
          <div className="w-full max-w-4xl pt-10">
            <AdUnit slotId="1234567890" format="horizontal" />
          </div>
        </main>
        <footer className="py-8 flex gap-6 justify-center border-t border-slate-50 dark:border-slate-800">
          <button onClick={() => setView('privacy')} className="text-[10px] font-black uppercase text-slate-400">Privacidade</button>
          <button onClick={() => setView('terms')} className="text-[10px] font-black uppercase text-slate-400">Termos</button>
        </footer>
      </div>
    );
  }

  // --- VIEW: EDITOR / TEMPLATES ---
  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark bg-slate-900' : 'bg-slate-50'}`}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {view === 'templates' ? (
        <div className="flex-1 p-8 md:p-20 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-10">
            <button onClick={() => setView('home')} className="text-blue-600 font-black uppercase text-[10px] italic">← Voltar</button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {TEMPLATES.map(t => (
                <div key={t.id} onClick={() => { updateData({ templateId: t.id }); setView('editor');
