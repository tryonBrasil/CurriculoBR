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
import { validateEmailError, validatePhoneError } from './services/validationService';

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
  // --- ESTADOS ---
  const [data, setData] = useState<ResumeData>(() => {
    const saved = localStorage.getItem('resume-data');
    return saved ? JSON.parse(saved) : INITIAL_RESUME_DATA;
  });

  const [view, setView] = useState<'home' | 'templates' | 'editor' | 'privacy' | 'terms'>('home');
  const [activeStep, setActiveStep] = useState<SectionId>('info');
  const [isDarkMode, setIsDarkMode] = useState(() => 
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
  );
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const { addToHistory } = useResumeHistory(data);

  // --- EFEITOS ---
  useEffect(() => {
    localStorage.setItem('resume-data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // --- AÇÕES ---
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
    setToast({ message: 'Dados limpos com sucesso!', type: 'success' });
  };

  // --- SUB-VIEWS (Privacidade e Termos) ---
  const PolicyView = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 md:p-20">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-xl space-y-6">
        <button onClick={() => setView('home')} className="text-blue-600 font-black uppercase text-[10px] tracking-widest italic">← Voltar para Home</button>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{title}</h1>
        <div className="text-slate-600 dark:text-slate-400 space-y-4 leading-relaxed">{children}</div>
      </div>
    </div>
  );

  if (view === 'privacy') return <PolicyView title="Política de Privacidade"><p>Seus dados são processados localmente e não são armazenados em nossos servidores...</p></PolicyView>;
  if (view === 'terms') return <PolicyView title="Termos de Uso"><p>O CurriculoBR é uma ferramenta gratuita de auxílio profissional...</p></PolicyView>;

  // --- VIEW: HOME ---
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col relative overflow-hidden transition-colors">
        {/* Orbes Decorativos */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] aspect-square bg-blue-50 dark:bg-blue-900/20 rounded-full blur-[120px] opacity-60"></div>
        
        <header className="relative z-10 h-24 flex items-center justify-between px-8 md:px-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
              <i className="fas fa-file-invoice"></i>
            </div>
            <h1 className="font-black text-2xl tracking-tighter text-slate-800 dark:text-white uppercase italic">Curriculo<span className="text-blue-600">BR</span></h1>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center px-6 pt-1
