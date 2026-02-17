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

  // --- LOGICA DA HOME ---
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
          <div className="flex gap-4 items-center">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
               <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <button onClick={() => { updateData(MOCK_RESUME_DATA); setView('editor'); }} className="hidden md:block text-xs font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">Ver Exemplo</button>
          </div>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center px-6 pt-12 pb-24">
          <div className="max-w-5xl w-full text-center space-y-12">
            <div className="space-y-6">
              <span className="inline-block py-2 px-4 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Gerador de Currículos Gratuito com IA</span>
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Crie seu currículo profissional <br className="hidden md:block"/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 italic">em poucos segundos.</span></h2>
              <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">Combine tecnologia de ponta com designs aprovados por recrutadores. Otimize sua carreira com a inteligência artificial do Google Gemini.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => setView('templates')} className="w-full sm:w-auto bg-blue-600 text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 hover:scale-[1.05] transition-all shadow-2xl flex items-center justify-center gap-3">
                Começar Agora <i className="fas fa-magic"></i>
              </button>
              <button onClick={() => setIsImportModalOpen(true)} className="w-full sm:w-auto bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xl flex items-center justify-center gap-3">
                Importar do PDF <i className="fas fa-file-import"></i>
              </button>
            </div>

            {/* SEÇÃO DE CONTEÚDO PARA ADSENSE - EVITA REPROVAÇÃO POR CONTEÚDO BAIXO */}
            <div className="mt-24 text-left border-t border-slate-100 dark:border-slate-800 pt-20">
              <div className="grid md:grid-cols-2 gap-16 items-start">
                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">O que é o CurriculoBR?</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-4 border-blue-600 pl-4">
                    Nossa missão é democratizar o acesso a currículos de alta qualidade para todos os profissionais brasileiros. 
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Utilizamos a <strong>Inteligência Artificial do Google Gemini</strong> para analisar e refinar as descrições de suas experiências profissionais. Isso ajuda a destacar suas conquistas de forma que os recrutadores e sistemas de ATS (rastreamento de candidatos) identifiquem seu potencial imediatamente.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <h4 className="font-black text-blue-600 text-xs uppercase mb-2">Totalmente Gratuito</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Crie, edite e baixe quantos currículos precisar sem taxas escondidas ou assinaturas.</p>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <h4 className="font-black text-blue-600 text-xs uppercase mb-2">Privacidade em Primeiro Lugar</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Seus dados são armazenados localmente no seu navegador e não são vendidos a terceiros.</p>
                  </div>
                </div>
              </div>

              <section className="mt-20 space-y-10">
                <h3 className="text-center text-3xl font-black text-slate-800 dark:text-white uppercase">Dicas Profissionais para 2026</h3>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                      <i className="fas fa-search"></i>
                    </div>
                    <h5 className="font-bold text-slate-800 dark:text-white">Palavras-chave</h5>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Leia a descrição da vaga e use termos técnicos idênticos no seu currículo para passar pelos robôs de triagem.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
                      <i className="fas fa-chart-line"></i>
                    </div>
                    <h5 className="font-bold text-slate-800 dark:text-white">Foco em Resultados</h5>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Em vez de listar apenas deveres, use números. Ex: "Aumentei as vendas em 20%" em vez de "Responsável por vendas".</p>
                  </div>
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600">
                      <i className="fas fa-eye"></i>
                    </div>
                    <h5 className="font-bold text-slate-800 dark:text-white">Leitura Escaneável</h5>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Recrutadores gastam cerca de 6 segundos na primeira leitura. Use nossos templates para garantir clareza visual.</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>

        <footer className="relative z-10 py-12 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-6">
            <div className="flex gap-8">
              <button onClick={() => setView('privacy')} className="text-xs font-black uppercase tracking-wid
