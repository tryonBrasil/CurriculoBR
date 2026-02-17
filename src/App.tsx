
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ResumeData, TemplateId, Experience, Education, Skill, Language, Course, SectionId } from './types';
import { INITIAL_RESUME_DATA, MOCK_RESUME_DATA } from './constants';
import Input from './components/Input';
import ResumePreview from './components/ResumePreview';
import PhotoCropModal from './components/PhotoCropModal';
import Toast from './components/Toast';
import TemplateThumbnail from './components/TemplateThumbnail';
import ConfirmModal from './components/ConfirmModal';
import AdUnit from './components/AdUnit'; // Importação do AdUnit
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
  // Adicionado estado 'templates', 'privacy' e 'terms'
  const [view, setView] = useState<'home' | 'templates' | 'editor' | 'privacy' | 'terms'>('home');
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
  
  // Estados para Importação com IA
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  
  // Usando o Hook de Histórico
  const { data, updateData, undo, redo, canUndo, canRedo, setHistoryDirect } = useResumeHistory(INITIAL_RESUME_DATA);

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
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

  // Função para processar o texto colado e transformar em currículo
  const handleImportSubmit = async () => {
    if (!importText.trim()) {
      showToast("Por favor, cole o texto do seu currículo ou faça upload de um PDF.", "error");
      return;
    }
    
    setIsImporting(true);
    try {
      const parsedData = await parseResumeWithAI(importText);
      
      // Mescla os dados iniciais com os dados encontrados pela IA
      updateData({
        ...INITIAL_RESUME_DATA,
        ...parsedData,
      });
      
      setIsImportModalOpen(false);
      setImportText('');
      setView('editor'); // Redireciona para o editor
      showToast("Currículo importado com sucesso!");
    } catch (error) {
      console.error(error);
      showToast("Erro ao processar o texto. Tente novamente.", "error");
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
      await enhanceTextStream(text, context, (currentText) => {
          if (listName && id) {
            updateItem(listName, id, 'description', currentText);
          } else if (context === 'summary' || context === 'resumo') {
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
    if (!data.personalInfo.jobTitle || isEnhancing) return;
    setIsEnhancing('summary-gen');
    try {
      const skillNames = data.skills.map(s => s.name);
      const expPositions = data.experiences.map(e => e.position);
      
      await generateSummaryStream(data.personalInfo.jobTitle, skillNames, expPositions, (currentText) => {
         updateData(prev => ({ ...prev, summary: currentText }));
      });
      
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

  // --- RENDERIZAÇÃO DAS PÁGINAS LEGAIS ---
  const LegalPageLayout: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-300">
      <header className="h-20 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
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

  if (view === 'privacy') {
    return (
      <LegalPageLayout title="Política de Privacidade">
         <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Política Privacidade</h2>
         <p className="mb-4">A sua privacidade é importante para nós. É política do CurriculoBR respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site <a href="https://curriculo-br.vercel.app/" className="text-blue-600 hover:underline">CurriculoBR</a>, e outros sites que possuímos e operamos.</p>
         <p className="mb-4">Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.</p>
         <p className="mb-4">Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis ​​para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.</p>
         <p className="mb-4">Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.</p>
         <p className="mb-4">O nosso site pode ter links para sites externos que não são operados por nós. Esteja ciente de que não temos controle sobre o conteúdo e práticas desses sites e não podemos aceitar responsabilidade por suas respectivas <a href="https://politicaprivacidade.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">políticas de privacidade</a>.</p>
         <p className="mb-4">Você é livre para recusar a nossa solicitação de informações pessoais, entendendo que talvez não possamos fornecer alguns dos serviços desejados.</p>
         <p className="mb-4">O uso continuado de nosso site será considerado como aceitação de nossas práticas em torno de privacidade e informações pessoais. Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, entre em contacto connosco.</p>
         
         <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4">Compromisso do Usuário</h3>
         <p className="mb-4">O usuário se compromete a fazer uso adequado dos conteúdos e da informação que o CurriculoBR oferece no site e com caráter enunciativo, mas não limitativo:</p>
         <ul className="list-disc pl-6 mb-6 space-y-2">
           <li>A) Não se envolver em atividades que sejam ilegais ou contrárias à boa fé a à ordem pública;</li>
           <li>B) Não difundir propaganda ou conteúdo de natureza racista, xenofóbica, jogos de sorte ou azar, qualquer tipo de pornografia ilegal, de apologia ao terrorismo ou contra os direitos humanos;</li>
           <li>C) Não causar danos aos sistemas físicos (hardwares) e lógicos (softwares) do CurriculoBR, de seus fornecedores ou terceiros, para introduzir ou disseminar vírus informáticos ou quaisquer outros sistemas de hardware ou software que sejam capazes de causar danos anteriormente mencionados.</li>
         </ul>

         <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4">Mais informações</h3>
         <p className="mb-4">Esperemos que esteja esclarecido e, como mencionado anteriormente, se houver algo que você não tem certeza se precisa ou não, geralmente é mais seguro deixar os cookies ativados, caso interaja com um dos recursos que você usa em nosso site.</p>
         <p className="text-sm text-slate-400 mt-8 italic">Esta política é efetiva a partir de 9 February 2026 12:54</p>
      </LegalPageLayout>
    );
  }

  if (view === 'terms') {
    return (
      <LegalPageLayout title="Termos e Condições">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">1. Termos</h2>
        <p className="mb-4">Ao acessar ao site <a href="https://curriculo-br.vercel.app/" className="text-blue-600 hover:underline">CurriculoBR</a>, concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis ​​e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis. Se você não concordar com algum desses termos, está proibido de usar ou acessar este site. Os materiais contidos neste site são protegidos pelas leis de direitos autorais e marcas comerciais aplicáveis.</p>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-8 mb-6">2. Uso de Licença</h2>
        <p className="mb-4">É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site CurriculoBR , apenas para visualização transitória pessoal e não comercial. Esta é a concessão de uma licença, não uma transferência de título e, sob esta licença, você não pode:</p>
        <ol className="list-decimal pl-6 mb-6 space-y-2">
          <li>modificar ou copiar os materiais;</li>
          <li>usar os materiais para qualquer finalidade comercial ou para exibição pública (comercial ou não comercial);</li>
          <li>tentar descompilar ou fazer engenharia reversa de qualquer software contido no site CurriculoBR;</li>
          <li>remover quaisquer direitos autorais ou outras notações de propriedade dos materiais; ou</li>
          {/* ... fim da sua div "relative z-10" que envolve o conteúdo principal ... */}
          
          {/* SEÇÃO DE CONTEÚDO PARA SEO E ADSENSE (ADICIONADA) */}
          {view === 'home' && (
            <section className="relative z-10 max-w-5xl mx-auto px-6 py-20 border-t border-slate-100 dark:border-slate-800">
              <div className="grid md:grid-cols-3 gap-12 text-left">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white uppercase text-sm mb-4">Por que usar o CurriculoBR?</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Nossa plataforma utiliza algoritmos avançados para garantir que seu currículo passe nos sistemas de triagem (ATS), aumentando suas chances de entrevista em até 60%.</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white uppercase text-sm mb-4">Privacidade Total</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Diferente de outros sites, o CurriculoBR não armazena seus dados em servidores. Tudo é processado no seu navegador, garantindo 100% de sigilo profissional.</p>
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white uppercase text-sm mb-4">Dicas de Especialistas</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Ao usar nossos modelos, você segue padrões internacionais de recrutamento usados por grandes empresas globais de tecnologia e RH.</p>
                </div>
              </div>
            </section>
          )}
        </main>

        {/* FOOTER CORRIGIDO PARA ADSENSE (SUBSTITUIR O SEU ANTERIOR) */}
        <footer className="relative z-10 py-12 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center">
          <div className="flex flex-col md:flex-row justify-center gap-6 md:gap-12 mb-6">
             <button onClick={() => setView('home')} className="text-xs font-bold uppercase text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors">Início</button>
             <button onClick={() => setView('templates')} className="text-xs font-bold uppercase text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors">Modelos</button>
             <button onClick={() => setView('privacy')} className="text-xs font-bold uppercase text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors">Política de Privacidade</button>
             <button onClick={() => setView('terms')} className="text-xs font-bold uppercase text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors">Termos e Condições</button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-600 tracking-widest uppercase font-bold">© 2026 CurriculoBR - O melhor gerador de currículo com IA do Brasil</p>
        </footer>

        {/* ... manter o restante dos modais e componentes de Toast abaixo ... */}
      </div>
    </Router> // Se estiver usando Router, senão mantenha apenas a div pai
  );
}

export default App;
