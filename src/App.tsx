import React, { useState, useEffect, useCallback } from 'react';
import { ResumeData, TemplateId, SectionId } from './types';
import { INITIAL_RESUME_DATA, MOCK_RESUME_DATA } from './constants';

// Componentes
import Input from './components/Input';
import ResumePreview from './components/ResumePreview';
import PhotoCropModal from './components/PhotoCropModal';
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

  // --- VIEWS ADICIONAIS ---
  if (view === 'privacy' || view === 'terms') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 md:p-20 transition-colors">
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-xl space-y-6">
          <button onClick={() => setView('home')} className="text-blue-600 font-black uppercase text-[10px] tracking-widest mb-4 inline-block italic">← Voltar</button>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
            {view === 'privacy' ? 'Política de Privacidade' : 'Termos de Uso'}
          </h1>
          <div className="text-slate-600 dark:text-slate-400 space-y-4 leading-relaxed">
            <p>Seus dados são processados localmente. Utilizamos a API Google Gemini para IA e AdSense para publicidade.</p>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: HOME ---
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col relative overflow-hidden transition-colors duration-300">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] aspect-square bg-blue-50 dark:bg-blue-900/20 rounded-full blur-[120px] opacity-60"></div>
        <header className="relative z-10 h-24 flex items-center justify-between px-8 md:px-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
              <i className="fas fa-file-invoice text-lg"></i>
            </div>
            <h1 className="font-black text-2xl tracking-tighter text-slate-800 dark:text-white uppercase italic">Curriculo<span className="text-blue-600">BR</span></h1>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center px-6 pt-12 pb-24">
          <div className="max-w-5xl w-full text-center space-y-12">
            <div className="space-y-6">
              <span className="inline-block py-2 px-4 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">Gerador de Currículos Grátis com IA</span>
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-none italic">O currículo que te leva à <br className="hidden md:block"/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">próxima entrevista.</span></h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">Design profissional e inteligência artificial para conquistar sua vaga.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => setView('templates')} className="w-full sm:w-auto bg-blue-600 text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 hover:scale-[1.05] transition-all shadow-2xl">Começar Agora</button>
              <button onClick={() => { updateData(MOCK_RESUME_DATA); setView('editor'); }} className="w-full sm:w-auto bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xl">Ver Exemplo</button>
            </div>
            <div className="mt-16 w-full max-w-4xl mx-auto">
              <AdUnit slotId="9876543210" format="horizontal" />
            </div>
          </div>
        </main>
        <footer className="py-12 px-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-6">
            <button onClick={() => setView('privacy')} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 tracking-widest">Privacidade</button>
            <button onClick={() => setView('terms')} className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 tracking-widest">Termos</button>
          </div>
          <p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest">© 2026 CurriculoBR</p>
        </footer>
      </div>
    );
  }

  // --- VIEW: EDITOR / TEMPLATES ---
  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark bg-slate-900' : 'bg-slate-50'} transition-colors duration-300`}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {view === 'templates' ? (
        <div className="flex-1 p-8 md:p-20 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="flex justify-between items-center">
              <button onClick={() => setView('home')} className="text-blue-600 font-black uppercase text-[10px] tracking-widest italic">← Voltar</button>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Escolha um Estilo</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {TEMPLATES.map(t => (
                <div key={t.id} onClick={() => { updateData({ templateId: t.id }); setView('editor'); }} className="cursor-pointer group">
                  <div className="aspect-[3/4] bg-white dark:bg-slate-800 rounded-[32px] p-4 shadow-xl border-2 border-transparent group-hover:border-blue-600 transition-all overflow-hidden mb-4">
                    <TemplateThumbnail id={t.id} data={data} />
                  </div>
                  <h3 className="font-black text-slate-800 dark:text-white uppercase text-xs text-center">{t.label}</h3>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between shrink-0">
            <h1 className="font-black text-lg text-slate-800 dark:text-white uppercase italic" onClick={() => setView('home')}>Curriculo<span className="text-blue-600 cursor-pointer">BR</span></h1>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400">
                <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
              </button>
              <button onClick={() => setView('templates')} className="text-xs font-black uppercase text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors">Templates</button>
            </div>
          </header>

          <div className="flex-1 flex overflow-hidden">
            <aside className="w-24 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center py-10 gap-8 shrink-0">
              {STEPS.map(step => (
                <button 
                  key={step.id} 
                  onClick={() => setActiveStep(step.id as SectionId)}
                  className={`flex flex-col items-center gap-2 group transition-all ${activeStep === step.id ? 'text-blue-600' : 'text-slate-400'}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeStep === step.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800'}`}>
                    <i className={`fas ${step.icon}`}></i>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tighter">{step.label}</span>
                </button>
              ))}
            </aside>

            <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 p-8 md:p-12">
              <div className="max-w-2xl mx-auto space-y-8">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{STEPS.find(s => s.id === activeStep)?.label}</h2>
                {activeStep === 'info' && (
