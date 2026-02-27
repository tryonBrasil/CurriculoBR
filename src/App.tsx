import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { ResumeData, TemplateId, Experience, Education, Language, Course } from './types';
import { INITIAL_RESUME_DATA, MOCK_RESUME_DATA } from './constants';
import Input from './components/Input';
import ResumePreview from './components/ResumePreview';
import Toast from './components/Toast';
import TemplateThumbnail from './components/TemplateThumbnail';
import ConfirmModal from './components/ConfirmModal';
import AdUnit from './components/AdUnit';
import CookieConsent from './components/CookieConsent';
import { useResumeHistory } from './hooks/useResumeHistory';
import { enhanceTextStream, generateSummaryStream, suggestSkills, parseResumeWithAI, generateCoverLetterStream } from './services/geminiService';
// pdfService é carregado sob demanda para não incluir pdfjs no bundle inicial
import {
  validateEmailError,
  validatePhoneError,
  validateURLError,
  validateDateRange
} from './services/validationService';

// Lazy-loaded: só baixam quando o usuário navega para essas páginas
const PhotoCropModal = lazy(() => import('./components/PhotoCropModal'));
const ATSPanel      = lazy(() => import('./components/ATSPanel'));
const Sobre         = lazy(() => import('./Sobre'));
const Contato       = lazy(() => import('./Contato'));
const BlogList      = lazy(() => import('./blog/BlogList'));
const BlogPost      = lazy(() => import('./blog/BlogPost'));

// Fallback leve para Suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
    <i className="fas fa-circle-notch fa-spin text-2xl text-blue-500"></i>
  </div>
);

const STEPS = [
  { id: 'info', label: 'Dados', icon: 'fa-id-card' },
  { id: 'experience', label: 'Experiência', icon: 'fa-briefcase' },
  { id: 'education', label: 'Educação', icon: 'fa-graduation-cap' },
  { id: 'languages', label: 'Idiomas', icon: 'fa-language' },
  { id: 'certifications', label: 'Cursos', icon: 'fa-certificate' },
  { id: 'skills', label: 'Habilidades', icon: 'fa-bolt' },
  { id: 'summary', label: 'Resumo', icon: 'fa-align-left' },
];

const FREE_TEMPLATES = [
  { id: 'modern_blue',        label: 'Modern Blue',       desc: 'Profissional e Limpo' },
  { id: 'executive_navy',     label: 'Executive Navy',    desc: 'Premium e Luxuoso' },
  { id: 'modern_vitae',       label: 'Modern Vitae',      desc: 'Elegante e Espaçoso' },
  { id: 'classic_serif',      label: 'Classic Serif',     desc: 'Tradicional Acadêmico' },
  { id: 'swiss_minimal',      label: 'Swiss Minimal',     desc: 'Design Suíço' },
  { id: 'teal_sidebar',       label: 'Teal Sidebar',      desc: 'Corporativo Moderno' },
  { id: 'executive_red',      label: 'Executive Red',     desc: 'Liderança Sênior' },
  { id: 'corporate_gray',     label: 'Corporate Gray',    desc: 'Minimalista Pro' },
  { id: 'minimal_red_line',   label: 'Minimal Red',       desc: 'Impacto Visual' },
  { id: 'aurora_dark',        label: 'Aurora Dark',       desc: 'Dark Mode Gradiente' },
  { id: 'creative_portfolio', label: 'Creative Portfolio',desc: 'Design de Portfólio' },
  { id: 'minimalist_pro',     label: 'Minimalist Pro',    desc: 'Ultra Minimalista' },
  { id: 'bold_impact',        label: 'Bold Impact',       desc: 'Tipografia Forte' },
  { id: 'soft_pastel',        label: 'Soft Pastel',       desc: 'Elegante e Feminino' },
  { id: 'tech_dark',          label: 'Tech Dark',         desc: 'Para Área de TI' },
];

// Alias mantém compatibilidade com código que usa TEMPLATES
const TEMPLATES = FREE_TEMPLATES;

const PREMIUM_TEMPLATES: { id: string; label: string; desc: string; badge: string }[] = [];

const FONTS = [
  { id: 'inter', label: 'Inter', family: "'Inter', sans-serif" },
  { id: 'roboto', label: 'Roboto', family: "'Roboto', sans-serif" },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif" },
  { id: 'lato', label: 'Lato', family: "'Lato', sans-serif" },
  { id: 'open-sans', label: 'Open Sans', family: "'Open Sans', sans-serif" },
  { id: 'playfair', label: 'Playfair', family: "'Playfair Display', serif" },
  { id: 'merriweather', label: 'Merriweather', family: "'Merriweather', serif" },
];

const STORAGE_KEY = 'curriculobr_data_v2';

export default function App() {
  const [view, setView] = useState<'home' | 'templates' | 'editor' | 'privacy' | 'terms' | 'cover-letter-page' | 'sobre' | 'contato' | 'blog' | 'blog-post'>('home');
  const [blogSlug, setBlogSlug] = useState<string>('');
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [template, setTemplate] = useState<TemplateId>('modern_blue');
  const [currentStep, setCurrentStep] = useState(0);
  const [previewScale, setPreviewScale] = useState(0.55);
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState<string>("'Inter', sans-serif");
  const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [highlightedStep, setHighlightedStep] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Cover Letter state
  const [clJobTitle, setClJobTitle] = useState('');
  const [clCompany, setClCompany]   = useState('');
  const [clTone, setClTone]         = useState<'formal'|'dinamico'|'criativo'>('formal');
  const [clHighlights, setClHighlights] = useState('');
  const [clResult, setClResult]     = useState('');
  const [isGeneratingCL, setIsGeneratingCL] = useState(false);

  // Templates visibility
  const [showFreeTemplates, setShowFreeTemplates]     = useState(true);
  const [showPremiumTemplates, setShowPremiumTemplates] = useState(true);
  
  const [isATSPanelOpen, setIsATSPanelOpen] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; action: () => void } | null>(null);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  
  const { data, updateData, undo, redo, canUndo, canRedo, setHistoryDirect } = useResumeHistory(INITIAL_RESUME_DATA);
  
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);

  const navigateTo = (path: string, viewState: typeof view) => {
    window.history.pushState({}, '', path);
    setView(viewState);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.data) setHistoryDirect({ past: [], present: { ...INITIAL_RESUME_DATA, ...parsed.data }, future: [] });
        if (parsed.template) setTemplate(parsed.template);
        if (parsed.fontSize) setFontSize(parsed.fontSize);
        if (parsed.fontFamily) setFontFamily(parsed.fontFamily);
        if (parsed.isDarkMode) setIsDarkMode(parsed.isDarkMode);
      } catch (e) {
        console.error("Erro ao carregar dados salvos:", e);
      }
    }

    const path = window.location.pathname;
    if (path === '/carta-de-apresentacao') {
      setView('cover-letter-page');
    } else if (path === '/privacidade') {
      setView('privacy');
    } else if (path === '/termos') {
      setView('terms');
    } else if (path === '/sobre') {
      setView('sobre');
    } else if (path === '/contato') {
      setView('contato');
    } else if (path === '/blog') {
      setView('blog');
    } else if (path.startsWith('/blog/')) {
      setBlogSlug(path.replace('/blog/', ''));
      setView('blog-post');
    }
    
    const handlePopState = () => {
      const p = window.location.pathname;
      if (p === '/carta-de-apresentacao') setView('cover-letter-page');
      else if (p === '/privacidade') setView('privacy');
      else if (p === '/termos') setView('terms');
      else if (p === '/sobre') setView('sobre');
      else if (p === '/contato') setView('contato');
      else if (p === '/blog') setView('blog');
      else if (p.startsWith('/blog/')) { setBlogSlug(p.replace('/blog/', '')); setView('blog-post'); }
      else if (p === '/') setView('home');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (view === 'editor') {
      const handler = setTimeout(() => {
        const stateToSave = { data, template, fontSize, fontFamily, isDarkMode };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      }, 2000);

      return () => clearTimeout(handler);
    }
  }, [data, template, fontSize, fontFamily, view, isDarkMode]);

  const showToast = (message: string, type: 'error' | 'success' = 'success') => {
    setToast({ message, type });
  };

  const handlePrint = () => {
    try {
      // Captura o elemento já renderizado do currículo
      const el = document.getElementById('resume-preview-container');
      if (!el) {
        showToast('Não foi possível gerar o PDF. Tente novamente.', 'error');
        return;
      }

      // Clona o HTML do currículo com estilos inline preservados
      const clone = el.cloneNode(true) as HTMLElement;

      // Remove atributos de interação que não devem ir para o PDF
      clone.querySelectorAll('[draggable]').forEach(e => e.removeAttribute('draggable'));
      clone.querySelectorAll('.no-print, [class*="cursor-"], [class*="hover:"]').forEach(e => {
        (e as HTMLElement).style.cursor = 'default';
      });

      // Coleta todos os <style> e <link rel=stylesheet> da página atual
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Currículo — ${data.personalInfo.fullName || 'CurriculoBR'}</title>
  ${styles}
  <style>
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { margin: 0; padding: 0; background: white; }
    body { display: flex; justify-content: center; align-items: flex-start; }
    #print-root {
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      position: relative;
      box-shadow: none !important;
    }
    @page { size: A4 portrait; margin: 0; }
    @media print {
      html, body { width: 210mm; height: 297mm; }
      #print-root { box-shadow: none !important; }
    }
  </style>
</head>
<body>
  <div id="print-root">${clone.innerHTML}</div>
  <script>
    // Espera fontes e imagens carregarem antes de imprimir
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 1000);
      }, 800);
    };
  <\/script>
