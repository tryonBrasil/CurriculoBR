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
import { 
  validateEmailError, 
  validatePhoneError
} from './services/validationService';

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
  const [view, setView] = useState<'home' | 'templates' | 'editor' | 'privacy' | 'terms' | 'cover-letter-page'>('home');
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
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  
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
    }
    
    const handlePopState = () => {
      const p = window.location.pathname;
      if (p === '/carta-de-apresentacao') setView('cover-letter-page');
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
      window.print();
    } catch (e) {
      console.error("Erro ao imprimir:", e);
      showToast("Não foi possível iniciar a impressão. Tente Ctrl+P.", "error");
    }
  };

  const handleExportDocx = () => {
    try {
      exportToDocx(data);
      showToast("Download do DOCX iniciado!");
    } catch (e) {
      console.error("Erro ao exportar DOCX:", e);
      showToast("Erro ao gerar arquivo Word.", "error");
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
    updateData(prev => ({ ...prev, photoUrl: croppedImage }));
    setIsPhotoModalOpen(false);
    setPendingPhoto(null);
  };

  const cvScore = useMemo(() => {
    let points = 0;
    if (data.fullName) points += 15;
    if (data.summary && data.summary.length > 50) points += 15;
    if (data.experiences?.length > 0) points += 20;
    if (data.education?.length > 0) points += 15;
    if (data.languages?.length > 0) points += 10;
    if (data.certifications?.length > 0) points += 10;
    if (data.skills?.length >= 5) points += 10;
    if (data.photoUrl) points += 5;
    return Math.min(points, 100);
  }, [data]);

  const activeTab = STEPS[currentStep].id;

  const validateField = (field: string, value: string) => {
    let error: string | null = null;
    if (field === 'email') error = validateEmailError(value);
    if (field === 'phone') error = validatePhoneError(value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const addItem = (listName: 'experiences' | 'education' | 'languages' | 'certifications') => {
    const id = Math.random().toString(36).substr(2, 9);
    if (listName === 'experiences') {
      const newItem: Experience = { id, company: '', position: '', period: '', description: '' };
      updateData(prev => ({ ...prev, experiences: [newItem, ...(prev.experiences || [])] }));
    } else if (listName === 'education') {
      const newItem: Education = { id, school: '', degree: '', year: '' };
      updateData(prev => ({ ...prev, education: [newItem, ...(prev.education || [])] }));
    } else if (listName === 'languages') {
      const newItem: Language = { id, name: '', level: '' };
      updateData(prev => ({ ...prev, languages: [newItem, ...(prev.languages || [])] }));
    } else if (listName === 'certifications') {
      const newItem: Certification = { id, name: '', issuer: '', year: '' };
      updateData(prev => ({ ...prev, certifications: [newItem, ...(prev.certifications || [])] }));
    }
  };

  const removeItem = (listName: 'experiences' | 'education' | 'languages' | 'certifications', id: string) => {
    updateData(prev => ({
      ...prev,
      [listName]: (prev[listName] as any[]).filter(item => item.id !== id)
    }));
  };

  const updateItem = <T extends 'experiences' | 'education' | 'languages' | 'certifications'>(
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
    if (!data.skills || isEnhancing) return;
    setIsEnhancing('summary-gen');
    try {
      const expPositions = data.experiences.map(e => e.position);
      
      await generateSummaryStream("Profissional", data.skills, expPositions, (currentText) => {
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
      
      if (suggested) {
        updateData(prev => ({ ...prev, skills: prev.skills ? `${prev.skills}, ${suggested}` : suggested }));
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
            <p>Última atualização: {new Date().getFullYear()}</p>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">1. Introdução</h3>
                <p>A sua privacidade é importante para nós. É política do CurriculoBR respeitar a sua privacidade em relação a qualquer informação que possamos coletar no site CurriculoBR.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2. Coleta de Dados</h3>
                <p>Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Dados do Currículo:</strong> Nome, email, telefone, endereço, histórico profissional e educacional são coletados exclusivamente para a geração do documento PDF.</li>
                    <li><strong>Armazenamento Local:</strong> Seus dados são salvos no "LocalStorage" do seu navegador para sua conveniência, permitindo que você continue a edição posteriormente. Nós não armazenamos seus dados pessoais em servidores permanentes.</li>
                </ul>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">3. Uso de Inteligência Artificial</h3>
                <p>Utilizamos a API do Google Gemini para funcionalidades de melhoria de texto e geração de resumos. Ao utilizar estas funções, o texto selecionado é enviado para processamento e não é retido para treinamento de modelos, conforme as políticas da Google Cloud.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">4. Publicidade</h3>
                <p>O Google, como fornecedor de terceiros, utiliza cookies para exibir anúncios. O uso do cookie DART pelo Google permite que ele apresente anúncios para nossos usuários com base em sua visita ao nosso site e a outros sites na Internet.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">5. Compromisso do Usuário</h3>
                <p>O usuário se compromete a fazer uso adequado dos conteúdos e da informação que o CurriculoBR oferece no site e com caráter enunciativo, mas não limitativo:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>A) Não se envolver em atividades que sejam ilegais ou contrárias à boa fé a à ordem pública;</li>
                    <li>B) Não difundir propaganda ou conteúdo de natureza racista, xenofóbica, ou azar, qualquer tipo de pornografia ilegal, de apologia ao terrorismo ou contra os direitos humanos.</li>
                </ul>
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
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">1. Termos</h3>
                <p>Ao acessar ao site CurriculoBR, concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis ​​e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2. Uso de Licença</h3>
                <p>É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site CurriculoBR, apenas para visualização transitória pessoal e não comercial.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">3. Isenção de responsabilidade</h3>
                <p>Os materiais no site da CurriculoBR são fornecidos 'como estão'. CurriculoBR não oferece garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias, incluindo, sem limitação, garantias implícitas ou condições de comercialização, adequação a um fim específico ou não violação de propriedade intelectual ou outra violação de direitos.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">4. Limitações</h3>
                <p>Em nenhum caso o CurriculoBR ou seus fornecedores serão responsáveis ​​por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar os materiais em CurriculoBR.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">5. Precisão dos materiais</h3>
                <p>Os materiais exibidos no site da CurriculoBR podem incluir erros técnicos, tipográficos ou fotográficos. CurriculoBR não garante que qualquer material em seu site seja preciso, completo ou atual.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">6. Inteligência Artificial</h3>
                <p>As sugestões geradas por IA são apenas para fins de assistência. O usuário é totalmente responsável por revisar e validar todas as informações antes de utilizar o currículo gerado.</p>
            </section>
        </div>
      </LegalPageLayout>
    );
  }

  if (view === 'cover-letter-page') {
    const hasData = data.fullName || (data.experiences && data.experiences.length > 0);

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-300">
        {globalOverlays}
        <header className="h-20 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-50">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('/', 'home')}>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg"><i className="fas fa-file-invoice text-xs"></i></div>
              <span className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Curriculo<span className="text-blue-600">BR</span></span>
          </div>
          <div className="flex gap-3">
             <button onClick={() => navigateTo('/', 'home')} className="px-4 py-2 text-xs font-bold uppercase text-slate-500 hover:text-blue-600 transition-colors">Voltar ao Início</button>
             <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
               <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
             </button>
          </div>
        </header>
        <main className="flex-1 p-8 md:p-12 overflow-y-auto">
           <div className="max-w-2xl mx-auto space-y-8">
              <div className="text-center space-y-2 mb-8">
                 <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gerador de <span className="text-blue-600">Carta</span></h1>
                 <p className="text-slate-500 dark:text-slate-400">Crie uma carta de apresentação personalizada e persuasiva usando Inteligência Artificial.</p>
              </div>

              {!hasData && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                   <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center text-yellow-600 dark:text-yellow-400 shrink-0">
                      <i className="fas fa-info-circle text-xl"></i>
                   </div>
                   <div className="flex-1">
                      <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-300 uppercase tracking-wide">Dados Faltando</h3>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">Para criar uma carta realmente boa, a IA precisa conhecer seu histórico profissional. Importe seu currículo para começar.</p>
                   </div>
                   <button onClick={() => setIsImportModalOpen(true)} className="px-6 py-3 bg-yellow-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-yellow-700 transition-all shrink-0">
                      Importar PDF
                   </button>
                </div>
              )}

              <CoverLetterGenerator resumeData={data} />
              
              <div className="mt-12 border-t border-slate-200 dark:border-slate-800 pt-8">
                  <AdUnit slotId="" format="horizontal" />
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
              <span className="inline-block py-2 px-4 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">Gerador de Currículos IA</span>
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Seu currículo perfeito, <br className="hidden md:block"/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 italic">em minutos.</span></h2>
              <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">Combine design profissional com o poder da Inteligência Artificial para conquistar a vaga dos seus sonhos.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <button onClick={() => navigateTo('/', 'templates')} className="group bg-blue-600 text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 hover:scale-[1.05] transition-all shadow-2xl flex items-center gap-3">
                Criar do Zero <i className="fas fa-magic"></i>
              </button>
              <button onClick={() => setIsImportModalOpen(true)} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xl flex items-center gap-3">
                Importar Currículo <i className="fas fa-file-import"></i>
              </button>
            </div>
            
            <div className="mt-8">
               <button onClick={() => navigateTo('/carta-de-apresentacao', 'cover-letter-page')} className="text-slate-400 hover:text-blue-600 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto">
                 <i className="fas fa-envelope-open-text"></i> Precisa apenas de uma Carta de Apresentação?
               </button>
            </div>

            <div className="mt-12 max-w-3xl mx-auto">
               <AdUnit slotId="" format="horizontal" />
            </div>
          </div>
        </main>
        
        <footer className="relative z-10 py-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center">
          <div className="flex flex-col md:flex-row justify-center gap-6 md:gap-12 mb-4">
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
        <header className="h-20 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-50">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('/', 'home')}>
             <i className="fas fa-arrow-left text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"></i>
             <span className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Voltar</span>
          </div>
          <h1 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-tight">Escolha seu Modelo</h1>
          <div className="w-20"></div>
        </header>
        <main className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar flex flex-col md:flex-row gap-8">
          <div className="hidden lg:block w-[300px] shrink-0">
             <div className="sticky top-8">
                <AdUnit slotId="" format="vertical" className="min-h-[600px]" />
             </div>
          </div>
          <div className="flex-1 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              {TEMPLATES.map((t) => (
                <div key={t.id} className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group border border-slate-100 dark:border-slate-700 flex flex-col">
                  <div className="relative aspect-[210/297] bg-slate-100 dark:bg-slate-900 overflow-hidden">
                    <TemplateThumbnail template={t.id as TemplateId} className="w-full h-full" fontSize={26} />
                    <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                       <button onClick={() => handleTemplateSelect(t.id as TemplateId)} className="bg-white text-blue-600 px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-xl transform scale-90 group-hover:scale-100 transition-transform">Usar este</button>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col gap-2">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase">{t.label}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.desc}</p>
                    <button onClick={() => handleTemplateSelect(t.id as TemplateId)} className="mt-4 w-full py-3 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:hover:bg-blue-600 dark:hover:border-blue-600 transition-all">Selecionar</button>
                  </div>
                </div>
              ))}
            </div>
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
        <PhotoCropModal 
          imageSrc={pendingPhoto} 
          onConfirm={handlePhotoConfirm} 
          onCancel={() => { setIsPhotoModalOpen(false); setPendingPhoto(null); }} 
        />
      )}

      <nav className="no-print h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 md:px-8 z-50 shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('/', 'home')}>
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg"><i className="fas fa-file-invoice text-sm"></i></div>
          <h1 className="font-extrabold text-lg md:text-xl tracking-tighter text-slate-800 dark:text-white uppercase italic hidden sm:block">Curriculo<span className="text-blue-600">BR</span></h1>
        </div>
        
        <div className="flex md:hidden bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
           <button 
             onClick={() => setMobileView('editor')} 
             className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${mobileView === 'editor' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}
           >
             Editar
           </button>
           <button 
             onClick={() => setMobileView('preview')} 
             className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${mobileView === 'preview' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}
           >
             Visualizar
           </button>
        </div>

        <div className="hidden lg:flex items-center gap-8">
           <div className="flex items-center gap-2 mr-4">
              <button onClick={undo} disabled={!canUndo} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${canUndo ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'}`} title="Desfazer"><i className="fas fa-undo text-xs"></i></button>
              <button onClick={redo} disabled={!canRedo} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${canRedo ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'}`} title="Refazer"><i className="fas fa-redo text-xs"></i></button>
           </div>
           <div className="flex items-center gap-3">
              <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${cvScore > 70 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${cvScore}%` }}></div>
              </div>
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{cvScore}% Completo</span>
           </div>
           
           <div className="relative">
             <button 
               onClick={() => setShowDownloadMenu(!showDownloadMenu)} 
               className="bg-blue-600 text-white px-8 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg"
             >
               <i className="fas fa-download"></i> Baixar Currículo
             </button>
             
             {showDownloadMenu && (
               <>
                 <div className="fixed inset-0 z-40" onClick={() => setShowDownloadMenu(false)}></div>
                 <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                   <button 
                     onClick={() => { handlePrint(); setShowDownloadMenu(false); }}
                     className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wide transition-colors"
                   >
                     <i className="fas fa-file-pdf text-red-500 text-lg"></i> PDF
                   </button>
                   <button 
                     onClick={() => { handleExportDocx(); setShowDownloadMenu(false); }}
                     className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wide border-t border-slate-100 dark:border-slate-800 transition-colors"
                   >
                     <i className="fas fa-file-word text-blue-500 text-lg"></i> Word (.docx)
                   </button>
                 </div>
               </>
             )}
           </div>
        </div>
        
        <button className="lg:hidden w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300" onClick={() => setIsSidebarOpen(true)}>
             <i className="fas fa-cog"></i>
        </button>
      </nav>

      <div className="flex-1 flex overflow-hidden relative">
        
        <div className={`no-print w-full md:w-[400px] lg:w-[450px] flex flex-col border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-30 shrink-0 shadow-xl transition-all duration-300 absolute md:relative inset-0 md:inset-auto ${mobileView === 'editor' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
           
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
                        {data.photoUrl ? (
                          <img src={data.photoUrl} alt="Perfil" className="w-full h-full object-cover" />
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
                       {data.photoUrl && (
                           <button onClick={(e) => { e.stopPropagation(); updateData(p => ({...p, photoUrl: ''})); }} className="text-[10px] text-red-500 font-bold uppercase mt-2 hover:underline">Remover foto</button>
                       )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Input label="Nome Completo" value={data.fullName} onChange={(v) => updateData(p => ({...p, fullName: v}))} placeholder="Ex: João da Silva" />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="E-mail" value={data.email} onChange={(v) => updateData(p => ({...p, email: v}))} placeholder="email@exemplo.com" error={errors.email} onBlur={() => validateField('email', data.email)} />
                      <Input label="Telefone" value={data.phone} onChange={(v) => updateData(p => ({...p, phone: v}))} placeholder="(11) 99999-9999" error={errors.phone} onBlur={() => validateField('phone', data.phone)} />
                    </div>
                    <Input label="Localização" value={data.location} onChange={(v) => updateData(p => ({...p, location: v}))} placeholder="Cidade, Estado" />
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
                      <Input label="Período" value={exp.period} onChange={(v) => updateItem('experiences', exp.id, 'period', v)} placeholder="Ex: Jan 2020 - Atual" />
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
                      <Input label="Instituição" value={edu.school} onChange={(v) => updateItem('education', edu.id, 'school', v)} />
                      <Input label="Grau/Curso" value={edu.degree} onChange={(v) => updateItem('education', edu.id, 'degree', v)} />
                      <Input label="Ano/Período" value={edu.year} onChange={(v) => updateItem('education', edu.id, 'year', v)} placeholder="Ex: 2018 - 2022" />
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
                    <button onClick={() => addItem('certifications')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase shadow-sm hover:bg-blue-700 transition-colors">+ Adicionar</button>
                  </div>
                  {data.certifications?.map(cert => (
                    <div key={cert.id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 relative group border-l-4 border-l-yellow-400 shadow-sm">
                      <button onClick={() => removeItem('certifications', cert.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
                      <Input label="Curso / Certificação" value={cert.name} onChange={(v) => updateItem('certifications', cert.id, 'name', v)} />
                      <Input label="Instituição" value={cert.issuer} onChange={(v) => updateItem('certifications', cert.id, 'issuer', v)} />
                      <Input label="Ano" value={cert.year} onChange={(v) => updateItem('certifications', cert.id, 'year', v)} placeholder="Ex: 2023" />
                    </div>
                  ))}
                  {(!data.certifications || data.certifications.length === 0) && (
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
                      value={data.skills} 
                      onChange={(e) => updateData(p => ({...p, skills: e.target.value}))}
                      placeholder="Liste suas habilidades separadas por vírgula..." 
                    />
                  </div>
                </div>
              )}
              {activeTab === 'summary' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Resumo Profissional</h2>
                    <button onClick={handleGenerateSummary} disabled={!data.skills || isEnhancing === 'summary-gen'} className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-2 hover:text-blue-800 transition-colors">
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
              {activeTab === 'scanner' && (
                <JobScanner data={data} onUpdateData={updateData} />
              )}
              {activeTab === 'cover-letter' && (
                <CoverLetterGenerator resumeData={data} />
              )}
           </div>

           <div className="p-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 no-print bg-white dark:bg-slate-900 z-10">
              <button onClick={prevStep} className={`flex-1 py-4 font-bold text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors ${currentStep === 0 ? 'invisible' : ''}`}>Anterior</button>
              <button onClick={nextStep} className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-lg active:scale-95 transition-all">
                {currentStep === STEPS.length - 1 ? 'Exportar PDF' : 'Próximo Passo'}
              </button>
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
                 <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Templates</h3>
                 <div className="space-y-4">
                    {TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => handleTemplateSelect(t.id as TemplateId)} className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-4 group ${template === t.id ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm' : 'border-slate-50 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-600'}`}>
                         <TemplateThumbnail template={t.id as TemplateId} className="w-16 h-20" />
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
    );
  };