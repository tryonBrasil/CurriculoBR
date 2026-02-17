import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ResumeData, TemplateId, Experience, Education, Skill, Language, Course, SectionId } from './types';
import { INITIAL_RESUME_DATA, MOCK_RESUME_DATA } from './constants';
import Input from './components/Input';
import ResumePreview from './components/ResumePreview';
import PhotoCropModal from './components/PhotoCropModal';
import Toast from './components/Toast';
import TemplateThumbnail from './components/TemplateThumbnail';
import ConfirmModal from './components/ConfirmModal';
import AdUnit from './components/AdUnit'; 
import { useResumeHistory } from './hooks/useResumeHistory';
import { enhanceTextStream, generateSummaryStream, suggestSkills, parseResumeWithAI } from './services/geminiService';
import { extractTextFromPDF } from './services/pdfService';
import { 
  validateEmailError, 
  validatePhoneError, 
  validateURLError, 
  validateDateRange 
} from './services/validationService';

const STEPS = [
  { id: 'info', label: 'Dados', icon: 'fa-id-card' },
  { id: 'experience', label: 'Experiência', icon: 'fa-briefcase' },
  { id: 'education', label: 'Educação', icon: 'fa-graduation-cap' },
  { id: 'skills', label: 'Habilidades', icon: 'fa-bolt' },
  { id: 'extras', label: 'Extras', icon: 'fa-plus-circle' },
  { id: 'summary', label: 'Resumo', icon: 'fa-align-left' },
];

const TEMPLATES: { id: TemplateId; label: string; desc: string; pro?: boolean }[] = [
  { id: 'modern', label: 'Moderno', desc: 'Limpo e profissional' },
  { id: 'classic', label: 'Clássico', desc: 'Elegante e tradicional' },
  { id: 'minimalist', label: 'Minimalista', desc: 'Foco no conteúdo' },
  { id: 'creative', label: 'Criativo', desc: 'Destaque visual' },
];

export default function App() {
  const [data, setData] = useState<ResumeData>(() => {
    const saved = localStorage.getItem('resume-data');
    return saved ? JSON.parse(saved) : INITIAL_RESUME_DATA;
  });

  const [view, setView] = useState<'home' | 'templates' | 'editor' | 'privacy' | 'terms'>('home');
  const [activeStep, setActiveStep] = useState<SectionId>('info');
  const [isDarkMode, setIsDarkMode] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [cropModal, setCropModal] = useState<{ open: boolean; image: string | null }>({ open: false, image: null });
  
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

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const handleClearData = () => {
    setData(INITIAL_RESUME_DATA);
    setIsClearing(false);
    showToast('Todos os dados foram limpos', 'info');
  };

  // --- VIEWS ADICIONAIS PARA O ADSENSE ---
  if (view === 'privacy') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 md:p-20 transition-colors">
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-xl space-y-6">
          <button onClick={() => setView('home')} className="text-blue-600 font-black uppercase text-[10px] tracking-widest mb-4 inline-block italic">← Voltar para Home</button>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Política de Privacidade</h1>
          <div className="text-slate-600 dark:text-slate-400 space-y-4 leading-relaxed">
            <p>A sua privacidade é uma prioridade para o CurriculoBR. Esta política explica como lidamos com as suas informações.</p>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">1. Processamento de Dados</h2>
            <p>Os dados que você insere no formulário de currículo são processados localmente no seu navegador. Utilizamos a API do Google Gemini apenas para funções de inteligência artificial solicitadas por você.</p>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">2. Segurança</h2>
            <p>Não armazenamos seus dados pessoais em servidores externos permanentes, garantindo que suas informações profissionais permaneçam sob seu controle.</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'terms') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 md:p-20 transition-colors">
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-xl space-y-6">
          <button onClick={() => setView('home')} className="text-blue-600 font-black uppercase text-[10px] tracking-widest mb-4 inline-block italic">← Voltar para Home</button>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Termos de Uso</h1>
          <div className="text-slate-600 dark:text-slate-400 space-y-4 leading-relaxed">
            <p>Ao utilizar o CurriculoBR, você aceita os seguintes termos:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li>O CurriculoBR é uma ferramenta gratuita para criação de documentos.</li>
              <li>Não garantimos resultados de contratação, sendo apenas uma ferramenta de auxílio.</li>
              <li>O uso de inteligência artificial é opcional e visa o refinamento de texto.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: HOME (IMPLEMENTADA COM CONTEÚDO SEO) ---
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col relative overflow-hidden transition-colors duration-300">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] aspect-square bg-blue-50 dark:bg-blue-900/20 rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] aspect-square bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-[120px] opacity-60"></div>
        
        <header className="relative z-10 h-24 flex items-center justify-between px-8 md:px-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
               <i className="fas fa-file-invoice text-lg"></i>
            </div>
            <h1 className="font-black text-2xl tracking-tighter text-slate-800 dark:text-white uppercase italic">Curriculo<span className="text-blue-600">BR</span></h1>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
               <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <button onClick={() => { updateData(MOCK_RESUME_DATA); setView('editor'); }} className="hidden md:block text-xs font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">Ver Exemplo</button>
          </div>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center px-6 pt-12 pb-24">
          <div className="max-w-5xl w-full text-center space-y-12">
            <div className="space-y-6">
              <span className="inline-block py-2 px-4 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Gerador de Currículos Grátis com IA</span>
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-none italic">O currículo que te leva à <br className="hidden md:block"/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">próxima entrevista.</span></h2>
              <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">Combine design profissional com o poder do Google Gemini para conquistar sua vaga no mercado de trabalho brasileiro.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => setView('templates')} className="w-full sm:w-auto bg-blue-600 text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 hover:scale-[1.05] transition-all shadow-2xl flex items-center justify-center gap-3">
                Começar Agora <i className="fas fa-magic">