</body>
</html>`;

      const w = window.open('', '_blank', 'width=900,height=700');
      if (!w) {
        showToast('Pop-up bloqueado. Permita pop-ups e tente novamente.', 'error');
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (e) {
      console.error('Erro ao gerar PDF:', e);
      showToast('Erro ao gerar PDF. Tente novamente.', 'error');
    }
  };

  const handleClearData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Limpar Tudo?',
      message: 'Isso apagará todos os dados preenchidos. Esta ação não pode ser desfeita.',
      action: () => {
        setHistoryDirect({ past: [], present: INITIAL_RESUME_DATA, future: [] });
        localStorage.removeItem(STORAGE_KEY);
        showToast("Dados limpos.");
        setConfirmModal(null);
      }
    });
  };

  const handleImportSubmit = async () => {
    if (!importText.trim()) {
      showToast("Por favor, cole o texto do seu currículo ou faça upload de um PDF.", "error");
      return;
    }
    
    setIsImporting(true);
    try {
      const parsedData = await parseResumeWithAI(importText);
      updateData({
        ...INITIAL_RESUME_DATA,
        ...parsedData,
      });
      
      setIsImportModalOpen(false);
      setImportText('');
      
      if (view === 'cover-letter-page') {
        showToast("Dados importados! A IA agora tem contexto para sua carta.");
      } else {
        navigateTo('/', 'editor');
        showToast("Currículo importado com sucesso!");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao processar o texto com IA. Tente novamente.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast("Por favor, selecione um arquivo PDF válido.", "error");
      return;
    }

    setIsExtractingPdf(true);
    try {
      // Import dinâmico: pdfjs (~330kB) só é baixado quando o usuário usa esta função
      const { extractTextFromPDF } = await import('./services/pdfService');
      const text = await extractTextFromPDF(file);
      if (text.trim().length === 0) {
        showToast("Não foi possível ler o texto deste PDF. Ele pode ser uma imagem escaneada.", "error");
      } else {
        setImportText(text);
        showToast("Texto extraído do PDF! Verifique abaixo.");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao ler o PDF.", "error");
    } finally {
      setIsExtractingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPendingPhoto(reader.result as string);
        setIsPhotoModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handlePhotoConfirm = (croppedImage: string) => {
    updateData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, photoUrl: croppedImage } }));
    setIsPhotoModalOpen(false);
    setPendingPhoto(null);
  };

  const cvScore = useMemo(() => {
    let points = 0;
    if (data.personalInfo?.fullName) points += 15;
    if (data.summary && data.summary.length > 50) points += 15;
    if (data.experiences?.length > 0) points += 20;
    if (data.education?.length > 0) points += 15;
    if (data.languages?.length > 0) points += 10;
    if (data.courses?.length > 0) points += 10;
    if (data.skills?.length >= 5) points += 10;
    if (data.personalInfo?.photoUrl) points += 5;
    return Math.min(points, 100);
  }, [data]);

  const activeTab = STEPS[currentStep].id;

  const validateField = (field: string, value: string) => {
    let error: string | null = null;
    if (field === 'email') error = validateEmailError(value);
    if (field === 'phone') error = validatePhoneError(value);
    if (field === 'website') error = validateURLError(value, 'URL');
    if (field === 'linkedin') error = validateURLError(value, 'LinkedIn');
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const addItem = (listName: 'experiences' | 'education' | 'languages' | 'courses') => {
    const id = Math.random().toString(36).substr(2, 9);
    if (listName === 'experiences') {
      const newItem: Experience = { id, company: '', position: '', location: '', startDate: '', endDate: '', current: false, description: '' };
      updateData(prev => ({ ...prev, experiences: [newItem, ...(prev.experiences || [])] }));
    } else if (listName === 'education') {
      const newItem: Education = { id, institution: '', degree: '', field: '', location: '', startDate: '', endDate: '' };
      updateData(prev => ({ ...prev, education: [newItem, ...(prev.education || [])] }));
    } else if (listName === 'languages') {
      const newItem: Language = { id, name: '', level: '', percentage: 0 };
      updateData(prev => ({ ...prev, languages: [newItem, ...(prev.languages || [])] }));
    } else if (listName === 'courses') {
      const newItem: Course = { id, name: '', institution: '', year: '' };
      updateData(prev => ({ ...prev, courses: [newItem, ...(prev.courses || [])] }));
    }
  };

  const removeItem = (listName: 'experiences' | 'education' | 'languages' | 'courses', id: string) => {
    updateData(prev => ({
      ...prev,
      [listName]: (prev[listName] as any[]).filter(item => item.id !== id)
    }));
  };

  const updateItem = <T extends 'experiences' | 'education' | 'languages' | 'courses'>(
    listName: T, 
    id: string, 
    field: string, 
    value: any
  ) => {
    updateData(prev => {
      const newList = (prev[listName] as any[]).map(item => item.id === id ? { ...item, [field]: value } : item);
      return { ...prev, [listName]: newList };
    });
  };

  const handleEnhance = async (text: string, context: string, listName?: 'experiences', id?: string) => {
    if (isEnhancing) return;
    
    if (!text || text.length < 5) {
      showToast("Texto muito curto para a IA processar.", "error");
      return;
    }

    setIsEnhancing(id || context);
    try {
      await enhanceTextStream(text, context, (currentText) => {
          if (listName && id) {
            updateItem(listName, id, 'description', currentText);
          } else if (context === 'resumo') {
            updateData(prev => ({ ...prev, summary: currentText }));
          }
      });
      showToast("Texto refinado pela IA!");
    } catch (err) {
      console.error(err);
      showToast("Erro ao processar a IA. Tente novamente.", "error");
    } finally {
      setIsEnhancing(null);
    }
  };

  const handleGenerateSummary = async () => {
    if (!data.skills?.length || isEnhancing) return;
    setIsEnhancing('summary-gen');
    try {
      const expPositions = data.experiences.map(e => e.position);
      const skillNames = data.skills.map(s => s.name);
      await generateSummaryStream("Profissional", skillNames, expPositions, (currentText) => {
         updateData(prev => ({ ...prev, summary: currentText }));
      });
      
      showToast("Resumo gerado com sucesso!");
    } catch (err) {
      console.error(err);
      showToast("Erro ao gerar resumo.", "error");
    } finally {
      setIsEnhancing(null);
    }
  };

  const handleSuggestSkills = async () => {
    if (isEnhancing) return;
    setIsEnhancing('skills-suggest');
    try {
      const jobContext = data.experiences[0]?.position || "profissional geral";
      const suggested = await suggestSkills(jobContext);
      
      if (suggested && suggested.length > 0) {
        const newSkills = suggested.map((name: string) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: name.trim(),
          level: 'Intermediate' as const,
        })).filter((s: { name: string }) => s.name);
        updateData(prev => ({ ...prev, skills: [...(prev.skills || []), ...newSkills] }));
        showToast("Habilidades sugeridas adicionadas.");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro ao sugerir habilidades.", "error");
    } finally {
      setIsEnhancing(null);
    }
  };

  const handleSectionClick = useCallback((sectionId: string) => {
    const stepIdx = STEPS.findIndex(s => s.id === sectionId);
    if (stepIdx !== -1) {
      setCurrentStep(stepIdx);
      setHighlightedStep(sectionId);
      setMobileView('editor'); 
      setTimeout(() => setHighlightedStep(null), 1500);
      
      if (editorScrollRef.current) {
        editorScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, []);

  const fitToScreen = useCallback(() => {
    if (!previewContainerRef.current) return;
    const containerHeight = previewContainerRef.current.clientHeight;
    const scale = (containerHeight - 60) / 1123; 
    setPreviewScale(Math.min(0.9, Math.max(0.3, scale)));
  }, []);

  useEffect(() => {
    if (view === 'editor') {
      const timer = setTimeout(() => {
        fitToScreen();
      }, 300);
      
      window.addEventListener('resize', fitToScreen);
      return () => {
        window.removeEventListener('resize', fitToScreen);
        clearTimeout(timer);
      };
    }
  }, [view, isSidebarOpen, fitToScreen]);

  const handleTemplateSelect = (selectedTemplate: TemplateId) => {
    setTemplate(selectedTemplate);
    updateData(INITIAL_RESUME_DATA);
    navigateTo('/', 'editor');
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      if (editorScrollRef.current) editorScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handlePrint();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      if (editorScrollRef.current) editorScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const LegalPageLayout: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-300">
      <header className="h-20 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('/', 'home')}>
            <i className="fas fa-arrow-left text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"></i>
            <span className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Voltar</span>
        </div>
        <h1 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-tight">{title}</h1>
        <div className="w-20"></div>
      </header>
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 md:p-12 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 leading-relaxed">
            {children}
            <div className="mt-12 border-t border-slate-100 dark:border-slate-700 pt-8">
               <AdUnit slotId="" format="horizontal" />
            </div>
        </div>
      </main>
    </div>
  );

  const globalOverlays = (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <CookieConsent />
      {isATSPanelOpen && <Suspense fallback={null}><ATSPanel data={data} onClose={() => setIsATSPanelOpen(false)} /></Suspense>}
      
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl p-8 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic">Importar com <span className="text-blue-600">IA</span></h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Faça upload do seu PDF ou cole o texto. Nossa IA organizará tudo.</p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><i className="fas fa-times"></i></button>
            </div>
            
            <div 
              className="mb-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-blue-400 transition-all group"
              onClick={() => pdfInputRef.current?.click()}
            >
                <input type="file" ref={pdfInputRef} className="hidden" accept="application/pdf" onChange={handlePdfUpload} />
                <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                  {isExtractingPdf ? <i className="fas fa-circle-notch fa-spin text-xl"></i> : <i className="fas fa-file-pdf text-xl"></i>}
                </div>
                <p className="font-bold text-slate-700 dark:text-white text-sm uppercase tracking-widest">
                  {isExtractingPdf ? "Lendo Arquivo..." : "Clique para enviar PDF"}
                </p>
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="O texto extraído do PDF aparecerá aqui. Você também pode colar seu currículo manualmente..."
              className="w-full h-40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm mb-6 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
            />
            <div className="flex gap-4">
              <button onClick={() => setIsImportModalOpen(false)} className="flex-1 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Cancelar</button>
              <button 
                onClick={handleImportSubmit} 
                disabled={isImporting || !importText.trim()}
                className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isImporting ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : <i className="fas fa-bolt mr-2"></i>}
                {isImporting ? "Analisando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (view === 'privacy') {
    return (
      <LegalPageLayout title="Política de Privacidade">
        {globalOverlays}
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
            <p className="text-xs text-slate-400">Última atualização: 25 de fevereiro de 2026</p>
            <p>A sua privacidade é importante para nós. Esta Política descreve como o <strong>CurriculoBR</strong> coleta, usa e protege suas informações, em conformidade com a <strong>Lei Geral de Proteção de Dados — LGPD (Lei nº 13.709/2018)</strong>.</p>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">1. Dados que Você Fornece</h3>
                <p>Os dados pessoais inseridos nos formulários (nome, e-mail, telefone, histórico profissional, etc.) são processados <strong>exclusivamente no seu navegador</strong>. São salvos no <code>localStorage</code> do seu dispositivo e <strong>não são transmitidos nem armazenados em servidores</strong> do CurriculoBR.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2. Inteligência Artificial (Google Gemini)</h3>
                <p>Ao utilizar os recursos de IA (sugestão de resumo, aprimoramento de texto), trechos do seu currículo são enviados à <strong>API do Google Gemini</strong> para processamento. Esses dados são regidos pela <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Política de Privacidade do Google</a>. O uso é sempre opcional.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">3. Cookies e Publicidade (Google AdSense)</h3>
                <p>O CurriculoBR utiliza o <strong>Google AdSense</strong> para exibir anúncios, mantendo o serviço gratuito. O Google usa cookies (incluindo o cookie <strong>DART</strong>) para veicular anúncios personalizados com base nas suas visitas a este e outros sites. Você pode gerenciar suas preferências de anúncios em <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">google.com/settings/ads</a>.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">4. Dados de Navegação</h3>
                <p>A Vercel (nossa plataforma de hospedagem) pode coletar dados técnicos como endereço IP, tipo de navegador e páginas acessadas para fins de segurança, conforme sua <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Política de Privacidade</a>.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">5. Seus Direitos (LGPD)</h3>
                <p className="mb-2">Conforme a LGPD, você tem direito a:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Acessar, corrigir ou excluir seus dados pessoais</li>
                    <li>Solicitar portabilidade dos seus dados</li>
                    <li>Revogar o consentimento a qualquer momento</li>
                    <li>Ser informado sobre compartilhamento com terceiros</li>
                </ul>
                <p className="mt-2">Como seus dados ficam no seu dispositivo, você pode exercer esses direitos limpando o armazenamento local do navegador. Para outras solicitações, use o contato abaixo.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">6. Alterações nesta Política</h3>
                <p>Esta política pode ser atualizada periodicamente. Alterações serão publicadas nesta página com nova data de atualização.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">7. Contato</h3>
                <p>Dúvidas? Entre em contato: <a href="mailto:contato@curriculobr.com.br" className="text-blue-600 hover:underline">contato@curriculobr.com.br</a></p>
            </section>
        </div>
      </LegalPageLayout>
    );
  }

  if (view === 'terms') {
    return (
      <LegalPageLayout title="Termos e Condições">
        {globalOverlays}
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
            <p className="text-xs text-slate-400">Última atualização: 25 de fevereiro de 2026</p>
            <p>Ao acessar e usar o <strong>CurriculoBR</strong>, você concorda com os seguintes Termos de Uso. Leia atentamente antes de utilizar nossos serviços.</p>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">1. Uso do Serviço</h3>
                <p>O CurriculoBR é um serviço gratuito para criação de currículos profissionais. Você pode usá-lo para fins pessoais e profissionais legítimos. É proibido usar o serviço para fins ilegais ou que violem direitos de terceiros.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2. Responsabilidade pelo Conteúdo</h3>
                <p>Você é o único responsável pelo conteúdo inserido no seu currículo. O CurriculoBR não verifica a veracidade das informações fornecidas. Ao usar nossa plataforma, você declara que as informações são verdadeiras e de sua autoria.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">3. Propriedade Intelectual</h3>
                <p>Os templates, designs e código-fonte do CurriculoBR são propriedade intelectual de seus desenvolvedores. Os currículos gerados por você pertencem a você. Não é permitido copiar ou redistribuir os templates em outros produtos sem autorização expressa.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">4. Inteligência Artificial</h3>
                <p>As sugestões geradas por IA (Google Gemini) são apenas para fins de assistência. O usuário é totalmente responsável por revisar e validar todas as informações antes de utilizar o currículo gerado.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">5. Publicidade</h3>
                <p>O CurriculoBR exibe anúncios do Google AdSense para se manter gratuito. Os anúncios são gerenciados pelo Google. Não nos responsabilizamos pelo conteúdo dos anúncios exibidos.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">6. Disponibilidade e Isenção de Garantias</h3>
                <p>O serviço é fornecido "como está", sem garantias de qualquer tipo. Podemos suspender o serviço a qualquer momento. Não somos responsáveis por perdas de dados decorrentes do uso.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">7. Lei Aplicável</h3>
                <p>Estes Termos são regidos pelas leis brasileiras. Disputas serão resolvidas no foro da comarca de São Paulo/SP.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">8. Contato</h3>
                <p>Dúvidas? <a href="mailto:contato@curriculobr.com.br" className="text-blue-600 hover:underline">contato@curriculobr.com.br</a></p>
            </section>
        </div>
      </LegalPageLayout>
    );
  }

  if (view === 'sobre') {
    return <Suspense fallback={<PageLoader />}><Sobre onVoltar={() => navigateTo('/', 'home')} onCriarCurriculo={() => navigateTo('/', 'templates')} /></Suspense>;
  }

  if (view === 'contato') {
    return <Suspense fallback={<PageLoader />}><Contato onVoltar={() => navigateTo('/', 'home')} /></Suspense>;
  }

  if (view === 'blog') {
    return (
      <Suspense fallback={<PageLoader />}>
        <BlogList
          onVoltar={() => navigateTo('/', 'home')}
          onPost={(slug) => { setBlogSlug(slug); navigateTo(`/blog/${slug}`, 'blog-post'); }}
          onCriarCurriculo={() => navigateTo('/', 'templates')}
        />
      </Suspense>
    );
  }

  if (view === 'blog-post') {
    return (
      <Suspense fallback={<PageLoader />}>
        <BlogPost
          slug={blogSlug}
          onVoltar={() => navigateTo('/', 'home')}
          onBlog={() => navigateTo('/blog', 'blog')}
          onPost={(slug) => { setBlogSlug(slug); navigateTo(`/blog/${slug}`, 'blog-post'); }}
          onCriarCurriculo={() => navigateTo('/', 'templates')}
        />
      </Suspense>
    );
  }

  if (view === 'cover-letter-page') {
    const hasData = !!(data.personalInfo?.fullName || (data.experiences && data.experiences.length > 0));

    const handleGenerateCL = async () => {
      if (!clJobTitle || !clCompany) { showToast('Preencha o cargo e a empresa.', 'error'); return; }
      setIsGeneratingCL(true);
      setClResult('');
      try {
        await generateCoverLetterStream({
          candidateName: data.personalInfo?.fullName || 'Candidato',
          jobTitle: clJobTitle,
          company: clCompany,
          tone: clTone,
          highlights: clHighlights,
          experiences: data.experiences?.map(e => `${e.position} na ${e.company}`).join('; ') || '',
          skills: data.skills?.map(s => s.name).join(', ') || '',
        }, (text) => setClResult(text));
      } finally { setIsGeneratingCL(false); }
    };

    const handleCopyLetter = () => {
      navigator.clipboard?.writeText(clResult);
      showToast('Carta copiada para a área de transferência!');
    };

    const handlePrintLetter = () => {
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(`
        <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
        <title>Carta de Apresentação — ${clJobTitle}</title>
        <style>
          body { font-family: 'Georgia', serif; max-width: 680px; margin: 60px auto; padding: 0 40px; color: #1e293b; line-height: 1.8; font-size: 15px; }
          p { margin-bottom: 1.2em; text-align: justify; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 24px; margin-bottom: 32px; }
          .name { font-size: 22px; font-weight: bold; color: #0f172a; }
          .meta { font-size: 12px; color: #64748b; margin-top: 4px; }
          .date { text-align: right; margin-bottom: 32px; color: #64748b; font-size: 13px; }
        </style></head><body>
        <div class="header">
          <div class="name">${data.personalInfo?.fullName || 'Candidato'}</div>
          <div class="meta">${data.personalInfo?.email || ''} · ${data.personalInfo?.phone || ''}</div>
        </div>
        <div class="date">${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        ${clResult.split('\n\n').map(p => `<p>${p.replace(/\n/g,' ')}</p>`).join('')}
        </body></html>
      `);
      w.document.close();
      w.print();
    };

    const tones = [
      { id: 'formal',    label: 'Formal',    icon: 'fa-briefcase',   desc: 'Executivo e tradicional' },
      { id: 'dinamico',  label: 'Dinâmico',  icon: 'fa-bolt',        desc: 'Confiante e proativo' },
      { id: 'criativo',  label: 'Criativo',  icon: 'fa-paint-brush', desc: 'Autêntico e diferenciado' },
    ];

    return (
      <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-900' : 'bg-slate-50'}`}>
        {globalOverlays}
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('/', 'home')}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg"><i className="fas fa-file-invoice text-xs"></i></div>
            <span className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white hidden sm:block">Curriculo<span className="text-blue-600">BR</span></span>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-full p-1">
            <button onClick={() => navigateTo('/', 'editor')} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors rounded-full">Currículo</button>
            <span className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white bg-blue-600 rounded-full">Carta</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-sm`}></i>
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-8 md:py-12">

          <div className="text-center mb-10">
            <span className="inline-block px-4 py-2 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              <i className="fas fa-envelope-open-text mr-1"></i> Gerador com IA
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              Carta de <span className="text-blue-600">Apresentação</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">Preencha os dados abaixo e nossa IA criará uma carta profissional e personalizada para você em segundos.</p>
          </div>

          {!hasData && (
            <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-5 flex gap-4 items-start">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                <i className="fas fa-lightbulb"></i>
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Dica: importe seu currículo para melhores resultados</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Com seu histórico profissional carregado, a IA gera uma carta muito mais personalizada.</p>
                <button onClick={() => setIsImportModalOpen(true)} className="mt-3 text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest hover:underline">
                  <i className="fas fa-file-import mr-1"></i> Importar PDF →
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ── Formulário ── */}
            <div className="space-y-5">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <i className="fas fa-user-tie text-blue-600"></i> Dados da Candidatura
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cargo / Vaga</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                      placeholder="Ex: Desenvolvedor Front-End Sênior"
                      value={clJobTitle}
                      onChange={e => setClJobTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Empresa</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                      placeholder="Ex: Google, Nubank, Ambev..."
                      value={clCompany}
                      onChange={e => setClCompany(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Seu Nome (para a carta)</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                      placeholder="Nome completo"
                      value={data.personalInfo?.fullName || ''}
                      onChange={e => updateData(p => ({...p, personalInfo: {...p.personalInfo, fullName: e.target.value}}))}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <i className="fas fa-sliders-h text-blue-600"></i> Tom da Carta
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {tones.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setClTone(t.id as typeof clTone)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${clTone === t.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-100 dark:border-slate-700 hover:border-blue-300'}`}
                    >
                      <i className={`fas ${t.icon} ${clTone === t.id ? 'text-blue-600' : 'text-slate-400'}`}></i>
                      <span className={`text-[10px] font-black uppercase tracking-wide ${clTone === t.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>{t.label}</span>
                      <span className="text-[9px] text-slate-400 text-center leading-tight">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fas fa-star text-blue-600"></i> Destaques Adicionais
                  <span className="ml-auto text-[9px] font-bold text-slate-300 normal-case tracking-normal">Opcional</span>
                </h2>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none h-28 leading-relaxed"
                  placeholder="Ex: Sou apaixonado por produtos que impactam milhões de usuários. Tenho certificação AWS e contribuo para projetos open-source..."
                  value={clHighlights}
                  onChange={e => setClHighlights(e.target.value)}
                />
              </div>

              <button
                onClick={handleGenerateCL}
                disabled={isGeneratingCL || !clJobTitle || !clCompany}
                className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-98 flex items-center justify-center gap-3"
              >
                {isGeneratingCL
                  ? <><i className="fas fa-circle-notch fa-spin"></i> Gerando carta...</>
                  : <><i className="fas fa-wand-magic-sparkles"></i> Gerar Carta com IA</>
                }
              </button>
            </div>

            {/* ── Preview da carta ── */}
            <div className="flex flex-col">
              <div className={`flex-1 bg-white dark:bg-slate-800 rounded-3xl border ${clResult ? 'border-blue-200 dark:border-blue-800/50 shadow-xl' : 'border-slate-100 dark:border-slate-700'} overflow-hidden flex flex-col transition-all duration-500`} style={{ minHeight: '500px' }}>
                {/* Topo do documento */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Carta de Apresentação</p>
                    {clJobTitle && <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">{clJobTitle} • {clCompany}</p>}
                  </div>
                  {clResult && (
                    <div className="flex gap-2">
                      <button onClick={handleCopyLetter} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-600 transition-colors" title="Copiar">
                        <i className="fas fa-copy text-sm"></i>
                      </button>
                      <button onClick={handlePrintLetter} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-600 transition-colors" title="Imprimir / Salvar PDF">
                        <i className="fas fa-print text-sm"></i>
                      </button>
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                  {!clResult && !isGeneratingCL && (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-4 opacity-40">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <i className="fas fa-envelope-open-text text-slate-400 text-2xl"></i>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-400">Sua carta aparecerá aqui</p>
                        <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Preencha o formulário e clique em "Gerar Carta"</p>
                      </div>
                    </div>
                  )}
                  {(clResult || isGeneratingCL) && (
                    <div className="font-serif text-[15px] leading-[1.85] text-slate-700 dark:text-slate-200 space-y-4">
                      {/* Data e cabeçalho do candidato */}
                      <div className="pb-4 mb-4 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-sm font-black text-slate-900 dark:text-white">{data.personalInfo?.fullName || 'Candidato'}</p>
                        <p className="text-xs text-slate-400">{data.personalInfo?.email} {data.personalInfo?.phone && `· ${data.personalInfo.phone}`}</p>
                        <p className="text-xs text-slate-400 mt-3">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      {clResult
                        ? clResult.split('\n\n').map((p, i) => <p key={i} className="text-justify">{p.replace(/\n/g, ' ')}</p>)
                        : <div className="flex items-center gap-2 text-blue-600"><i className="fas fa-circle-notch fa-spin"></i><span className="text-sm font-bold">Gerando sua carta...</span></div>
                      }
                      {isGeneratingCL && clResult && <span className="inline-block w-1.5 h-5 bg-blue-500 rounded-sm animate-pulse ml-1 align-middle"></span>}
                    </div>
                  )}
                </div>

                {/* Footer com ações */}
                {clResult && !isGeneratingCL && (
                  <div className="p-5 border-t border-slate-100 dark:border-slate-700 flex gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                    <button onClick={handleCopyLetter} className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2">
                      <i className="fas fa-copy"></i> Copiar
                    </button>
                    <button onClick={handlePrintLetter} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg">
                      <i className="fas fa-file-pdf"></i> Salvar PDF
                    </button>
                    <button onClick={handleGenerateCL} className="py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2" title="Gerar novamente">
                      <i className="fas fa-redo"></i>
                    </button>
                  </div>
                )}
              </div>

              {/* AdUnit */}
              <div className="mt-6">
                <AdUnit slotId="" format="horizontal" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (view === 'home') {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col relative overflow-hidden transition-colors duration-300">
        {globalOverlays}
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
            <button onClick={() => { updateData(MOCK_RESUME_DATA); navigateTo('/', 'editor'); }} className="hidden md:block text-xs font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">Ver Exemplo</button>
          </div>
        </header>
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-24 text-center">
          <div className="max-w-5xl w-full space-y-8">
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
              <span className="inline-flex items-center gap-2 py-2 px-4 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                <span className="status-dot w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                Gerador de Currículos com IA — 100% Grátis
              </span>
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Seu currículo perfeito, <br className="hidden md:block"/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 italic">em minutos.</span></h2>
              <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">Combine design profissional com o poder da Inteligência Artificial para conquistar a vaga dos seus sonhos.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <button onClick={() => navigateTo('/', 'templates')} className="group bg-blue-600 text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 hover:scale-[1.05] transition-all shadow-2xl flex items-center gap-3">
                Criar do Zero <i className="fas fa-magic group-hover:rotate-12 transition-transform"></i>
              </button>
              <button onClick={() => setIsImportModalOpen(true)} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xl flex items-center gap-3">
                Importar Currículo <i className="fas fa-file-import"></i>
              </button>
            </div>

            <div className="mt-4">
               <button onClick={() => navigateTo('/carta-de-apresentacao', 'cover-letter-page')} className="text-slate-400 hover:text-blue-600 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto">
                 <i className="fas fa-envelope-open-text"></i> Precisa apenas de uma Carta de Apresentação?
               </button>
            </div>

            {/* Trust bar */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><i className="fas fa-user-slash text-blue-600"></i> Sem Cadastro</span>
              <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700 hidden sm:block"></span>
              <span className="flex items-center gap-1.5"><i className="fas fa-lock text-blue-600"></i> 100% Privado</span>
              <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700 hidden sm:block"></span>
              <span className="flex items-center gap-1.5"><i className="fas fa-file-pdf text-blue-600"></i> PDF Grátis</span>
              <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700 hidden sm:block"></span>
              <span className="flex items-center gap-1.5"><i className="fas fa-brain text-blue-600"></i> IA Integrada</span>
            </div>

            <div className="mt-12 max-w-3xl mx-auto">
               <AdUnit slotId="" format="horizontal" />
            </div>
          </div>
        </main>

        {/* ── Features / Benefícios ── */}
        <section className="relative z-10 py-16 px-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-[10px] font-black uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400 mb-12">Por que o CurriculoBR?</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: 'fa-file-alt', title: '15 Modelos', desc: 'Designs modernos e exclusivos para cada perfil profissional' },
                { icon: 'fa-wand-magic-sparkles', title: 'IA Integrada', desc: 'Google Gemini sugere textos, habilidades e faz análise ATS' },
                { icon: 'fa-file-pdf', title: 'PDF Grátis', desc: 'Baixe em PDF de alta qualidade sem pagar nada' },
                { icon: 'fa-user-slash', title: 'Sem Cadastro', desc: '100% online, sem criar conta, sem cartão de crédito' },
              ].map(f => (
                <div key={f.icon} className="flex flex-col items-center text-center gap-3 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <i className={`fas ${f.icon} text-blue-600 dark:text-blue-400 text-lg`}></i>
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wide">{f.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-8 text-center">
              <div><p className="text-3xl font-black text-blue-600 dark:text-blue-400">+15.000</p><p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Currículos gerados</p></div>
              <div className="hidden md:block w-px h-12 bg-slate-200 dark:bg-slate-700"></div>
              <div><p className="text-3xl font-black text-blue-600 dark:text-blue-400">15</p><p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Modelos exclusivos</p></div>
              <div className="hidden md:block w-px h-12 bg-slate-200 dark:bg-slate-700"></div>
              <div><p className="text-3xl font-black text-blue-600 dark:text-blue-400">100%</p><p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Grátis, sempre</p></div>
              <div className="hidden md:block w-px h-12 bg-slate-200 dark:bg-slate-700"></div>
              <div><p className="text-3xl font-black text-blue-600 dark:text-blue-400">4.9★</p><p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Avaliação média</p></div>
            </div>
          </div>
        </section>

        {/* ── ATS Feature Highlight ── */}
        <section className="relative z-10 py-16 px-6 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[40%] aspect-square rounded-full blur-[100px] opacity-30" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}></div>
          </div>
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-block px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">Exclusivo</span>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 leading-tight">Score ATS com Inteligência Artificial</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  Descubra como seu currículo se sai frente a sistemas de triagem automática (ATS) usados por grandes empresas. Nossa IA analisa, pontua e dá feedback acionável — gratuitamente.
                </p>
                <div className="space-y-3">
                  {[
                    { icon: 'fa-chart-bar', text: 'Score de 0 a 100 com análise detalhada', color: 'text-violet-600' },
                    { icon: 'fa-tags', text: 'Palavras-chave detectadas no seu currículo', color: 'text-blue-600' },
                    { icon: 'fa-arrow-trend-up', text: 'Melhorias prioritárias e acionáveis', color: 'text-green-600' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                        <i className={`fas ${item.icon} ${item.color} text-sm`}></i>
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.text}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigateTo('/', 'templates')} className="mt-8 bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-3">
                  <i className="fas fa-brain"></i> Experimente Agora
                </button>
              </div>
              <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-6 shadow-2xl">
                <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-white font-black text-xs uppercase tracking-widest">Análise ATS</p>
                    <span className="bg-green-400 text-green-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Excelente</span>
                  </div>
                  <div className="flex items-center gap-5 mb-5">
                    <div className="relative w-20 h-20 shrink-0">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6"/>
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#4ade80" strokeWidth="6"
                          strokeDasharray={`${(87/100) * 2 * Math.PI * 34} ${2 * Math.PI * 34}`} strokeLinecap="round"/>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-white">87</span>
                        <span className="text-[8px] text-white/60">/100</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold mb-2">Palavras-chave</p>
                      <div className="flex flex-wrap gap-1">
                        {['React', 'TypeScript', 'Liderança', 'Agile'].map(kw => (
                          <span key={kw} className="bg-white/20 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">{kw}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Melhorias</p>
                    {['Adicione mais métricas quantificáveis', 'Inclua certificações relevantes'].map((tip, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                        <i className="fas fa-arrow-right text-amber-400 text-[9px]"></i>
                        <span className="text-white/80 text-[10px]">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="relative z-10 py-16 px-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-[10px] font-black uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400 mb-3">Depoimentos</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-10 uppercase tracking-tight">Quem já conquistou sua vaga</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: 'Ana Paula S.', role: 'Analista de Marketing', city: 'São Paulo, SP', text: 'Criei meu currículo em 20 minutos com o template Aurora Dark. Na semana seguinte já estava sendo chamada para entrevistas. Melhor ferramenta que já usei!', stars: 5, avatar: 'A', color: 'from-pink-500 to-rose-600' },
                { name: 'Ricardo M.', role: 'Dev Frontend', city: 'Belo Horizonte, MG', text: 'O template Tech Dark é perfeito para desenvolvedores. A análise ATS com IA me ajudou a otimizar o currículo e consegui 3 entrevistas em uma semana.', stars: 5, avatar: 'R', color: 'from-blue-500 to-cyan-600' },
                { name: 'Fernanda T.', role: 'Professora', city: 'Recife, PE', text: 'Sem experiência em design, criei um currículo lindo com o Soft Pastel. A IA gerou meu resumo profissional em segundos. Recomendo demais!', stars: 5, avatar: 'F', color: 'from-violet-500 to-purple-600' },
              ].map((t, i) => (
                <div key={i} className="testimonial-card bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(t.stars)].map((_, j) => <i key={j} className="fas fa-star text-amber-400 text-xs"></i>)}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5 italic">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-black text-sm shrink-0`}>{t.avatar}</div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white text-sm">{t.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{t.role} · {t.city}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Blog section on home */}
        <section className="relative z-10 py-16 px-6 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Blog</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 uppercase tracking-tight">Dicas para seu Currículo</h3>
              </div>
              <button onClick={() => navigateTo('/blog', 'blog')} className="text-xs font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest hidden md:block">
                Ver todos <i className="fas fa-arrow-right ml-1"></i>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { slug: 'como-fazer-curriculo-sem-experiencia', title: 'Como Fazer um Currículo Sem Experiência', cat: 'Iniciantes' },
                { slug: 'erros-mais-comuns-no-curriculo', title: '10 Erros Mais Comuns no Currículo', cat: 'Dicas' },
                { slug: 'habilidades-mais-valorizadas-mercado-2025', title: 'Habilidades Mais Valorizadas em 2025', cat: 'Mercado' },
              ].map(post => (
                <div
                  key={post.slug}
                  onClick={() => { setBlogSlug(post.slug); navigateTo(`/blog/${post.slug}`, 'blog-post'); }}
                  className="cursor-pointer group bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 hover:border-blue-400 hover:shadow-lg transition-all duration-200"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2 block">{post.cat}</span>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm leading-tight group-hover:text-blue-600 transition-colors">{post.title}</h4>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase mt-4">Ler artigo →</p>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center md:hidden">
              <button onClick={() => navigateTo('/blog', 'blog')} className="text-xs font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest">
                Ver todos os artigos <i className="fas fa-arrow-right ml-1"></i>
              </button>
            </div>
          </div>
        </section>

        <footer className="relative z-10 py-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center">
          <div className="flex flex-col md:flex-row justify-center gap-6 md:gap-12 mb-4">
             <button onClick={() => navigateTo('/sobre', 'sobre')} className="text-xs font-bold uppercase text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors">Sobre</button>
             <button onClick={() => navigateTo('/blog', 'blog')} className="text-xs font-bold uppercase text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors">Blog</button>
             <button onClick={() => navigateTo('/contato', 'contato')} className="text-xs font-bold uppercase text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors">Contato</button>
             <button onClick={() => navigateTo('/privacidade', 'privacy')} className="text-xs font-bold uppercase text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors">Política de Privacidade</button>
             <button onClick={() => navigateTo('/termos', 'terms')} className="text-xs font-bold uppercase text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors">Termos e Condições</button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-600">© 2026 CurriculoBR. Todos os direitos reservados.</p>
        </footer>
      </div>
    );
  }

  if (view === 'templates') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-300">
        {globalOverlays}
        <header className="h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 md:px-8 sticky top-0 z-50">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('/', 'home')}>
             <i className="fas fa-arrow-left text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"></i>
             <span className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 hidden sm:block">Voltar</span>
          </div>
          <h1 className="font-black text-lg text-slate-800 dark:text-white uppercase tracking-tight">Escolha seu Modelo</h1>
          <div className="w-20"></div>
        </header>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-12">

            {/* ── Seção Todos os Modelos ── */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                    <i className="fas fa-th-large text-white text-xs"></i>
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wide">Todos os Modelos</h2>
                    <p className="text-[10px] text-slate-400 font-bold">{FREE_TEMPLATES.length} modelos gratuitos disponíveis</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFreeTemplates(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wide hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  <i className={`fas ${showFreeTemplates ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                  {showFreeTemplates ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {showFreeTemplates && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {FREE_TEMPLATES.map((t) => (
                    <div key={t.id} className={`bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group border-2 flex flex-col ${template === t.id ? 'border-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/30' : 'border-transparent hover:border-blue-200 dark:hover:border-blue-800'}`}>
                      <div className="relative aspect-[210/297] bg-slate-100 dark:bg-slate-900 overflow-hidden">
                        <TemplateThumbnail template={t.id as TemplateId} className="w-full h-full" />
                        {template === t.id && (
                          <div className="absolute top-3 right-3 bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">
                            <i className="fas fa-check text-[8px]"></i> Ativo
                          </div>
                        )}
                        <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button onClick={() => handleTemplateSelect(t.id as TemplateId)} className="bg-white text-blue-600 px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                            Usar este
                          </button>
                        </div>
                      </div>
                      <div className="p-5 flex flex-col gap-1.5">
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase">{t.label}</h3>
                        <p className="text-xs text-slate-400">{t.desc}</p>
                        <button onClick={() => handleTemplateSelect(t.id as TemplateId)} className={`mt-3 w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${template === t.id ? 'bg-blue-600 text-white' : 'border-2 border-slate-100 dark:border-slate-700 text-slate-500 hover:bg-blue-600 hover:text-white hover:border-blue-600'}`}>
                          {template === t.id ? '✓ Selecionado' : 'Selecionar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950 overflow-hidden transition-colors duration-300 google-auto-ads-ignore">
      {globalOverlays}
      
      {confirmModal && (
        <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.action} onCancel={() => setConfirmModal(null)} />
      )}

      {isPhotoModalOpen && pendingPhoto && (
        <Suspense fallback={null}>
          <PhotoCropModal
            imageSrc={pendingPhoto}
            onConfirm={handlePhotoConfirm}
            onCancel={() => { setIsPhotoModalOpen(false); setPendingPhoto(null); }}
          />
        </Suspense>
      )}

      <nav className="no-print h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-3 md:px-6 z-50 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('/', 'home')}>
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg"><i className="fas fa-file-invoice text-xs"></i></div>
          <h1 className="font-extrabold text-base tracking-tighter text-slate-800 dark:text-white uppercase italic hidden sm:block">Curriculo<span className="text-blue-600">BR</span></h1>
        </div>
        
        {/* Mobile toggle Editar/Visualizar */}
        <div className="flex md:hidden bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
           <button 
             onClick={() => setMobileView('editor')} 
             className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all flex items-center gap-1.5 ${mobileView === 'editor' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}
           >
             <i className="fas fa-pencil-alt text-[9px]"></i> Editar
           </button>
           <button 
             onClick={() => setMobileView('preview')} 
             className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all flex items-center gap-1.5 ${mobileView === 'preview' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}
           >
             <i className="fas fa-eye text-[9px]"></i> Ver
           </button>
        </div>

        <div className="hidden lg:flex items-center gap-6">
           <div className="flex items-center gap-2">
              <button onClick={undo} disabled={!canUndo} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${canUndo ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'}`} title="Desfazer"><i className="fas fa-undo text-xs"></i></button>
              <button onClick={redo} disabled={!canRedo} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${canRedo ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'}`} title="Refazer"><i className="fas fa-redo text-xs"></i></button>
           </div>
           <button
             onClick={() => setIsATSPanelOpen(true)}
             className="flex items-center gap-2 px-4 py-2 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-700/40 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all"
             title="Analisar currículo com IA"
           >
             <i className="fas fa-brain text-xs"></i> Score ATS
           </button>
           <div className="flex items-center gap-3">
              <div className="w-28 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${cvScore > 70 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${cvScore}%` }}></div>
              </div>
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{cvScore}%</span>
           </div>
           <button 
             onClick={handlePrint}
             className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg"
           >
             <i className="fas fa-file-pdf"></i> Baixar PDF
           </button>
        </div>
        
        {/* Mobile right buttons */}
        <div className="flex md:hidden items-center gap-1">
          <button onClick={handlePrint} className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
            <i className="fas fa-file-pdf text-[9px]"></i> PDF
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-300" onClick={() => setIsSidebarOpen(true)}>
            <i className="fas fa-palette text-sm"></i>
          </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden relative">
        
        <div className={`no-print w-full md:w-[390px] lg:w-[430px] flex flex-col border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-30 shrink-0 transition-all duration-300 absolute md:relative inset-0 md:inset-auto ${mobileView === 'editor' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
           
           <div className="flex overflow-x-auto border-b border-slate-50 dark:border-slate-800 shrink-0 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50 px-2">
             {STEPS.map((step, idx) => (
               <button 
                key={step.id} 
                onClick={() => setCurrentStep(idx)} 
                className={`flex-1 min-w-[70px] py-4 flex flex-col items-center gap-2 transition-all relative px-1 shrink-0 ${currentStep === idx ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 shadow-sm rounded-t-lg mt-1' : 'text-slate-400 grayscale hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
               >
                 <i className={`fas ${step.icon} text-[14px]`}></i>
                 <span className="text-[9px] font-black uppercase tracking-[0.1em] whitespace-nowrap">{step.label}</span>
                 {currentStep === idx && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>}
               </button>
             ))}
           </div>

           <div ref={editorScrollRef} className={`flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 transition-colors duration-500 ${highlightedStep ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}>
              {activeTab === 'info' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Informações Pessoais</h2>
                  
                  <div className="flex items-center gap-6 mb-6">
                    <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                      <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                        {data.personalInfo?.photoUrl ? (
                          <img src={data.personalInfo.photoUrl} alt="Perfil" className="w-full h-full object-cover" />
                        ) : (
                          <i className="fas fa-camera text-slate-400 text-2xl group-hover:text-blue-500 transition-colors"></i>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-white text-[10px] font-bold uppercase">Alterar</span>
                      </div>
                      <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoSelect} />
                    </div>
                    <div>
                       <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Sua Foto</h3>
                       <p className="text-xs text-slate-400 max-w-[200px] leading-tight mt-1">Recomendamos uma foto profissional, com fundo neutro e boa iluminação.</p>
                       {data.personalInfo?.photoUrl && (
                           <button onClick={(e) => { e.stopPropagation(); updateData(p => ({...p, personalInfo: {...p.personalInfo, photoUrl: ''}})); }} className="text-[10px] text-red-500 font-bold uppercase mt-2 hover:underline">Remover foto</button>
                       )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Input label="Nome Completo" value={data.personalInfo?.fullName || ''} onChange={(v) => updateData(p => ({...p, personalInfo: {...p.personalInfo, fullName: v}}))} placeholder="Ex: João da Silva" />
                    <Input label="Cargo / Título Profissional" value={data.personalInfo?.jobTitle || ''} onChange={(v) => updateData(p => ({...p, personalInfo: {...p.personalInfo, jobTitle: v}}))} placeholder="Ex: Analista de Marketing Sênior" />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="E-mail" value={data.personalInfo?.email || ''} onChange={(v) => updateData(p => ({...p, personalInfo: {...p.personalInfo, email: v}}))} placeholder="email@exemplo.com" error={errors.email} onBlur={() => validateField('email', data.personalInfo?.email || '')} />
                      <Input label="Telefone" value={data.personalInfo?.phone || ''} onChange={(v) => updateData(p => ({...p, personalInfo: {...p.personalInfo, phone: v}}))} placeholder="(11) 99999-9999" error={errors.phone} onBlur={() => validateField('phone', data.personalInfo?.phone || '')} />
                    </div>
                    <Input label="Localização" value={data.personalInfo?.location || ''} onChange={(v) => updateData(p => ({...p, personalInfo: {...p.personalInfo, location: v}}))} placeholder="Cidade, Estado" />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="LinkedIn" value={data.personalInfo?.linkedin || ''} onChange={(v) => updateData(p => ({...p, personalInfo: {...p.personalInfo, linkedin: v}}))} placeholder="linkedin.com/in/seu-perfil" />
                      <Input label="Site / Portfólio" value={data.personalInfo?.website || ''} onChange={(v) => updateData(p => ({...p, personalInfo: {...p.personalInfo, website: v}}))} placeholder="https://seusite.com" />
                    </div>
                    <Input label="CNH (opcional)" value={data.personalInfo?.drivingLicense || ''} onChange={(v) => updateData(p => ({...p, personalInfo: {...p.personalInfo, drivingLicense: v}}))} placeholder="Ex: CNH B" />
                  </div>
                </div>
              )}
              {activeTab === 'experience' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Experiências</h2>
                    <button onClick={() => addItem('experiences')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase shadow-sm hover:bg-blue-700 transition-colors">+ Adicionar</button>
                  </div>
                  {data.experiences?.map(exp => (
                    <div key={exp.id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 relative group border-l-4 border-l-blue-400 shadow-sm">
                      <button onClick={() => removeItem('experiences', exp.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
                      <Input label="Empresa" value={exp.company} onChange={(v) => updateItem('experiences', exp.id, 'company', v)} />
                      <Input label="Cargo" value={exp.position} onChange={(v) => updateItem('experiences', exp.id, 'position', v)} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input label="Início" value={exp.startDate} onChange={(v) => updateItem('experiences', exp.id, 'startDate', v)} placeholder="Ex: Jan 2020" />
                        <Input label="Fim" value={exp.endDate} onChange={(v) => { updateItem('experiences', exp.id, 'endDate', v); const r = validateDateRange(exp.startDate, v); if (!r.valid) setErrors(p => ({...p, [`exp_date_${exp.id}`]: r.error || null})); else setErrors(p => ({...p, [`exp_date_${exp.id}`]: null})); }} placeholder="Ex: Atual" error={errors[`exp_date_${exp.id}`] || undefined} />
                      </div>
                      <div className="mt-2 relative">
                         <div className="flex justify-between items-center mb-1">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descrição</label>
                           <button onClick={() => handleEnhance(exp.description, 'experiência', 'experiences', exp.id)} disabled={!exp.description || isEnhancing === exp.id} className="text-[9px] text-blue-600 dark:text-blue-400 font-black uppercase hover:text-blue-800 transition-colors">
                            <i className={`fas ${isEnhancing === exp.id ? 'fa-circle-notch fa-spin' : 'fa-magic'}`}></i> IA
                           </button>
                         </div>
                         <textarea className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm h-32 outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white focus:border-blue-500 resize-none transition-all" value={exp.description} onChange={(e) => updateItem('experiences', exp.id, 'description', e.target.value)} />
                      </div>
                    </div>
                  ))}
                  {data.experiences.length === 0 && (
                     <div className="text-center py-10 opacity-50">
                        <i className="fas fa-briefcase text-4xl mb-2 text-slate-300"></i>
                        <p className="text-sm font-bold text-slate-400">Adicione suas experiências profissionais</p>
                     </div>
                  )}
                </div>
              )}
              {activeTab === 'education' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Educação</h2>
                    <button onClick={() => addItem('education')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase shadow-sm hover:bg-blue-700 transition-colors">+ Adicionar</button>
                  </div>
                  {data.education?.map(edu => (
                    <div key={edu.id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 relative group border-l-4 border-l-indigo-400 shadow-sm">
                      <button onClick={() => removeItem('education', edu.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
                      <Input label="Instituição" value={edu.institution} onChange={(v) => updateItem('education', edu.id, 'institution', v)} />
                      <Input label="Grau/Curso" value={edu.degree} onChange={(v) => updateItem('education', edu.id, 'degree', v)} />
                      <Input label="Ano/Período" value={edu.endDate} onChange={(v) => updateItem('education', edu.id, 'endDate', v)} placeholder="Ex: 2018 - 2022" />
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'languages' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Idiomas</h2>
                    <button onClick={() => addItem('languages')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase shadow-sm hover:bg-blue-700 transition-colors">+ Adicionar</button>
                  </div>
                  {data.languages?.map(lang => (
                    <div key={lang.id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 relative group border-l-4 border-l-green-400 shadow-sm">
                      <button onClick={() => removeItem('languages', lang.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
                      <Input label="Idioma" value={lang.name} onChange={(v) => updateItem('languages', lang.id, 'name', v)} placeholder="Ex: Inglês" />
                      <Input label="Nível" value={lang.level} onChange={(v) => updateItem('languages', lang.id, 'level', v)} placeholder="Ex: Fluente, Intermediário" />
                    </div>
                  ))}
                  {(!data.languages || data.languages.length === 0) && (
                    <div className="text-center p-8 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                      <i className="fas fa-language text-2xl mb-2"></i>
                      <p className="text-xs">Nenhum idioma adicionado.</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'certifications' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Cursos e Certificações</h2>
                    <button onClick={() => addItem('courses')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase shadow-sm hover:bg-blue-700 transition-colors">+ Adicionar</button>
                  </div>
                  {data.courses?.map(cert => (
                    <div key={cert.id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 relative group border-l-4 border-l-yellow-400 shadow-sm">
                      <button onClick={() => removeItem('courses', cert.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
                      <Input label="Curso / Certificação" value={cert.name} onChange={(v) => updateItem('courses', cert.id, 'name', v)} />
                      <Input label="Instituição" value={cert.institution} onChange={(v) => updateItem('courses', cert.id, 'institution', v)} />
                      <Input label="Ano" value={cert.year} onChange={(v) => updateItem('courses', cert.id, 'year', v)} placeholder="Ex: 2023" />
                    </div>
                  ))}
                  {(!data.courses || data.courses.length === 0) && (
                    <div className="text-center p-8 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                      <i className="fas fa-certificate text-2xl mb-2"></i>
                      <p className="text-xs">Nenhuma certificação adicionada.</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'skills' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Habilidades</h2>
                     <button onClick={handleSuggestSkills} disabled={isEnhancing === 'skills-suggest'} className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-2 hover:text-blue-800 transition-colors">
                      <i className={`fas ${isEnhancing === 'skills-suggest' ? 'fa-circle-notch fa-spin' : 'fa-wand-magic-sparkles'}`}></i> Sugerir
                    </button>
                  </div>
                  <div className="relative">
                    <textarea
                      className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-sm h-40 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 dark:text-white resize-none leading-relaxed transition-all"
                      value={data.skills?.map(s => s.name).join(', ') || ''}
                      onChange={(e) => {
                        const names = e.target.value.split(',');
                        const newSkills = names.map((name, i) => ({
                          id: data.skills?.[i]?.id || Math.random().toString(36).substr(2, 9),
                          name: name,
                          level: data.skills?.[i]?.level || 'Intermediate' as const,
                        }));
                        updateData(p => ({...p, skills: newSkills}));
                      }}
                      placeholder="Liste suas habilidades separadas por vírgula..."
                    />
                  </div>
                </div>
              )}
              {activeTab === 'summary' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Resumo Profissional</h2>
                    <button onClick={handleGenerateSummary} disabled={!data.skills?.length || isEnhancing === 'summary-gen'} className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-2 hover:text-blue-800 transition-colors">
                      <i className={`fas ${isEnhancing === 'summary-gen' ? 'fa-circle-notch fa-spin' : 'fa-wand-magic'}`}></i> Gerar com IA
                    </button>
                  </div>
                  <div className="relative">
                    <textarea 
                      className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-sm h-64 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 dark:text-white resize-none leading-relaxed transition-all" 
                      value={data.summary} 
                      onChange={(e) => updateData(prev => ({ ...prev, summary: e.target.value }))}
                      placeholder="Escreva um pouco sobre você e suas principais conquistas..." 
                    />
                    <button 
                      onClick={() => handleEnhance(data.summary, 'resumo')} 
                      disabled={!data.summary || isEnhancing === 'resumo'}
                      className="absolute bottom-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700 hover:text-blue-600 transition-all"
                    >
                      <i className={`fas ${isEnhancing === 'resumo' ? 'fa-circle-notch fa-spin' : 'fa-magic'} mr-1`}></i> Refinar
                    </button>
                  </div>
                </div>
              )}
           </div>

           <div className="p-4 md:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 no-print bg-white dark:bg-slate-900 z-10">
              {/* Score on mobile */}
              <div className="flex md:hidden items-center gap-1.5 min-w-0">
                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${cvScore > 70 ? 'bg-green-500' : 'bg-blue-500'}`} style={{width:`${cvScore}%`}}></div>
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase">{cvScore}%</span>
              </div>
              <button onClick={prevStep} className={`hidden md:block flex-1 py-4 font-bold text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors ${currentStep === 0 ? 'invisible' : ''}`}>Anterior</button>
              <button onClick={prevStep} className={`md:hidden w-10 h-10 rounded-xl border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 transition-colors active:scale-95 ${currentStep === 0 ? 'invisible' : ''}`}>
                <i className="fas fa-chevron-left text-sm"></i>
              </button>
              <button onClick={nextStep} className="flex-1 py-3 md:py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-lg active:scale-95 transition-all">
                {currentStep === STEPS.length - 1
                  ? <><i className="fas fa-file-pdf mr-1"></i> Exportar PDF</>
                  : <><span className="hidden sm:inline">Próximo</span><i className="fas fa-chevron-right sm:ml-1.5 text-xs"></i></>
                }
              </button>
           </div>
        </div>

        {/* ===== PREVIEW CENTRAL ===== */}
        <div
          ref={previewContainerRef}
          className={`flex-1 bg-slate-100 dark:bg-slate-950 overflow-hidden flex flex-col transition-all duration-300 ${mobileView === 'preview' ? 'flex' : 'hidden md:flex'}`}
        >
          {/* Toolbar da preview */}
          <div className="no-print h-11 shrink-0 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hidden sm:block">Pré-visualização A4</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:hidden">{template.replace('_',' ')}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPreviewScale(s => Math.max(0.2, s - 0.05))} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <i className="fas fa-minus text-xs"></i>
              </button>
              <span className="text-[10px] font-black text-slate-500 w-9 text-center">{Math.round(previewScale * 100)}%</span>
              <button onClick={() => setPreviewScale(s => Math.min(1, s + 0.05))} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <i className="fas fa-plus text-xs"></i>
              </button>
              <button onClick={fitToScreen} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1" title="Ajustar à tela">
                <i className="fas fa-expand text-xs"></i>
              </button>
            </div>
            <button onClick={() => { setMobileView('editor'); }} className="md:hidden text-[9px] font-black text-blue-600 uppercase tracking-wide flex items-center gap-1">
              <i className="fas fa-pencil-alt text-[9px]"></i> Editar
            </button>
          </div>

          {/* Área de scroll com o currículo escalado */}
          <div className="flex-1 overflow-auto flex justify-center items-start py-8 px-4 custom-scrollbar">
            <div
              className="print-area shadow-2xl"
              style={{
                width: `${794 * previewScale}px`,
                height: `${1123 * previewScale}px`,
                minWidth: `${794 * previewScale}px`,
                minHeight: `${1123 * previewScale}px`,
                position: 'relative',
              }}
            >
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                  width: '794px',
                  height: '1123px',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  fontFamily,
                }}
              >
                <ResumePreview
                  data={data}
                  template={template}
                  fontSize={fontSize}
                  onSectionClick={handleSectionClick}
                  onReorder={(newOrder) => updateData(prev => ({ ...prev, sectionOrder: newOrder }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={`no-print border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 z-40 transition-all duration-300 ease-in-out shadow-2xl overflow-hidden fixed inset-y-0 right-0 lg:static ${isSidebarOpen ? 'w-[300px] translate-x-0' : 'w-0 lg:w-0 translate-x-full lg:translate-x-0'}`}>
           <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/30 h-16">
              <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2"><i className="fas fa-palette text-blue-600"></i> Estilo</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-300 hover:text-slate-600 dark:hover:text-slate-100 transition-colors"><i className="fas fa-times text-xs"></i></button>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              <section>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tamanho da Fonte</h3>
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">{fontSize}px</span>
                 </div>
                 <input type="range" min="8" max="16" step="0.5" value={fontSize} onChange={(e) => setFontSize(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Família da Fonte</h3>
                <div className="grid grid-cols-2 gap-2">
                  {FONTS.map(f => (
                    <button 
                      key={f.id}
                      onClick={() => setFontFamily(f.family)}
                      className={`px-3 py-2 rounded-lg text-xs border transition-all truncate ${fontFamily === f.family ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400'}`}
                      style={{ fontFamily: f.family }}
                      title={f.label}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Templates</h3>
                   <button onClick={() => setShowFreeTemplates(v => !v)} className="text-[9px] text-slate-400 hover:text-blue-600 font-black uppercase transition-colors flex items-center gap-1">
                     <i className={`fas ${showFreeTemplates ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                     {showFreeTemplates ? 'Ocultar' : 'Mostrar'}
                   </button>
                 </div>
                 {showFreeTemplates && (
                   <div className="space-y-3">
                     {FREE_TEMPLATES.map(t => (
                       <button key={t.id} onClick={() => handleTemplateSelect(t.id as TemplateId)} className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 group ${template === t.id ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm' : 'border-slate-50 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-600'}`}>
                          <TemplateThumbnail template={t.id as TemplateId} className="w-14 h-[74px] shrink-0" />
                          <div className="text-left flex-1 min-w-0">
                            <p className={`text-[10px] font-black uppercase truncate ${template === t.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{t.label}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase truncate">{t.desc}</p>
                          </div>
                          {template === t.id && <i className="fas fa-check text-blue-600 text-xs shrink-0"></i>}
                       </button>
                     ))}
                   </div>
                 )}
                 {/* New templates highlight in sidebar */}
                 <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700/40">
                   <div className="flex items-center gap-2 mb-1">
                     <i className="fas fa-sparkles text-blue-500 text-xs"></i>
                     <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wide">6 Novos Modelos!</p>
                   </div>
                   <p className="text-[9px] text-blue-600 dark:text-blue-500">Aurora Dark, Tech Dark, Creative Portfolio e mais.</p>
                   <button onClick={() => { handleTemplateSelect(template); navigateTo('/', 'templates'); }} className="mt-2 text-[9px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wide hover:underline">Ver todos →</button>
                 </div>
              </section>
              <section className="pt-4 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modo Escuro</span>
                     <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-12 h-6 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                       <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isDarkMode ? 'translate-x-6' : ''}`}></div>
                     </button>
                  </div>
              </section>
              <div className="pt-8 space-y-3">
                 <button onClick={handleClearData} className="w-full py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-red-100/50 dark:border-red-900/20">Limpar Dados</button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}