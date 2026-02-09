
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ResumeData, TemplateId, Experience, Education, Skill, Language, Course, SectionId } from './types';
import { INITIAL_RESUME_DATA, MOCK_RESUME_DATA } from './constants';
import Input from './components/Input';
import ResumePreview from './components/ResumePreview';
import PhotoCropModal from './components/PhotoCropModal';
import Toast from './components/Toast';
import TemplateThumbnail from './components/TemplateThumbnail';
import ConfirmModal from './components/ConfirmModal';
import { useResumeHistory } from './hooks/useResumeHistory';
import { enhanceText, generateSummary, suggestSkills } from './services/geminiService';
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

const STORAGE_KEY = 'curriculobr_data';

const App: React.FC = () => {
  // Adicionado estado 'templates'
  const [view, setView] = useState<'home' | 'templates' | 'editor'>('home');
  const [template, setTemplate] = useState<TemplateId>('modern_blue');
  const [currentStep, setCurrentStep] = useState(0);
  const [previewScale, setPreviewScale] = useState(0.55);
  const [fontSize, setFontSize] = useState(12);
  const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [highlightedStep, setHighlightedStep] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Estado genérico para modal de confirmação
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; action: () => void } | null>(null);
  
  // Usando o Hook de Histórico
  const { data, updateData, undo, redo, canUndo, canRedo, setHistoryDirect } = useResumeHistory(INITIAL_RESUME_DATA);

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);

  // Carregar dados salvos
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.data) setHistoryDirect({ past: [], present: parsed.data, future: [] });
        if (parsed.template) setTemplate(parsed.template);
        if (parsed.fontSize) setFontSize(parsed.fontSize);
        if (parsed.isDarkMode) setIsDarkMode(parsed.isDarkMode);
      } catch (e) {
        console.error("Erro ao carregar dados salvos:", e);
      }
    }
  }, []);

  // Dark Mode Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Salvar automaticamente com Debounce (2 segundos)
  useEffect(() => {
    if (view === 'editor') {
      const handler = setTimeout(() => {
        const stateToSave = { data, template, fontSize, isDarkMode };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      }, 2000);

      return () => clearTimeout(handler);
    }
  }, [data, template, fontSize, view, isDarkMode]);

  const showToast = (message: string, type: 'error' | 'success' = 'success') => {
    setToast({ message, type });
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

  const cvScore = useMemo(() => {
    let points = 0;
    if (data.personalInfo.fullName) points += 15;
    if (data.personalInfo.jobTitle) points += 10;
    if (data.summary && data.summary.length > 50) points += 15;
    if (data.experiences?.length > 0) points += 20;
    if (data.education?.length > 0) points += 15;
    if (data.skills?.length >= 3) points += 10;
    if (data.languages?.length > 0) points += 5;
    if (data.courses?.length > 0) points += 10;
    return Math.min(points, 100);
  }, [data]);

  const activeTab = STEPS[currentStep].id;

  const validateField = (field: string, value: string) => {
    let error: string | null = null;
    if (field === 'email') error = validateEmailError(value);
    if (field === 'phone') error = validatePhoneError(value);
    if (field === 'linkedin') error = validateURLError(value, 'URL');
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const updatePersonalInfo = (field: keyof ResumeData['personalInfo'], value: string) => {
    updateData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }));
  };

  const addItem = (listName: 'experiences' | 'education' | 'skills' | 'languages' | 'courses') => {
    const id = Math.random().toString(36).substr(2, 9);
    if (listName === 'experiences') {
      const newItem: Experience = { id, company: '', position: '', location: '', startDate: '', endDate: '', current: false, description: '' };
      updateData(prev => ({ ...prev, experiences: [newItem, ...(prev.experiences || [])] }));
    } else if (listName === 'education') {
      const newItem: Education = { id, institution: '', degree: '', field: '', location: '', startDate: '', endDate: '' };
      updateData(prev => ({ ...prev, education: [newItem, ...(prev.education || [])] }));
    } else if (listName === 'skills') {
      const newItem: Skill = { id, name: '', level: 'Intermediate' };
      updateData(prev => ({ ...prev, skills: [...(prev.skills || []), newItem] }));
    } else if (listName === 'languages') {
      const newItem: Language = { id, name: '', level: '', percentage: 60 };
      updateData(prev => ({ ...prev, languages: [...(prev.languages || []), newItem] }));
    } else if (listName === 'courses') {
      const newItem: Course = { id, name: '', institution: '', year: '' };
      updateData(prev => ({ ...prev, courses: [...(prev.courses || []), newItem] }));
    }
  };

  const removeItem = (listName: 'experiences' | 'education' | 'skills' | 'languages' | 'courses', id: string) => {
    updateData(prev => ({
      ...prev,
      [listName]: (prev[listName] as any[]).filter(item => item.id !== id)
    }));
  };

  const updateItem = <T extends 'experiences' | 'education' | 'skills' | 'languages' | 'courses'>(
    listName: T, 
    id: string, 
    field: string, 
    value: any
  ) => {
    updateData(prev => {
      // @ts-ignore
      const newList = (prev[listName] as any[]).map(item => item.id === id ? { ...item, [field]: value } : item);
      
      // Validação de intervalo de data
      if ((listName === 'experiences' || listName === 'education') && (field === 'startDate' || field === 'endDate')) {
        const item = newList.find((i: any) => i.id === id);
        const dateVal = validateDateRange(item.startDate, item.endDate);
        if (!dateVal.valid) {
          setErrors(prevErr => ({ ...prevErr, [`${listName}_${id}_date`]: dateVal.error || null }));
        } else {
          setErrors(prevErr => ({ ...prevErr, [`${listName}_${id}_date`]: null }));
        }
      }

      return { ...prev, [listName]: newList };
    });
  };

  const handleEnhance = async (text: string, context: string, listName?: any, id?: string) => {
    if (isEnhancing) return;
    
    // Validação extra para texto curto
    if (!text || text.length < 5) {
      showToast("Texto muito curto para a IA processar.", "error");
      return;
    }

    setIsEnhancing(id || context);
    try {
      const enhanced = await enhanceText(text, context);
      if (listName && id) {
        updateItem(listName, id, 'description', enhanced);
      } else if (context === 'summary') {
        updateData(prev => ({ ...prev, summary: enhanced }));
      }
      showToast("Texto refinado pela IA!");
    } catch (err) {
      console.error(err);
      showToast("Erro ao processar a IA. Tente novamente.", "error");
    } finally {
      setIsEnhancing(null);
    }
  };

  const handleGenerateSummary = async () => {
    if (!data.personalInfo.jobTitle || isEnhancing) return;
    setIsEnhancing('summary-gen');
    try {
      const skillNames = data.skills.map(s => s.name);
      const expPositions = data.experiences.map(e => e.position);
      const generated = await generateSummary(data.personalInfo.jobTitle, skillNames, expPositions);
      updateData(prev => ({ ...prev, summary: generated }));
      showToast("Resumo gerado com sucesso!");
    } catch (err) {
      console.error(err);
      showToast("Erro ao gerar resumo. Verifique o cargo inserido.", "error");
    } finally {
      setIsEnhancing(null);
    }
  };

  const handleSuggestSkills = async () => {
    if (!data.personalInfo.jobTitle || isEnhancing) return;
    setIsEnhancing('skills-suggest');
    try {
      const suggested = await suggestSkills(data.personalInfo.jobTitle);
      if (suggested.length > 0) {
        const newSkills: Skill[] = suggested.map(s => ({
          id: Math.random().toString(36).substr(2, 9),
          name: s,
          level: 'Intermediate'
        }));
        updateData(prev => ({ ...prev, skills: [...prev.skills, ...newSkills] }));
        showToast(`${suggested.length} habilidades sugeridas adicionadas.`);
      }
    } catch (err) {
      console.error(err);
      showToast("Erro ao sugerir habilidades.", "error");
    } finally {
      setIsEnhancing(null);
    }
  };

  // Wrapped in useCallback for React.memo optimization in Preview
  const handleSectionClick = useCallback((sectionId: string) => {
    const stepIdx = STEPS.findIndex(s => s.id === sectionId);
    if (stepIdx !== -1) {
      setCurrentStep(stepIdx);
      setHighlightedStep(sectionId);
      setTimeout(() => setHighlightedStep(null), 1500);
      if (editorScrollRef.current) {
        editorScrollRef.current.scrollTop = 0;
      }
    }
  }, []);

  // Wrapped in useCallback for React.memo optimization in Preview
  const handleReorder = useCallback((newOrder: SectionId[]) => {
    updateData(prev => ({ ...prev, sectionOrder: newOrder }));
  }, [updateData]);

  const fitToScreen = useCallback(() => {
    if (!previewContainerRef.current) return;
    const containerHeight = previewContainerRef.current.clientHeight;
    // 1123px is approx height of A4 at 96dpi
    const scale = (containerHeight - 80) / 1123; 
    setPreviewScale(Math.min(0.9, Math.max(0.3, scale)));
  }, []);

  const fitToWidth = useCallback(() => {
    if (!previewContainerRef.current) return;
    const containerWidth = previewContainerRef.current.clientWidth;
    // 794px is approx width of A4 at 96dpi
    const scale = (containerWidth - 80) / 794;
    setPreviewScale(Math.min(1.0, Math.max(0.3, scale)));
  }, []);

  useEffect(() => {
    if (view === 'editor') {
      fitToScreen();
      window.addEventListener('resize', fitToScreen);
      return () => window.removeEventListener('resize', fitToScreen);
    }
  }, [view, isSidebarOpen, fitToScreen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempImage(reader.result as string);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = (croppedImage: string) => {
    updatePersonalInfo('photoUrl', croppedImage);
    setIsCropModalOpen(false);
    setTempImage(null);
    showToast("Foto atualizada!");
  };

  const handleTemplateSelect = (selectedTemplate: TemplateId) => {
    setTemplate(selectedTemplate);
    updateData(INITIAL_RESUME_DATA);
    setView('editor');
  };

  // RENDERIZAÇÃO DA PÁGINA HOME
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
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-24 text-center">
          <div className="max-w-5xl w-full space-y-8">
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
              <span className="inline-block py-2 px-4 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">Gerador de Currículos IA</span>
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Seu currículo perfeito, <br className="hidden md:block"/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 italic">em minutos.</span></h2>
              <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">Combine design profissional com o poder da Inteligência Artificial para conquistar a vaga dos seus sonhos.</p>
            </div>
            <div className="flex items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <button onClick={() => setView('templates')} className="group bg-slate-900 dark:bg-blue-600 text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 hover:scale-[1.05] transition-all shadow-2xl flex items-center gap-3">Criar Agora <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i></button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // RENDERIZAÇÃO DA PÁGINA DE SELEÇÃO DE TEMPLATES
  if (view === 'templates') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-300">
        <header className="h-20 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-50">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
             <i className="fas fa-arrow-left text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"></i>
             <span className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Voltar</span>
          </div>
          <h1 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-tight">Escolha seu Modelo</h1>
          <div className="w-20"></div> {/* Spacer for centering */}
        </header>

        <main className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
              {TEMPLATES.map((t) => (
                <div key={t.id} className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group border border-slate-100 dark:border-slate-700 flex flex-col">
                  <div className="relative aspect-[210/297] bg-slate-100 dark:bg-slate-900 overflow-hidden">
                    <TemplateThumbnail template={t.id as TemplateId} className="w-full h-full" />
                    <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                       <button 
                         onClick={() => handleTemplateSelect(t.id as TemplateId)}
                         className="bg-white text-blue-600 px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-xl transform scale-90 group-hover:scale-100 transition-transform"
                       >
                         Usar este
                       </button>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col gap-2">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase">{t.label}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.desc}</p>
                    <button 
                         onClick={() => handleTemplateSelect(t.id as TemplateId)}
                         className="mt-4 w-full py-3 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:hover:bg-blue-600 dark:hover:border-blue-600 transition-all"
                       >
                         Selecionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // RENDERIZAÇÃO DO EDITOR
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {confirmModal && (
        <ConfirmModal 
          isOpen={confirmModal.isOpen} 
          title={confirmModal.title} 
          message={confirmModal.message} 
          onConfirm={confirmModal.action} 
          onCancel={() => setConfirmModal(null)} 
        />
      )}

      {isCropModalOpen && tempImage && (
        <PhotoCropModal imageSrc={tempImage} onConfirm={handleCropConfirm} onCancel={() => setIsCropModalOpen(false)} />
      )}
      <nav className="no-print h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8 z-50 shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg"><i className="fas fa-file-invoice text-sm"></i></div>
          <h1 className="font-extrabold text-xl tracking-tighter text-slate-800 dark:text-white uppercase italic">Curriculo<span className="text-blue-600">BR</span></h1>
        </div>
        <div className="hidden lg:flex items-center gap-8">
           <div className="flex items-center gap-2 mr-4">
              <button onClick={undo} disabled={!canUndo} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${canUndo ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'}`} title="Desfazer">
                <i className="fas fa-undo text-xs"></i>
              </button>
              <button onClick={redo} disabled={!canRedo} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${canRedo ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'}`} title="Refazer">
                <i className="fas fa-redo text-xs"></i>
              </button>
           </div>
           <div className="flex items-center gap-3">
              <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${cvScore > 70 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${cvScore}%` }}></div>
              </div>
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{cvScore}% Completo</span>
           </div>
           <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg">
             <i className="fas fa-download"></i> Exportar PDF
           </button>
        </div>
      </nav>
      <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
        <div className="no-print w-full md:w-[420px] flex flex-col border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-40 shrink-0 shadow-xl transition-colors duration-300">
           <div className="flex overflow-x-auto border-b border-slate-50 dark:border-slate-800 shrink-0 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
             {STEPS.map((step, idx) => (
               <button 
                key={step.id} 
                onClick={() => setCurrentStep(idx)} 
                className={`flex-1 min-w-[100px] py-5 flex flex-col items-center gap-2 transition-all relative px-2 shrink-0 ${currentStep === idx ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 shadow-inner' : 'text-slate-400 grayscale hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
               >
                 <i className={`fas ${step.icon} text-[14px]`}></i>
                 <span className="text-[9px] font-black uppercase tracking-[0.1em] whitespace-nowrap">{step.label}</span>
                 {currentStep === idx && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>}
               </button>
             ))}
           </div>
           <div ref={editorScrollRef} className={`flex-1 overflow-y-auto custom-scrollbar p-6 transition-colors duration-500 ${highlightedStep ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}>
              {activeTab === 'info' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Informações Pessoais</h2>
                  <div className="mb-8 flex flex-col items-center">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-slate-50 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        {data.personalInfo.photoUrl ? <img src={data.personalInfo.photoUrl} className="w-full h-full object-cover" /> : <i className="fas fa-user text-3xl text-slate-300"></i>}
                      </div>
                      <div className="absolute inset-0 bg-blue-600/60 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase text-center p-2">Alterar Foto</div>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>
                  <div className="space-y-2">
                    <Input label="Nome Completo" value={data.personalInfo.fullName} onChange={(v) => updatePersonalInfo('fullName', v)} placeholder="Ex: João da Silva" />
                    <Input label="Cargo Pretendido" value={data.personalInfo.jobTitle} onChange={(v) => updatePersonalInfo('jobTitle', v)} placeholder="Ex: Engenheiro de Software" />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="E-mail" value={data.personalInfo.email} onChange={(v) => updatePersonalInfo('email', v)} placeholder="email@exemplo.com" error={errors.email} onBlur={() => validateField('email', data.personalInfo.email)} />
                      <Input label="Telefone" value={data.personalInfo.phone} onChange={(v) => updatePersonalInfo('phone', v)} placeholder="(11) 99999-9999" error={errors.phone} onBlur={() => validateField('phone', data.personalInfo.phone)} />
                    </div>
                    <Input label="Localização" value={data.personalInfo.location} onChange={(v) => updatePersonalInfo('location', v)} placeholder="Cidade, Estado" />
                    <Input label="LinkedIn" value={data.personalInfo.linkedin} onChange={(v) => updatePersonalInfo('linkedin', v)} placeholder="linkedin.com/in/perfil" error={errors.linkedin} onBlur={() => validateField('linkedin', data.personalInfo.linkedin)} />
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
                    <div key={exp.id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 relative group border-l-4 border-l-blue-400">
                      <button onClick={() => removeItem('experiences', exp.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
                      <Input label="Empresa" value={exp.company} onChange={(v) => updateItem('experiences', exp.id, 'company', v)} />
                      <Input label="Cargo" value={exp.position} onChange={(v) => updateItem('experiences', exp.id, 'position', v)} />
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="Início" value={exp.startDate} onChange={(v) => updateItem('experiences', exp.id, 'startDate', v)} error={errors[`experiences_${exp.id}_date`]} />
                        <Input label="Fim" value={exp.endDate} onChange={(v) => updateItem('experiences', exp.id, 'endDate', v)} />
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
                </div>
              )}
              {activeTab === 'education' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Educação</h2>
                    <button onClick={() => addItem('education')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase shadow-sm hover:bg-blue-700 transition-colors">+ Adicionar</button>
                  </div>
                  {data.education?.map(edu => (
                    <div key={edu.id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 relative group border-l-4 border-l-indigo-400">
                      <button onClick={() => removeItem('education', edu.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
                      <Input label="Instituição" value={edu.institution} onChange={(v) => updateItem('education', edu.id, 'institution', v)} />
                      <Input label="Curso" value={edu.degree} onChange={(v) => updateItem('education', edu.id, 'degree', v)} />
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="Início" value={edu.startDate} onChange={(v) => updateItem('education', edu.id, 'startDate', v)} error={errors[`education_${edu.id}_date`]} />
                        <Input label="Fim" value={edu.endDate} onChange={(v) => updateItem('education', edu.id, 'endDate', v)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'skills' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Habilidades</h2>
                    <button onClick={() => addItem('skills')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase shadow-sm hover:bg-blue-700 transition-colors">+ Adicionar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {data.skills?.map(skill => (
                      <div key={skill.id} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 group transition-all hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm">
                        <input className="flex-1 bg-transparent border-none text-[11px] font-bold outline-none dark:text-white" value={skill.name} onChange={(e) => updateItem('skills', skill.id, 'name', e.target.value)} placeholder="Habilidade..." />
                        <button onClick={() => removeItem('skills', skill.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><i className="fas fa-times"></i></button>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={handleSuggestSkills} 
                    disabled={isEnhancing === 'skills-suggest'}
                    className="w-full py-4 border-2 border-dashed border-blue-100 dark:border-slate-700 rounded-2xl text-[10px] font-black text-blue-400 dark:text-slate-400 uppercase tracking-widest hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <i className={`fas ${isEnhancing === 'skills-suggest' ? 'fa-circle-notch fa-spin' : 'fa-wand-magic-sparkles'}`}></i> Sugerir com IA
                  </button>
                </div>
              )}
              {activeTab === 'summary' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Resumo Profissional</h2>
                    <button onClick={handleGenerateSummary} disabled={!data.personalInfo.jobTitle || isEnhancing === 'summary-gen'} className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-2 hover:text-blue-800 transition-colors">
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
                      disabled={!data.summary || isEnhancing === 'summary'}
                      className="absolute bottom-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700 hover:text-blue-600 transition-all"
                    >
                      <i className={`fas ${isEnhancing === 'summary' ? 'fa-circle-notch fa-spin' : 'fa-magic'} mr-1`}></i> Refinar
                    </button>
                  </div>
                </div>
              )}
              {activeTab === 'extras' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-8">
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Idiomas</h2>
                      <button onClick={() => addItem('languages')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase shadow-sm hover:bg-blue-700 transition-colors">+ Adicionar</button>
                    </div>
                    {data.languages?.map(lang => (
                      <div key={lang.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-4 border border-slate-100 dark:border-slate-700 group hover:shadow-sm transition-all">
                        <div className="flex justify-between items-center mb-2">
                           <input className="bg-transparent font-black text-xs outline-none focus:text-blue-600 transition-colors dark:text-white" value={lang.name} onChange={(e) => updateItem('languages', lang.id, 'name', e.target.value)} placeholder="Ex: Inglês" />
                           <button onClick={() => removeItem('languages', lang.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><i className="fas fa-trash-alt text-[10px]"></i></button>
                        </div>
                        <input type="range" className="w-full h-1 bg-slate-200 dark:bg-slate-600 accent-blue-600 appearance-none rounded-full cursor-pointer" value={lang.percentage} onChange={(e) => updateItem('languages', lang.id, 'percentage', parseInt(e.target.value))} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
           </div>
           <div className="p-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 no-print">
              <button onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))} className={`flex-1 py-4 font-bold text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors ${currentStep === 0 ? 'invisible' : ''}`}>Anterior</button>
              <button onClick={() => currentStep === STEPS.length - 1 ? window.print() : setCurrentStep(prev => prev + 1)} className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-lg active:scale-95 transition-all">
                {currentStep === STEPS.length - 1 ? 'Exportar PDF' : 'Próximo Passo'}
              </button>
           </div>
        </div>

        {/* NOVA ÁREA DE PREVIEW REFORMULADA */}
        <div ref={previewContainerRef} className="flex-1 bg-slate-200 dark:bg-slate-950/50 relative flex flex-col overflow-hidden">
           
           {/* Barra de Ferramentas Flutuante */}
           <div className="no-print absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 dark:border-slate-800/50 z-[70] transition-all hover:scale-[1.02]">
              <button onClick={() => setPreviewScale(p => Math.max(0.3, p - 0.1))} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors" title="Diminuir Zoom">
                <i className="fas fa-minus text-xs"></i>
              </button>
              
              <div className="px-3 min-w-[60px] text-center font-bold text-xs text-slate-600 dark:text-slate-300 select-none">
                {Math.round(previewScale * 100)}%
              </div>

              <button onClick={() => setPreviewScale(p => Math.min(2.0, p + 0.1))} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors" title="Aumentar Zoom">
                <i className="fas fa-plus text-xs"></i>
              </button>
              
              <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>

              <button onClick={fitToWidth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors" title="Ajustar à Largura">
                <i className="fas fa-arrows-left-right text-xs"></i>
              </button>

              <button onClick={fitToScreen} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors" title="Ajustar à Página">
                <i className="fas fa-expand text-xs"></i>
              </button>

               <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>

               <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${isSidebarOpen ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'}`} title="Configurações">
                 <i className="fas fa-cog text-xs"></i>
               </button>
           </div>

           {/* Área de Documento com Scroll Nativo */}
           <div className="flex-1 overflow-auto custom-scrollbar flex justify-center p-8 md:p-12 pb-32">
              <div 
                className="print-container transition-transform duration-200 ease-out origin-top" 
                style={{ transform: `scale(${previewScale})` }}
              >
                 <ResumePreview data={data} template={template} fontSize={fontSize} onSectionClick={handleSectionClick} onReorder={handleReorder} />
              </div>
           </div>
        </div>

        <div className={`no-print border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 z-40 transition-all duration-300 ease-in-out shadow-2xl overflow-hidden ${isSidebarOpen ? 'w-[320px] opacity-100' : 'w-0 opacity-0'}`}>
           <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/30">
              <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2"><i className="fas fa-palette text-blue-600"></i> Estilo</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-300 hover:text-slate-600 dark:hover:text-slate-100 transition-colors"><i className="fas fa-times text-xs"></i></button>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              <section>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fonte</h3>
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">{fontSize}px</span>
                 </div>
                 <input type="range" min="8" max="16" step="0.5" value={fontSize} onChange={(e) => setFontSize(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </section>
              <section>
                 <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Templates</h3>
                 <div className="space-y-4">
                    {TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => setTemplate(t.id as TemplateId)} className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-4 group ${template === t.id ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm' : 'border-slate-50 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-600'}`}>
                         <TemplateThumbnail template={t.id as TemplateId} className="w-20 h-24" />
                         <div className="text-left flex-1 min-w-0">
                           <p className={`text-[10px] font-black uppercase truncate ${template === t.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{t.label}</p>
                           <p className="text-[8px] text-slate-400 font-bold uppercase truncate">{t.desc}</p>
                         </div>
                      </button>
                    ))}
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
};

export default App;
