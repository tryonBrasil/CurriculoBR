import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ResumeData, TemplateId, Experience, Education, Language, Certification } from './types';
import { INITIAL_RESUME_DATA, MOCK_RESUME_DATA } from './constants';
import Input from './components/Input';
import ResumePreview from './components/ResumePreview';
import Toast from './components/Toast';
import TemplateThumbnail from './components/TemplateThumbnail';
import ConfirmModal from './components/ConfirmModal';
import PhotoCropModal from './components/PhotoCropModal';
import AdUnit from './components/AdUnit';
import JobScanner from './components/JobScanner'; 
import CoverLetterGenerator from './components/CoverLetterGenerator';
import { useResumeHistory } from './hooks/useResumeHistory';
import { enhanceTextStream, generateSummaryStream, suggestSkills, parseResumeWithAI } from './services/geminiService';
import { extractTextFromPDF } from './services/pdfService';
import { exportToDocx } from './services/exportService'; 
import { validateEmailError, validatePhoneError } from './services/validationService';

const STEPS = [
  { id: 'info', label: 'Dados', icon: 'fa-id-card' },
  { id: 'experience', label: 'Experiência', icon: 'fa-briefcase' },
  { id: 'education', label: 'Educação', icon: 'fa-graduation-cap' },
  { id: 'languages', label: 'Idiomas', icon: 'fa-language' },
  { id: 'certifications', label: 'Cursos', icon: 'fa-certificate' },
  { id: 'skills', label: 'Habilidades', icon: 'fa-bolt' },
  { id: 'summary', label: 'Resumo', icon: 'fa-align-left' },
  { id: 'scanner', label: 'Scanner', icon: 'fa-crosshairs' },
  { id: 'cover-letter', label: 'Carta', icon: 'fa-envelope-open-text' },
];

const TEMPLATES = [
  { id: 'modern_blue', label: 'Modern Blue', desc: 'Profissional e Limpo' },
  { id: 'executive_navy', label: 'Executive Navy', desc: 'Premium e Luxuoso' },
  { id: 'modern_vitae', label: 'Modern Vitae', desc: 'Elegante e Espaçoso' },
  { id: 'classic_serif', label: 'Classic Serif', desc: 'Tradicional Acadêmico' },
  { id: 'swiss_minimal', label: 'Swiss Minimal', desc: 'Design Suíço' },
  { id: 'teal_sidebar', label: 'Teal Sidebar', desc: 'Corporativo Moderno' },
  { id: 'executive_red', label: 'Executive Red', desc: 'Liderança Sênior' },
  { id: 'corporate_gray', label: 'Corporate Gray', desc: 'Minimalista Pro' },
  { id: 'minimal_red_line', label: 'Minimal Red', desc: 'Impacto Visual' },
];

const STORAGE_KEY = 'curriculobr_data_v2';

export default function App() {
  const [view, setView] = useState<'home' | 'templates' | 'editor'>('home');
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [template, setTemplate] = useState<TemplateId>('modern_blue');
  const [currentStep, setCurrentStep] = useState(0);
  const [previewScale, setPreviewScale] = useState(0.55);
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState<string>("'Inter', sans-serif");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const { data, updateData, setHistoryDirect } = useResumeHistory(INITIAL_RESUME_DATA);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Navegação simples
  const navigateTo = (path: string, viewState: typeof view) => {
    setView(viewState);
    window.scrollTo(0, 0);
  };

  const fitToScreen = useCallback(() => {
    if (!previewContainerRef.current) return;
    const containerHeight = previewContainerRef.current.clientHeight;
    const scale = (containerHeight - 60) / 1123; 
    setPreviewScale(Math.min(0.9, Math.max(0.3, scale)));
  }, []);

  const handlePrint = () => window.print();

  // Bloqueio de renderização para as views de "Home" e "Templates"
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-10">
        <h1 className="text-4xl font-black mb-6 dark:text-white">Curriculo<span className="text-blue-600">BR</span></h1>
        <button 
          onClick={() => setView('templates')} 
          className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all"
        >
          Começar agora
        </button>
      </div>
    );
  }

  if (view === 'templates') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-10">
        <h2 className="text-2xl font-black mb-8 dark:text-white text-center uppercase">Escolha um Modelo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {TEMPLATES.map(t => (
            <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-md border dark:border-slate-700 text-center">
               <p className="font-bold dark:text-white mb-4">{t.label}</p>
               <button 
                 onClick={() => { setTemplate(t.id as TemplateId); setView('editor'); }}
                 className="w-full py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-xs font-bold uppercase hover:bg-blue-600 hover:text-white transition-all"
               >
                 Selecionar
               </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // VIEW DO EDITOR (Aqui é onde os erros de fechamento aconteciam)
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Header */}
      <nav className="no-print h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0">
        <div className="font-black text-xl cursor-pointer dark:text-white" onClick={() => setView('home')}>
          Curriculo<span className="text-blue-600">BR</span>
        </div>
        <div className="flex gap-4">
           <button onClick={handlePrint} className="bg-blue-600 text-white px-6 py-2 rounded-full text-xs font-bold uppercase">Baixar PDF</button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Lado Esquerdo: Editor */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${mobileView === 'editor' ? 'flex' : 'hidden md:flex'}`}>
           <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
              <h2 className="text-xl font-black mb-6 uppercase dark:text-white">{STEPS[currentStep].label}</h2>
              <div className="space-y-4">
                 {/* Campos de exemplo para evitar erro de componente vazio */}
                 <Input 
                    label="Nome Completo" 
                    value={data.fullName || ''} 
                    onChange={(val) => updateData({ ...data, fullName: val })} 
                 />
                 <Input 
                    label="E-mail" 
                    value={data.email || ''} 
                    onChange={(val) => updateData({ ...data, email: val })} 
                 />
              </div>
              <div className="mt-10 flex justify-between">
                 <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} className="text-slate-400 font-bold uppercase text-xs">Anterior</button>
                 <button onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))} className="text-blue-600 font-bold uppercase text-xs">Próximo</button>
              </div>
           </div>
        </div>

        {/* Lado Direito: Preview (Onde estava o erro de fechamento) */}
        <div 
          ref={previewContainerRef}
          className={`flex-1 bg-slate-100 dark:bg-slate-950 overflow-hidden relative transition-all duration-300 ${mobileView === 'preview' ? 'flex' : 'hidden md:flex'} items-center justify-center p-4`}
        >
          <div 
            className="origin-top transition-transform duration-300 shadow-2xl"
            style={{ transform: `scale(${previewScale})` }}
          >
            <ResumePreview 
              data={data} 
              template={template} 
              fontSize={fontSize} 
              fontFamily={fontFamily}
              onSectionClick={(id) => console.log(id)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
