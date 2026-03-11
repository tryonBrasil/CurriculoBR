import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { ResumeData, TemplateId, Experience, Education, Language, Course, Project } from './types';
import { INITIAL_RESUME_DATA, MOCK_RESUME_DATA } from './constants';
import Input from './components/Input';
import ResumePreview from './components/ResumePreview';
import { exportToDocx } from './services/exportService';
import Toast from './components/Toast';
import TemplateThumbnail from './components/TemplateThumbnail';
import ConfirmModal from './components/ConfirmModal';
import AdUnit from './components/AdUnit';
import CookieConsent from './components/CookieConsent';
import { useResumeHistory } from './hooks/useResumeHistory';
import { usePremium } from './hooks/usePremium';
import { useAuth } from './hooks/useAuth';
import { useCloudSave } from './hooks/useCloudSave';
import { enhanceTextStream, generateSummaryStream, suggestSkills, parseResumeWithAI, generateCoverLetterStream } from './services/geminiService';
// pdfService é carregado sob demanda para não incluir pdfjs no bundle inicial
import {
  validateEmailError,
  validatePhoneError,
  validateURLError,
  validateDateRange
} from './services/validationService';

// Lazy-loaded: só baixam quando o usuário navega para essas páginas
const PhotoCropModal    = lazy(() => import('./components/PhotoCropModal'));
const ATSPanel          = lazy(() => import('./components/ATSPanel'));
const Sobre             = lazy(() => import('./Sobre'));
const Contato           = lazy(() => import('./Contato'));
const BlogList          = lazy(() => import('./blog/BlogList'));
const BlogPost          = lazy(() => import('./blog/BlogPost'));
const AuthModal         = lazy(() => import('./components/AuthModal'));
const SaveModal         = lazy(() => import('./components/SaveModal'));
const CloudResumesModal = lazy(() => import('./components/CloudResumesModal'));
const PremiumModal  = lazy(() => import('./components/PremiumModal'));

// Fallback leve para Suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
    <i className="fas fa-circle-notch fa-spin text-2xl text-blue-500"></i>
  </div>
);

const STEPS = [
  { id: 'info',          label: 'Você',        icon: 'fa-id-card',         emoji: '🧑' },
  { id: 'experience',    label: 'Experiência', icon: 'fa-briefcase',        emoji: '💼' },
  { id: 'education',     label: 'Educação',    icon: 'fa-graduation-cap',   emoji: '🎓' },
  { id: 'languages',     label: 'Idiomas',     icon: 'fa-language',         emoji: '🌍' },
  { id: 'certifications',label: 'Cursos',      icon: 'fa-certificate',      emoji: '🏆' },
  { id: 'projects',      label: 'Projetos',    icon: 'fa-code-branch',      emoji: '🚀' },
  { id: 'skills',        label: 'Skills',      icon: 'fa-bolt',             emoji: '⚡' },
  { id: 'summary',       label: 'Resumo',      icon: 'fa-align-left',       emoji: '✍️' },
];

const FREE_TEMPLATES = [
  { id: 'classic_serif',    label: 'Classic Serif',  desc: 'Tradicional Acadêmico',  badge: '📚 Acadêmico',  badgeColor: 'bg-amber-600'  },
  { id: 'swiss_minimal',    label: 'Swiss Minimal',  desc: 'Design Suíço',           badge: '',              badgeColor: ''              },
  { id: 'corporate_gray',   label: 'Corporate Gray', desc: 'Minimalista Pro',         badge: '',              badgeColor: ''              },
];

// 12 templates premium — avulso R$9,90 · mensal R$14,90 · vitalício R$29,90
const PREMIUM_TEMPLATES_LIST = [
  { id: 'modern_blue',        label: 'Modern Blue',        desc: 'Profissional e Limpo',    badge: '🔥 Mais usado',  badgeColor: 'bg-orange-500' },
  { id: 'modern_vitae',       label: 'Modern Vitae',       desc: 'Elegante e Espaçoso',     badge: '⭐ Popular',     badgeColor: 'bg-blue-600'   },
  { id: 'executive_navy',     label: 'Executive Navy',     desc: 'Premium e Luxuoso',       badge: '💎 Luxo',        badgeColor: 'bg-indigo-600' },
  { id: 'teal_sidebar',       label: 'Teal Sidebar',       desc: 'Corporativo Moderno',     badge: '',               badgeColor: ''              },
  { id: 'executive_red',      label: 'Executive Red',      desc: 'Liderança Sênior',        badge: '',               badgeColor: ''              },
  { id: 'minimal_red_line',   label: 'Minimal Red',        desc: 'Impacto Visual',          badge: '',               badgeColor: ''              },
  { id: 'aurora_dark',        label: 'Aurora Dark',        desc: 'Dark Mode Gradiente',     badge: '🌟 Destaque',    badgeColor: 'bg-purple-600' },
  { id: 'creative_portfolio', label: 'Creative Portfolio', desc: 'Design de Portfólio',     badge: '🎨 Criativo',    badgeColor: 'bg-rose-500'   },
  { id: 'minimalist_pro',     label: 'Minimalist Pro',     desc: 'Ultra Minimalista',       badge: '',               badgeColor: ''              },
  { id: 'bold_impact',        label: 'Bold Impact',        desc: 'Tipografia Forte',        badge: '💥 Ousado',      badgeColor: 'bg-violet-600' },
  { id: 'soft_pastel',        label: 'Soft Pastel',        desc: 'Elegante e Feminino',     badge: '🌸 Delicado',    badgeColor: 'bg-pink-500'   },
  { id: 'tech_dark',          label: 'Tech Dark',          desc: 'Para Área de TI',         badge: '💻 TI & Dev',    badgeColor: 'bg-green-600'  },
];

// FREE_TEMPLATES é a única lista de templates gratuitos usada diretamente

const FONTS = [
  { id: 'inter', label: 'Inter', family: "'Inter', sans-serif" },
  { id: 'roboto', label: 'Roboto', family: "'Roboto', sans-serif" },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif" },
  { id: 'lato', label: 'Lato', family: "'Lato', sans-serif" },
  { id: 'open-sans', label: 'Open Sans', family: "'Open Sans', sans-serif" },
  { id: 'playfair', label: 'Playfair', family: "'Playfair Display', serif" },
  { id: 'merriweather', label: 'Merriweather', family: "'Merriweather', serif" },
];

const STORAGE_KEY = 'curriculogo_data_v2';

// FIX: componente movido para fora do App para evitar recriação a cada render
const AnimatedCounter = ({ target, suffix = '' }: { target: number; suffix?: string }) => {
  const [count, setCount] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        let start = 0;
        const duration = 1500;
        const step = (timestamp: number) => {
          if (!start) start = timestamp;
          const progress = Math.min((timestamp - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(step);
          else setCount(target);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{count.toLocaleString('pt-BR')}{suffix}</span>;
};

// FIX: componente movido para fora do App para evitar recriação a cada render
const LegalPageLayout: React.FC<{ title: string; children: React.ReactNode; onHome: () => void }> = ({ title, children, onHome }) => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-300">
    <header className="h-20 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-50">
      <div className="flex items-center gap-3 cursor-pointer" onClick={onHome}>
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

export default function App() {
  const [view, setView] = useState<'home' | 'templates' | 'editor' | 'privacy' | 'terms' | 'cover-letter-page' | 'sobre' | 'contato' | 'blog' | 'blog-post'>('home');
  const [blogSlug, setBlogSlug] = useState<string>('');
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [template, setTemplate] = useState<TemplateId>('modern_blue');
  const [currentStep, setCurrentStep] = useState(0);
  const [previewScale, setPreviewScale] = useState(0.72);
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

  // Premium
  const { isPremium, plan: premiumPlan, daysLeft, isExpired: premiumExpired, isVerifying, ownerUnlock, toggleOwnerAccess, isOwnerAccessActive, checkAndRevokeIfBlocked, syncPlanFromServer, syncClientToServer, revokePremium } = usePremium();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [premiumModalTemplate, setPremiumModalTemplate] = useState<string>('');

  // ── Auth + Cloud Save ──────────────────────────────────────────────
  const { user, signInWithGoogle, signOut } = useAuth();

  // Quando o auth state muda:
  // • logout (user === null) → limpa premium do localStorage imediatamente
  // • login  (user !== null) → carrega plano do servidor para esta conta
  React.useEffect(() => {
    if (!user) {
      // Logout: limpa o plano para que outra conta não herde o premium
      revokePremium();
      return;
    }
    // Login: limpa qualquer estado residual e carrega plano desta conta do servidor
    revokePremium();
    checkAndRevokeIfBlocked(user.uid).then(blocked => {
      if (blocked) {
        showToast('⛔ Seu acesso Premium foi revogado pelo administrador.', 'error');
      } else {
        syncPlanFromServer(user.uid);
      }
    });
    syncClientToServer({ uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL });
  }, [user?.uid]);

  // Busca depoimentos aprovados ao montar
  useEffect(() => {
    fetch('/api/reviews')
      .then(r => r.ok ? r.json() : { reviews: [] })
      .then(d => setCommunityReviews(d.reviews ?? []))
      .catch(() => {});
  }, []);

  const handleSubmitReview = async () => {
    setReviewError('');
    if (!reviewName.trim()) { setReviewError('Informe seu nome.'); return; }
    if (reviewText.trim().length < 20) { setReviewError('Escreva ao menos 20 caracteres.'); return; }
    setReviewLoading(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: reviewName, role: reviewRole, city: reviewCity, stars: reviewStars, text: reviewText }),
      });
      const data = await res.json();
      if (!res.ok) { setReviewError(data.error || 'Erro ao enviar.'); return; }
      setReviewSent(true);
      setReviewName(''); setReviewRole(''); setReviewCity(''); setReviewText(''); setReviewStars(5);
    } catch { setReviewError('Erro de conexão. Tente novamente.'); }
    finally { setReviewLoading(false); }
  };

  const handleLoadPendingReviews = async () => {
    setPendingReviewsLoading(true);
    try {
      const res = await fetch('/api/reviews?pending=1', { headers: { 'Authorization': `Bearer ${ownerSecret}` } });
      const data = await res.json();
      setPendingReviews(data.reviews ?? []);
    } catch { /* ignora */ }
    finally { setPendingReviewsLoading(false); }
  };

  const handleReviewAction = async (id: string, action: 'approve' | 'delete') => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerSecret}` },
        body: JSON.stringify({ action, id }),
      });
      const data = await res.json();
      if (res.ok) {
        setPendingReviews(prev => prev.filter(r => r.id !== id));
        showToast(data.message || 'Feito!', 'success');
      } else {
        showToast(data.error || 'Erro.', 'error');
      }
    } catch { showToast('Erro de conexão.', 'error'); }
  };
  const { saving: cloudSaving, loading: cloudLoading, resumes: cloudResumes, saveResume, listResumes, deleteResume } = useCloudSave(user);

  // ID do currículo aberto da nuvem (null = não salvo ainda / só local)
  const [currentCloudId, setCurrentCloudId] = useState<string | null>(null);
  const [currentCloudName, setCurrentCloudName] = useState<string>('');

  // Status visual do auto-save local: 'saved' | 'saving' | 'idle'
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Modais
  const [isAuthModalOpen, setIsAuthModalOpen]           = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen]           = useState(false);
  const [isCloudResumesOpen, setIsCloudResumesOpen]     = useState(false);

  // Modal do painel admin
  const [isOwnerModalOpen, setIsOwnerModalOpen]     = useState(false);

  // ── Depoimentos da comunidade ─────────────────────────────────────────────
  const [communityReviews, setCommunityReviews]       = useState<any[]>([]);
  const [reviewFormOpen, setReviewFormOpen]           = useState(false);
  const [reviewName, setReviewName]                   = useState('');
  const [reviewRole, setReviewRole]                   = useState('');
  const [reviewCity, setReviewCity]                   = useState('');
  const [reviewStars, setReviewStars]                 = useState(5);
  const [reviewText, setReviewText]                   = useState('');
  const [reviewLoading, setReviewLoading]             = useState(false);
  const [reviewSent, setReviewSent]                   = useState(false);
  const [reviewError, setReviewError]                 = useState('');
  // Admin: aba depoimentos
  const [pendingReviews, setPendingReviews]           = useState<any[]>([]);
  const [pendingReviewsLoading, setPendingReviewsLoading] = useState(false);
  const [ownerSecret, setOwnerSecret]               = useState('');
  const [ownerLoading, setOwnerLoading]             = useState(false);
  const [ownerError, setOwnerError]                 = useState('');
  const [ownerAuthenticated, setOwnerAuthenticated] = useState(false);
  const [ownerTab, setOwnerTab]                     = useState<'acesso' | 'bloqueados' | 'clientes' | 'depoimentos'>('acesso');
  const ownerLongPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // VIP management state
  const [vipBlockList, setVipBlockList]             = useState<any[]>([]);
  const [vipBlockLoading, setVipBlockLoading]       = useState(false);
  const [vipUid, setVipUid]                         = useState('');
  const [vipEmail, setVipEmail]                     = useState('');
  const [vipReason, setVipReason]                   = useState('');
  const [vipActionLoading, setVipActionLoading]     = useState<string | null>(null);
  // Clients tab
  const [clientsList, setClientsList]               = useState<any[]>([]);
  const [clientsLoading, setClientsLoading]         = useState(false);
  const [clientsStats, setClientsStats]             = useState<any>(null);
  const [clientsFilter, setClientsFilter]           = useState<'todos'|'vip'|'expirado'|'free'>('todos');
  const [clientsSearch, setClientsSearch]           = useState('');
  const [editingClientUid, setEditingClientUid]     = useState<string | null>(null);
  const [editPlanValue, setEditPlanValue]           = useState<string>('free');
  const [editPlanLoading, setEditPlanLoading]       = useState(false);
  // Clients list tab
  const [clientList, setClientList]                 = useState<any[]>([]);
  const [clientStats, setClientStats]               = useState<any>(null);
  const [clientLoading, setClientLoading]           = useState(false);
  const [clientSearch, setClientSearch]             = useState('');
  const [clientFilter, setClientFilter]             = useState<'all' | 'vip' | 'expired' | 'blocked' | 'free'>('all');

  // Atalho de teclado para o painel admin
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        setOwnerSecret('');
        setOwnerError('');
        setIsOwnerModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Toque longo no logo (mobile): segure 2s para abrir o painel do dono
  const logoTouchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTouchStart = () => {
    logoTouchTimer.current = setTimeout(() => {
      setIsOwnerModalOpen(true);
    }, 2000);
  };

  const handleLogoTouchEnd = () => {
    if (logoTouchTimer.current) {
      clearTimeout(logoTouchTimer.current);
      logoTouchTimer.current = null;
    }
  };

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

  const navigateTo = useCallback((path: string, viewState: typeof view) => {
    window.history.pushState({}, '', path);
    setView(viewState);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.data) setHistoryDirect({ past: [], present: { ...INITIAL_RESUME_DATA, ...parsed.data, projects: parsed.data.projects || [] }, future: [] });
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
    } else if (path === '/premium-success' || path === '/premium-failure' || path === '/premium-pending') {
      // MP redirects — clear path and show home (usePremium hook handles the verification)
      window.history.replaceState({}, '', '/');
      setView('home');
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
      // MP back_urls redirect to these paths — always bring back to home
      else if (p === '/premium-success' || p === '/premium-failure' || p === '/premium-pending') {
        window.history.replaceState({}, '', '/');
        setView('home');
      }
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

  // ── Auto-save local robusto ─────────────────────────────────────────
  // Salva a cada 1.5s após última mudança, com indicador visual
  useEffect(() => {
    if (view !== 'editor') return;
    setAutoSaveStatus('saving');
    const handler = setTimeout(() => {
      const stateToSave = { data, template, fontSize, fontFamily, isDarkMode };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      setAutoSaveStatus('saved');
      // Reset para 'idle' após 2s
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    }, 1500);
    return () => clearTimeout(handler);
  }, [data, template, fontSize, fontFamily, view, isDarkMode]);

  // Salva IMEDIATAMENTE ao fechar/recarregar a aba — nunca perde dados
  useEffect(() => {
    const saveNow = () => {
      const stateToSave = { data, template, fontSize, fontFamily, isDarkMode };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };
    window.addEventListener('beforeunload', saveNow);
    window.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', saveNow);
      window.removeEventListener('visibilitychange', onVisibility);
    };
  }, [data, template, fontSize, fontFamily, isDarkMode]);


  // Helper: extrai mensagem útil de erros da API Gemini
  const getAIErrorMessage = (err: any): string => {
    const msg = err?.message || '';
    if (msg.includes('VITE_GEMINI_API_KEY') || msg.includes('Chave da API')) {
      return '❌ Chave da API Gemini não configurada. Configure VITE_GEMINI_API_KEY no Vercel.';
    }
    if (err?.status === 400 || err?.status === 401 || err?.status === 403 || msg.includes('API_KEY') || msg.includes('API key')) {
      return '❌ Chave da API Gemini inválida ou sem permissão. Verifique em aistudio.google.com/app/apikey';
    }
    if (err?.status === 429) {
      return '⚠️ Limite da API Gemini atingido. Aguarde alguns segundos e tente novamente.';
    }
    return 'Erro ao processar com IA. Tente novamente.';
  };
  const showToast = (message: string, type: 'error' | 'success' = 'success') => {
    setToast({ message, type });
  };

  // ── Cloud Save handlers ─────────────────────────────────────────────
  const handleOpenSaveModal = () => {
    if (!user) { setIsAuthModalOpen(true); return; }
    setIsSaveModalOpen(true);
  };

  const handleCloudSave = async (name: string) => {
    const result = await saveResume({
      resumeId:   currentCloudId ?? undefined,
      name,
      data,
      template,
      fontSize,
      fontFamily,
    });
    if (result.ok) {
      setCurrentCloudId(result.resumeId!);
      setCurrentCloudName(name);
      setIsSaveModalOpen(false);
      showToast(`☁️ "${name}" salvo na nuvem!`, 'success');
    } else {
      showToast(result.error || 'Erro ao salvar na nuvem. Tente novamente.', 'error');
    }
  };

  const handleOpenCloudResumes = async () => {
    if (!user) { setIsAuthModalOpen(true); return; }
    setIsCloudResumesOpen(true);
    await listResumes();
  };

  const handleLoadCloudResume = (resume: typeof cloudResumes[0]) => {
    setHistoryDirect({ past: [], present: { ...INITIAL_RESUME_DATA, ...resume.data, projects: resume.data.projects || [] }, future: [] });
    setTemplate(resume.template);
    setFontSize(resume.fontSize);
    setFontFamily(resume.fontFamily);
    setCurrentCloudId(resume.id);
    setCurrentCloudName(resume.name);
    setIsCloudResumesOpen(false); // FIX: fecha o modal após carregar
    navigateTo('/', 'editor');
    showToast(`📂 "${resume.name}" carregado!`, 'success');
  };

  const handleOwnerUnlock = async () => {
    setOwnerLoading(true);
    setOwnerError('');
    const result = await ownerUnlock(ownerSecret);
    setOwnerLoading(false);
    if (result.ok) {
      setOwnerAuthenticated(true);
      setOwnerTab('acesso');
      showToast('👑 Acesso de dono ativado! Todos os templates desbloqueados.', 'success');
    } else {
      setOwnerError(result.error || 'Erro desconhecido.');
    }
  };

  // ── Clients Management ──────────────────────────────────────────────
  const handleLoadClients = async () => {
    setClientsLoading(true);
    try {
      const res = await fetch('/api/admin-clients', {
        headers: { 'Authorization': `Bearer ${ownerSecret}` },
      });
      if (!res.ok) throw new Error('Erro ao carregar clientes.');
      const data = await res.json();
      setClientsList(data.clients || []);
      setClientsStats(data.stats || null);
    } catch (e: any) {
      showToast(e.message || 'Erro ao carregar clientes.', 'error');
    } finally {
      setClientsLoading(false);
    }
  };

  // ── Set Client Plan ────────────────────────────────────────────────
  const handleSetClientPlan = async (uid: string) => {
    setEditPlanLoading(true);
    try {
      const res = await fetch('/api/admin-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerSecret}` },
        body: JSON.stringify({ action: 'set-plan', uid, plan: editPlanValue }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || '✅ Plano atualizado!', 'success');
        setEditingClientUid(null);
        await handleLoadClients();
      } else {
        showToast(data.error || 'Erro ao atualizar plano.', 'error');
      }
    } catch {
      showToast('Erro de conexão.', 'error');
    } finally {
      setEditPlanLoading(false);
    }
  };

  // ── VIP Management ─────────────────────────────────────────────────
  const handleLoadVipList = async () => {
    setVipBlockLoading(true);
    try {
      const res = await fetch('/api/admin-vip', {
        headers: { 'Authorization': `Bearer ${ownerSecret}` },
      });
      if (!res.ok) throw new Error('Falha ao carregar lista.');
      const data = await res.json();
      setVipBlockList(data.blocked || []);
    } catch (e: any) {
      showToast(e.message || 'Erro ao carregar lista de bloqueados.', 'error');
    } finally {
      setVipBlockLoading(false);
    }
  };

  const handleVipBlock = async () => {
    if (!vipUid.trim()) { showToast('UID é obrigatório.', 'error'); return; }
    setVipActionLoading('block-new');
    try {
      const res = await fetch('/api/admin-vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerSecret}` },
        body: JSON.stringify({ action: 'block', uid: vipUid.trim(), email: vipEmail.trim(), reason: vipReason.trim() || 'Pagamento não realizado' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`🔒 VIP bloqueado com sucesso.`, 'success');
        setVipUid(''); setVipEmail(''); setVipReason('');
        await handleLoadVipList();
      } else {
        showToast(data.error || 'Erro ao bloquear.', 'error');
      }
    } catch {
      showToast('Erro de conexão ao bloquear.', 'error');
    } finally {
      setVipActionLoading(null);
    }
  };

  const handleVipUnblock = async (uid: string, email: string) => {
    setVipActionLoading(uid);
    try {
      const res = await fetch('/api/admin-vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerSecret}` },
        body: JSON.stringify({ action: 'unblock', uid }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ VIP de ${email || uid} liberado.`, 'success');
        await handleLoadVipList();
      } else {
        showToast(data.error || 'Erro ao desbloquear.', 'error');
      }
    } catch {
      showToast('Erro de conexão ao desbloquear.', 'error');
    } finally {
      setVipActionLoading(null);
    }
  };

  const handleExportDocx = async () => {
    try {
      await exportToDocx(data);
      showToast('✅ Arquivo Word gerado com sucesso!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Erro ao gerar o arquivo Word.', 'error');
    }
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

      // Remove scale transform from clone so it renders at full A4 size
      clone.style.transform = 'none';
      clone.style.transformOrigin = 'top left';
      clone.style.width = '794px';
      clone.style.height = '1123px';
      clone.style.position = 'relative';
      clone.style.boxShadow = 'none';
      clone.style.overflow = 'hidden';

      // Also remove any scale from all children
      clone.querySelectorAll('[style*="scale"]').forEach((el) => {
        const style = (el as HTMLElement).style;
        style.transform = style.transform.replace(/scale\([^)]+\)/, '');
      });

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Currículo — ${(data.personalInfo.fullName || 'CurriculoGO').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</title>
  ${styles}
  <style>
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: white; width: 210mm; }
    body { display: block; }
    #print-root {
      width: 210mm;
      min-height: 297mm;
      overflow: hidden;
      position: relative;
      box-shadow: none !important;
      font-size: ${fontSize}px;
    }
    /* Remove interactive styles */
    .no-print { display: none !important; }
    [class*="hover\\:"] { all: revert; }
    @page { size: A4 portrait; margin: 0; }
    @media print {
      html, body { width: 210mm; height: 297mm; }
      #print-root { box-shadow: none !important; }
    }
  </style>
</head>
<body>
  <div id="print-root">${clone.outerHTML}</div>
  <script>
    // Remove scale transforms applied for preview
    document.querySelectorAll('[style]').forEach(function(el) {
      el.style.transform = '';
      el.style.transformOrigin = '';
    });
    // Wait for fonts and images
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 1500);
      }, 1000);
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
        setCurrentCloudId(null);       // FIX: reseta ID do currículo na nuvem
        setCurrentCloudName('');       // FIX: reseta nome do currículo na nuvem
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
      // Limita o texto a 15.000 caracteres para evitar estourar a cota da API Gemini
      const limitedText = importText.trim().slice(0, 15000);
      const parsedData = await parseResumeWithAI(limitedText);
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

  const addItem = (listName: 'experiences' | 'education' | 'languages' | 'courses' | 'projects') => {
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
    } else if (listName === 'projects') {
      const newItem: Project = { id, name: '', description: '', url: '', technologies: '' };
      updateData(prev => ({ ...prev, projects: [newItem, ...(prev.projects || [])] }));
    }
  };

  const removeItem = (listName: 'experiences' | 'education' | 'languages' | 'courses' | 'projects', id: string) => {
    updateData(prev => ({
      ...prev,
      [listName]: (prev[listName] as any[]).filter(item => item.id !== id)
    }));
  };

  const updateItem = <T extends 'experiences' | 'education' | 'languages' | 'courses' | 'projects'>(
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
    } catch (err: any) {
      console.error(err);
      showToast(getAIErrorMessage(err), "error");
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
    } catch (err: any) {
      console.error(err);
      showToast(getAIErrorMessage(err), "error");
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
    } catch (err: any) {
      console.error(err);
      showToast(getAIErrorMessage(err), "error");
    } finally {
      setIsEnhancing(null);
    }
  };

  const handleSectionClick = useCallback((sectionId: string) => {
    // Map section IDs to step IDs (some differ)
    const sectionToStep: Record<string, string> = {
      'extras': 'certifications',
      'projects': 'projects',
    };
    const stepId = sectionToStep[sectionId] || sectionId;
    const stepIdx = STEPS.findIndex(s => s.id === stepId);
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
    const containerWidth = previewContainerRef.current.clientWidth;
    const scaleByHeight = (containerHeight - 80) / 1123;
    const scaleByWidth = (containerWidth - 48) / 794;
    const scale = Math.min(scaleByHeight, scaleByWidth);
    setPreviewScale(Math.min(0.95, Math.max(0.35, scale)));
  }, []);

  // Recalcula o fit quando muda de view ou a sidebar abre/fecha (com delay p/ aguardar o CSS transition)
  useEffect(() => {
    if (view !== 'editor') return;
    const timer = setTimeout(fitToScreen, 350);
    return () => clearTimeout(timer);
  }, [view, isSidebarOpen, fitToScreen]);

  // Ouve resize da janela — separado do sidebar para não perder eventos durante transições
  useEffect(() => {
    if (view !== 'editor') return;
    window.addEventListener('resize', fitToScreen);
    return () => window.removeEventListener('resize', fitToScreen);
  }, [view, fitToScreen]);

  const handleTemplateSelect = (selectedTemplate: TemplateId) => {
    // Verifica se é template premium e usuário não tem acesso
    const isPremiumTemplate = PREMIUM_TEMPLATES_LIST.some(t => t.id === selectedTemplate);
    if (isPremiumTemplate && !isPremium) {
      const tpl = PREMIUM_TEMPLATES_LIST.find(t => t.id === selectedTemplate);
      setPremiumModalTemplate(tpl?.label || selectedTemplate);
      setIsPremiumModalOpen(true);
      return;
    }
    // Apenas troca o template visual — os dados preenchidos são preservados
    setTemplate(selectedTemplate);
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

  const globalOverlays = (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <CookieConsent />
      {isATSPanelOpen && <Suspense fallback={null}><ATSPanel data={data} onClose={() => setIsATSPanelOpen(false)} /></Suspense>}

      {/* Modal Login Google */}
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            onClose={() => setIsAuthModalOpen(false)}
            onSignIn={async () => {
              const result = await signInWithGoogle();
              if (result.ok) showToast(`✅ Bem-vindo! Seus dados estão seguros.`, 'success');
              return result;
            }}
          />
        </Suspense>
      )}

      {/* Modal Salvar na nuvem */}
      {isSaveModalOpen && (
        <Suspense fallback={null}>
          <SaveModal
            defaultName={currentCloudName || (data.personalInfo?.fullName ? `Currículo de ${data.personalInfo.fullName.split(' ')[0]}` : 'Meu Currículo')}
            saving={cloudSaving}
            isUpdate={!!currentCloudId}
            onSave={handleCloudSave}
            onClose={() => setIsSaveModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Modal Meus Currículos na Nuvem */}
      {isCloudResumesOpen && user && (
        <Suspense fallback={null}>
          <CloudResumesModal
            user={user}
            resumes={cloudResumes}
            loading={cloudLoading}
            currentResumeId={currentCloudId}
            onLoad={handleLoadCloudResume}
            onDelete={deleteResume}
            onSignOut={async () => { await signOut(); setIsCloudResumesOpen(false); showToast('Você saiu da conta.', 'success'); }}
            onClose={() => setIsCloudResumesOpen(false)}
          />
        </Suspense>
      )}

      {/* ── Painel Admin ── */}
      {isOwnerModalOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setIsOwnerModalOpen(false); setOwnerAuthenticated(false); } }}
        >
          <div className={`bg-slate-900 w-full rounded-2xl shadow-2xl border border-slate-700 p-6 animate-in zoom-in-95 duration-200 transition-all ${ownerAuthenticated ? 'max-w-xl' : 'max-w-sm'}`}>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <i className="fas fa-crown text-amber-400 text-sm"></i>
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Painel do Dono</h3>
                <p className="text-[10px] text-slate-500">CurriculoGO · Admin</p>
              </div>
              <button onClick={() => { setIsOwnerModalOpen(false); setOwnerAuthenticated(false); }} className="ml-auto text-slate-600 hover:text-slate-300 transition-colors">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            {/* ── Tela de senha (não autenticado) ── */}
            {!ownerAuthenticated && (
              <>
                <div className="relative mb-4">
                  <input
                    type="password"
                    autoFocus
                    value={ownerSecret}
                    onChange={e => { setOwnerSecret(e.target.value); setOwnerError(''); }}
                    onKeyDown={e => e.key === 'Enter' && !ownerLoading && handleOwnerUnlock()}
                    placeholder="Senha secreta..."
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all"
                  />
                  {ownerError && (
                    <p className="text-[10px] text-red-400 font-bold mt-2 flex items-center gap-1">
                      <i className="fas fa-exclamation-circle"></i> {ownerError}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleOwnerUnlock}
                  disabled={ownerLoading || !ownerSecret.trim()}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  {ownerLoading
                    ? <><i className="fas fa-circle-notch fa-spin"></i> Verificando...</>
                    : <><i className="fas fa-unlock-alt"></i> Entrar no Painel</>
                  }
                </button>

              </>
            )}

            {/* ── Painel completo (autenticado) ── */}
            {ownerAuthenticated && (
              <>
                {/* Tabs */}
                <div className="flex gap-1 bg-slate-800 rounded-xl p-1 mb-5">
                  {([
                    { id: 'acesso',      icon: 'fa-unlock-alt', label: 'Acesso',      onClick: () => setOwnerTab('acesso') },
                    { id: 'bloqueados',  icon: 'fa-ban',        label: 'Bloqueados',  onClick: () => { setOwnerTab('bloqueados'); handleLoadVipList(); } },
                    { id: 'clientes',    icon: 'fa-users',      label: 'Clientes',    onClick: () => { setOwnerTab('clientes'); handleLoadClients(); } },
                    { id: 'depoimentos', icon: 'fa-star',       label: 'Reviews',     onClick: () => { setOwnerTab('depoimentos'); handleLoadPendingReviews(); } },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      onClick={tab.onClick}
                      title={tab.label}
                      className={`flex-1 py-2 rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 ${ownerTab === tab.id ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                      <i className={`fas ${tab.icon} text-xs`}></i>
                      <span className="text-[8px] font-black uppercase tracking-widest leading-none hidden sm:block">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* ── Tab: Acesso ── */}
                {ownerTab === 'acesso' && (
                  <div className="space-y-3">

                    {/* Toggle de acesso de dono */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-black text-white">Acesso de Dono</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Desbloqueia todos os 15 templates</p>
                        </div>
                        {/* Toggle switch */}
                        <button
                          onClick={toggleOwnerAccess}
                          className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none ${isOwnerAccessActive ? 'bg-amber-500' : 'bg-slate-600'}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${isOwnerAccessActive ? 'left-6' : 'left-0.5'}`} />
                        </button>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-black transition-all ${isOwnerAccessActive ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700/50 text-slate-500'}`}>
                        <i className={`fas ${isOwnerAccessActive ? 'fa-crown' : 'fa-lock'} text-[10px]`}></i>
                        {isOwnerAccessActive ? 'Ativo — todos os templates liberados' : 'Inativo — templates bloqueados normalmente'}
                      </div>
                    </div>

                    <button
                      onClick={() => { setOwnerAuthenticated(false); setOwnerSecret(''); setOwnerTab('acesso'); }}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-sign-out-alt text-xs"></i> Sair do painel
                    </button>
                    
                  </div>
                )}

                {/* ── Tab: Bloqueados ── */}
                {ownerTab === 'bloqueados' && (
                  <div className="space-y-4">

                    {/* Formulário de bloqueio */}
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <i className="fas fa-user-slash text-red-400"></i> Bloquear acesso VIP
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={vipUid}
                          onChange={e => setVipUid(e.target.value)}
                          placeholder="UID Firebase *"
                          className="col-span-2 w-full bg-slate-900 border border-slate-700 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
                        />
                        <input
                          value={vipEmail}
                          onChange={e => setVipEmail(e.target.value)}
                          placeholder="E-mail (opcional)"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
                        />
                        <input
                          value={vipReason}
                          onChange={e => setVipReason(e.target.value)}
                          placeholder="Motivo (ex: Chargeback)"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
                        />
                      </div>
                      <p className="text-[9px] text-slate-600">* O UID aparece no Firebase Console → Authentication → Users</p>
                      <button
                        onClick={handleVipBlock}
                        disabled={!vipUid.trim() || vipActionLoading !== null}
                        className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        {vipActionLoading === 'block-new'
                          ? <><i className="fas fa-circle-notch fa-spin"></i> Bloqueando...</>
                          : <><i className="fas fa-lock"></i> Bloquear VIP</>
                        }
                      </button>
                    </div>

                    {/* Lista de bloqueados */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <i className="fas fa-ban text-red-500"></i>
                          Bloqueados ({vipBlockList.length})
                        </h4>
                        <button
                          onClick={handleLoadVipList}
                          disabled={vipBlockLoading}
                          className="text-[9px] text-slate-500 hover:text-amber-400 transition-colors uppercase tracking-widest flex items-center gap-1"
                        >
                          <i className={`fas ${vipBlockLoading ? 'fa-circle-notch fa-spin' : 'fa-sync-alt'} text-[8px]`}></i>
                          Atualizar
                        </button>
                      </div>

                      {vipBlockLoading ? (
                        <div className="text-center py-8">
                          <i className="fas fa-circle-notch fa-spin text-slate-500 text-lg"></i>
                          <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest">Carregando...</p>
                        </div>
                      ) : vipBlockList.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl">
                          <i className="fas fa-check-circle text-green-500 text-2xl mb-2 block"></i>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Nenhum cliente bloqueado</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                          {vipBlockList.map((u: any) => (
                            <div key={u.uid} className="flex items-center gap-3 bg-slate-800 rounded-xl p-3 border border-slate-700 hover:border-slate-600 transition-colors">
                              <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                                <i className="fas fa-user-slash text-red-400 text-xs"></i>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-white truncate">{u.email || '—'}</p>
                                <p className="text-[9px] text-slate-500 truncate mt-0.5">
                                  {u.reason} · {u.blockedAt ? new Date(u.blockedAt).toLocaleDateString('pt-BR') : ''}
                                </p>
                                <p className="text-[8px] text-slate-700 truncate font-mono mt-0.5">{u.uid}</p>
                              </div>
                              <button
                                onClick={() => handleVipUnblock(u.uid, u.email)}
                                disabled={vipActionLoading === u.uid}
                                className="shrink-0 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                title="Liberar acesso VIP"
                              >
                                {vipActionLoading === u.uid
                                  ? <i className="fas fa-circle-notch fa-spin text-[8px]"></i>
                                  : <i className="fas fa-unlock text-[8px]"></i>
                                }
                                Liberar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

                {/* ── Tab: Clientes ── */}
                {ownerTab === 'clientes' && (
                  <div className="space-y-4">

                    {/* Stats cards */}
                    {clientsStats && (
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'Total',     value: clientsStats.total,    color: 'text-slate-300',  bg: 'bg-slate-800'         },
                          { label: 'VIP Ativo', value: clientsStats.vip,      color: 'text-green-400',  bg: 'bg-green-900/30'      },
                          { label: 'Expirado',  value: clientsStats.expired,  color: 'text-amber-400',  bg: 'bg-amber-900/30'      },
                          { label: 'Free',      value: clientsStats.free,     color: 'text-slate-500',  bg: 'bg-slate-800'         },
                        ].map(s => (
                          <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center border border-slate-700`}>
                            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                            <p className="text-[9px] text-slate-600 uppercase tracking-widest mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {clientsStats && clientsStats.vip > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'Vitalício', value: clientsStats.lifetime, color: 'text-amber-400',  bg: 'bg-amber-900/20'  },
                          { label: 'Anual',     value: clientsStats.yearly,   color: 'text-blue-400',   bg: 'bg-blue-900/20'   },
                          { label: 'Mensal',    value: clientsStats.monthly,  color: 'text-violet-400', bg: 'bg-violet-900/20' },
                          { label: '7 Dias',    value: clientsStats.avulso,   color: 'text-cyan-400',   bg: 'bg-cyan-900/20'   },
                        ].map(s => (
                          <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center border border-slate-700`}>
                            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                            <p className="text-[9px] text-slate-600 uppercase tracking-widest mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Search + filter */}
                    <div className="flex gap-2">
                      <input
                        value={clientsSearch}
                        onChange={e => setClientsSearch(e.target.value)}
                        placeholder="Buscar por nome ou e-mail..."
                        className="flex-1 bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
                      />
                      <button
                        onClick={handleLoadClients}
                        disabled={clientsLoading}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
                        title="Atualizar"
                      >
                        <i className={`fas ${clientsLoading ? 'fa-circle-notch fa-spin' : 'fa-sync-alt'} text-xs`}></i>
                      </button>
                    </div>

                    {/* Filter pills */}
                    <div className="flex gap-1.5 flex-wrap">
                      {([
                        { id: 'todos',     label: 'Todos'      },
                        { id: 'vip',       label: '✅ VIP Ativo' },
                        { id: 'expirado',  label: '⏰ Expirado' },
                        { id: 'free',      label: '🆓 Free'    },
                      ] as const).map(f => (
                        <button
                          key={f.id}
                          onClick={() => setClientsFilter(f.id)}
                          className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${clientsFilter === f.id ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-500 hover:text-white border border-slate-700'}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Lista */}
                    {clientsLoading ? (
                      <div className="text-center py-10">
                        <i className="fas fa-circle-notch fa-spin text-slate-500 text-xl"></i>
                        <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest">Carregando clientes...</p>
                      </div>
                    ) : (() => {
                      const search = clientsSearch.toLowerCase();
                      const filtered = clientsList.filter(c => {
                        const matchSearch = !search ||
                          (c.email       ?? '').toLowerCase().includes(search) ||
                          (c.displayName ?? '').toLowerCase().includes(search);
                        const matchFilter =
                          clientsFilter === 'todos'    ? true :
                          clientsFilter === 'vip'      ? (c.isVip && !c.isExpired) :
                          clientsFilter === 'expirado' ? (c.isExpired && !c.isVip) :
                          clientsFilter === 'free'     ? (!c.plan) : true;
                        return matchSearch && matchFilter;
                      });

                      const planLabel = (c: any) => {
                        if (!c.plan) return { text: 'Free', color: 'text-slate-500', bg: 'bg-slate-800', icon: '🆓' };
                        if (c.isExpired) return { text: 'Expirado', color: 'text-amber-400', bg: 'bg-amber-900/30', icon: '⏰' };
                        if (c.plan === 'lifetime') return { text: 'Vitalício', color: 'text-amber-400', bg: 'bg-amber-900/30', icon: '👑' };
                        if (c.plan === 'yearly')   return { text: 'Anual', color: 'text-blue-400', bg: 'bg-blue-900/30', icon: '📅' };
                        if (c.plan === 'monthly')  return { text: 'Mensal', color: 'text-violet-400', bg: 'bg-violet-900/30', icon: '🗓️' };
                        return { text: '7 Dias', color: 'text-cyan-400', bg: 'bg-cyan-900/30', icon: '⚡' };
                      };

                      if (filtered.length === 0) return (
                        <div className="text-center py-10 border-2 border-dashed border-slate-700 rounded-xl">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Nenhum cliente encontrado</p>
                        </div>
                      );

                      return (
                        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                          {filtered.map((cl: any) => {
                            const pl = planLabel(cl);
                            const isEditing = editingClientUid === cl.uid;
                            return (
                              <div key={cl.uid} className="bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors overflow-hidden">
                                {/* Main row */}
                                <div className="flex items-center gap-3 p-3">
                                  {/* Avatar */}
                                  {cl.photoURL
                                    ? <img src={cl.photoURL} alt="" className="w-9 h-9 rounded-full shrink-0 object-cover" />
                                    : <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center shrink-0 text-slate-400 text-sm font-black">
                                        {(cl.displayName || cl.email || '?')[0].toUpperCase()}
                                      </div>
                                  }
                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-white truncate">{cl.displayName || '—'}</p>
                                    <p className="text-[9px] text-slate-500 truncate">{cl.email || cl.uid}</p>
                                    {cl.expiresAt && cl.isVip && (
                                      <p className="text-[8px] text-slate-600 mt-0.5">Expira {new Date(cl.expiresAt).toLocaleDateString('pt-BR')}</p>
                                    )}
                                  </div>
                                  {/* Plan badge */}
                                  <div className={`shrink-0 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${pl.bg} ${pl.color} border border-slate-700`}>
                                    {pl.icon} {pl.text}
                                  </div>
                                  {/* Edit button */}
                                  <button
                                    onClick={() => {
                                      if (isEditing) { setEditingClientUid(null); return; }
                                      setEditingClientUid(cl.uid);
                                      setEditPlanValue(cl.plan || 'free');
                                    }}
                                    className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isEditing ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-400 hover:text-amber-400 hover:bg-slate-600'}`}
                                    title="Editar plano"
                                  >
                                    <i className={`fas ${isEditing ? 'fa-times' : 'fa-pen'} text-[10px]`}></i>
                                  </button>
                                </div>

                                {/* Inline edit panel */}
                                {isEditing && (
                                  <div className="px-3 pb-3 border-t border-slate-700 pt-3">
                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-2 font-black">Alterar plano</p>
                                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                                      {([
                                        { value: 'free',     label: '🆓 Free',      color: 'border-slate-600 text-slate-400' },
                                        { value: 'avulso',   label: '⚡ 7 Dias',    color: 'border-cyan-600 text-cyan-400'   },
                                        { value: 'monthly',  label: '🗓️ Mensal',   color: 'border-violet-600 text-violet-400'},
                                        { value: 'yearly',   label: '📅 Anual',     color: 'border-blue-600 text-blue-400'   },
                                        { value: 'lifetime', label: '👑 Vitalício', color: 'border-amber-500 text-amber-400' },
                                      ]).map(opt => (
                                        <button
                                          key={opt.value}
                                          onClick={() => setEditPlanValue(opt.value)}
                                          className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${editPlanValue === opt.value ? 'bg-amber-500 border-amber-500 text-black' : `bg-slate-900 ${opt.color} hover:brightness-125`}`}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      onClick={() => handleSetClientPlan(cl.uid)}
                                      disabled={editPlanLoading}
                                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                    >
                                      {editPlanLoading
                                        ? <><i className="fas fa-circle-notch fa-spin"></i> Salvando...</>
                                        : <><i className="fas fa-save"></i> Salvar alteração</>
                                      }
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── Tab: Depoimentos ── */}
                {ownerTab === 'depoimentos' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Aguardando aprovação</p>
                      <button
                        onClick={handleLoadPendingReviews}
                        disabled={pendingReviewsLoading}
                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-amber-400 transition-colors text-xs"
                        title="Atualizar"
                      >
                        <i className={`fas ${pendingReviewsLoading ? 'fa-circle-notch fa-spin' : 'fa-sync-alt'}`}></i>
                      </button>
                    </div>

                    {pendingReviewsLoading ? (
                      <div className="text-center py-10">
                        <i className="fas fa-circle-notch fa-spin text-slate-500 text-xl"></i>
                        <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest">Carregando...</p>
                      </div>
                    ) : pendingReviews.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-slate-700 rounded-xl">
                        <i className="fas fa-star text-slate-700 text-2xl mb-3"></i>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Nenhum depoimento pendente</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                        {pendingReviews.map((r: any) => (
                          <div key={r.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${r.color || 'from-blue-500 to-cyan-600'} flex items-center justify-center text-white font-black text-xs shrink-0`}>
                                  {r.avatar || r.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-white">{r.name}</p>
                                  <p className="text-[9px] text-slate-500">{[r.role, r.city].filter(Boolean).join(' · ')}</p>
                                </div>
                              </div>
                              <div className="flex gap-0.5 shrink-0">
                                {[...Array(r.stars || 5)].map((_: any, j: number) => (
                                  <i key={j} className="fas fa-star text-amber-400 text-[9px]"></i>
                                ))}
                              </div>
                            </div>
                            {/* Texto */}
                            <p className="text-xs text-slate-400 leading-relaxed mb-3 italic">"{r.text}"</p>
                            {/* Data */}
                            <p className="text-[9px] text-slate-600 mb-3">
                              Enviado em {new Date(r.createdAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })}
                            </p>
                            {/* Ações */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReviewAction(r.id, 'approve')}
                                className="flex-1 py-2 bg-green-900/40 hover:bg-green-800/60 border border-green-700 text-green-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 active:scale-95"
                              >
                                <i className="fas fa-check"></i> Aprovar
                              </button>
                              <button
                                onClick={() => handleReviewAction(r.id, 'delete')}
                                className="flex-1 py-2 bg-red-900/40 hover:bg-red-800/60 border border-red-700 text-red-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 active:scale-95"
                              >
                                <i className="fas fa-trash"></i> Rejeitar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
          </div>
        </div>
      )}

      {/* Banner de verificação de pagamento */}
      {isVerifying && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 text-sm font-black animate-in slide-in-from-top-4 duration-300">
          <i className="fas fa-circle-notch fa-spin"></i>
          Verificando seu pagamento...
        </div>
      )}

      {/* Modal Premium */}
      {isPremiumModalOpen && (
        <Suspense fallback={null}>
          <PremiumModal
            templateLabel={premiumModalTemplate}
            onClose={() => setIsPremiumModalOpen(false)}
            isExpired={premiumExpired}
            daysLeft={daysLeft}
            uid={user?.uid ?? null}
            onUnlocked={(plan) => {
              setIsPremiumModalOpen(false);
              const msg = plan === 'lifetime'
                ? '👑 Premium Vitalício ativado! Todos os templates desbloqueados para sempre!'
                : '⚡ 7 dias Premium ativados! Todos os templates desbloqueados!';
              showToast(msg, 'success');
              window.dispatchEvent(new Event('storage'));
              // Sincroniza novo status VIP com o servidor para aparecer no painel do dono
              if (user?.uid) {
                syncClientToServer({ uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL });
              }
            }}
          />
        </Suspense>
      )}

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
              <button onClick={() => setIsImportModalOpen(false)} className="flex-1 py-4 font-bold text-slate-500 uppercase text-sm tracking-wide">Cancelar</button>
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
      <LegalPageLayout title="Política de Privacidade" onHome={() => navigateTo('/', 'home')}>
        {globalOverlays}
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
            <p className="text-xs text-slate-400">Última atualização: 25 de fevereiro de 2026</p>
            <p>A sua privacidade é importante para nós. Esta Política descreve como o <strong>CurriculoGO</strong> coleta, usa e protege suas informações, em conformidade com a <strong>Lei Geral de Proteção de Dados — LGPD (Lei nº 13.709/2018)</strong>.</p>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">1. Dados que Você Fornece</h3>
                <p>Os dados pessoais inseridos nos formulários (nome, e-mail, telefone, histórico profissional, etc.) são processados <strong>exclusivamente no seu navegador</strong>. São salvos no <code>localStorage</code> do seu dispositivo e <strong>não são transmitidos nem armazenados em servidores</strong> do CurriculoGO.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2. Inteligência Artificial (Google Gemini)</h3>
                <p>Ao utilizar os recursos de IA (sugestão de resumo, aprimoramento de texto), trechos do seu currículo são enviados à <strong>API do Google Gemini</strong> para processamento. Esses dados são regidos pela <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Política de Privacidade do Google</a>. O uso é sempre opcional.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">3. Cookies e Publicidade (Google AdSense)</h3>
                <p>O CurriculoGO utiliza o <strong>Google AdSense</strong> para exibir anúncios, mantendo o serviço gratuito. O Google usa cookies (incluindo o cookie <strong>DART</strong>) para veicular anúncios personalizados com base nas suas visitas a este e outros sites. Você pode gerenciar suas preferências de anúncios em <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">google.com/settings/ads</a>.</p>
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
                <p>Dúvidas? Entre em contato: <a href="mailto:contato@curriculogo.com.br" className="text-blue-600 hover:underline">contato@curriculogo.com.br</a></p>
            </section>
        </div>
      </LegalPageLayout>
    );
  }

  if (view === 'terms') {
    return (
      <LegalPageLayout title="Termos e Condições" onHome={() => navigateTo('/', 'home')}>
        {globalOverlays}
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
            <p className="text-xs text-slate-400">Última atualização: 25 de fevereiro de 2026</p>
            <p>Ao acessar e usar o <strong>CurriculoGO</strong>, você concorda com os seguintes Termos de Uso. Leia atentamente antes de utilizar nossos serviços.</p>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">1. Uso do Serviço</h3>
                <p>O CurriculoGO é um serviço com plano gratuito e recursos premium para criação de currículos profissionais. Você pode usá-lo para fins pessoais e profissionais legítimos. É proibido usar o serviço para fins ilegais ou que violem direitos de terceiros.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2. Responsabilidade pelo Conteúdo</h3>
                <p>Você é o único responsável pelo conteúdo inserido no seu currículo. O CurriculoGO não verifica a veracidade das informações fornecidas. Ao usar nossa plataforma, você declara que as informações são verdadeiras e de sua autoria.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">3. Propriedade Intelectual</h3>
                <p>Os templates, designs e código-fonte do CurriculoGO são propriedade intelectual de seus desenvolvedores. Os currículos gerados por você pertencem a você. Não é permitido copiar ou redistribuir os templates em outros produtos sem autorização expressa.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">4. Inteligência Artificial</h3>
                <p>As sugestões geradas por IA (Google Gemini) são apenas para fins de assistência. O usuário é totalmente responsável por revisar e validar todas as informações antes de utilizar o currículo gerado.</p>
            </section>
            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">5. Publicidade</h3>
                <p>O CurriculoGO exibe anúncios do Google AdSense para se manter gratuito. Os anúncios são gerenciados pelo Google. Não nos responsabilizamos pelo conteúdo dos anúncios exibidos.</p>
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
                <p>Dúvidas? <a href="mailto:contato@curriculogo.com.br" className="text-blue-600 hover:underline">contato@curriculogo.com.br</a></p>
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

    const escapeHtml = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const handlePrintLetter = () => {
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(`
        <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
        <title>Carta de Apresentação — ${escapeHtml(clJobTitle)}</title>
        <style>
          body { font-family: 'Georgia', serif; max-width: 680px; margin: 60px auto; padding: 0 40px; color: #1e293b; line-height: 1.8; font-size: 15px; }
          p { margin-bottom: 1.2em; text-align: justify; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 24px; margin-bottom: 32px; }
          .name { font-size: 22px; font-weight: bold; color: #0f172a; }
          .meta { font-size: 12px; color: #64748b; margin-top: 4px; }
          .date { text-align: right; margin-bottom: 32px; color: #64748b; font-size: 13px; }
        </style></head><body>
        <div class="header">
          <div class="name">${escapeHtml(data.personalInfo?.fullName || 'Candidato')}</div>
          <div class="meta">${escapeHtml(data.personalInfo?.email || '')} · ${escapeHtml(data.personalInfo?.phone || '')}</div>
        </div>
        <div class="date">${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        ${clResult.split('\n\n').map(p => `<p>${p.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,' ')}</p>`).join('')}
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
        <header className="h-20 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('/', 'home')}>
            <span
              className="logo-nav inline-flex items-center gap-2 select-none"
              onTouchStart={handleLogoTouchStart}
              onTouchEnd={handleLogoTouchEnd}
              onTouchCancel={handleLogoTouchEnd}
            >
              <img src="/logo.png" alt="CurriculoGO" className="h-10 w-auto object-contain" />
              <span className="font-black text-[1.15rem] tracking-tight" style={{ background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CurriculoGO</span>
            </span>
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
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Cargo / Vaga</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                      placeholder="Ex: Desenvolvedor Front-End Sênior"
                      value={clJobTitle}
                      onChange={e => setClJobTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Empresa</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                      placeholder="Ex: Google, Nubank, Ambev..."
                      value={clCompany}
                      onChange={e => setClCompany(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Seu Nome (para a carta)</label>
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
                      <span className={`text-sm font-black uppercase tracking-wide ${clTone === t.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>{t.label}</span>
                      <span className="text-xs text-slate-400 text-center leading-tight">{t.desc}</span>
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
        <header className="relative z-10 h-32 flex items-center justify-between px-8 md:px-20">
          <div className="logo-hero-wrapper">
            <span className="inline-flex items-center gap-3">
              <img src="/logo.png" alt="CurriculoGO" className="logo-hero h-20 w-auto object-contain drop-shadow-lg" />
              <span className="font-black text-[2rem] md:text-[2.6rem] tracking-tight leading-none" style={{ background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CurriculoGO</span>
            </span>
          </div>
          <div className="flex gap-3 items-center">
             <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
               <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
             </button>
            <button onClick={() => { updateData(MOCK_RESUME_DATA); navigateTo('/', 'editor'); }} className="hidden md:block text-xs font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">Ver Exemplo</button>

            {/* Login / avatar na home */}
            {user ? (
              <button
                onClick={handleOpenCloudResumes}
                className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-slate-800 transition-all shadow-sm"
                title="Meus currículos"
              >
                {user.photoURL
                  ? <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
                  : <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black">{(user.displayName || user.email || 'U')[0].toUpperCase()}</div>
                }
                <span className="text-sm font-black text-slate-500 dark:text-slate-400 ">Meus Currículos</span>
                <i className="fas fa-cloud text-[9px] text-emerald-500"></i>
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-slate-800 font-black text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 uppercase tracking-wide transition-all shadow-sm"
              >
                <i className="fas fa-cloud text-emerald-500 text-sm"></i>
                Salvar na Nuvem
              </button>
            )}
          </div>
        </header>
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-24 text-center">
          <div className="max-w-5xl w-full space-y-8">
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
              <span className="inline-flex items-center gap-2 py-2 px-4 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
                ⚡ Grátis agora. Sem cadastro. Sem enrolação. Só resultado.
              </span>
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                Seu currículo novo,<br className="hidden md:block"/>
                <span style={{ background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent', fontStyle: 'italic' }}>em minutos.</span> <span>🚀</span>
              </h2>
              <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
                IA do Google Gemini + 15 designs prontos para impressionar. Pronto em minutos — não em horas.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <button onClick={() => navigateTo('/', 'templates')} className="group text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:scale-[1.05] active:scale-[0.98] transition-all shadow-2xl flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #0d1b6e, #2563eb 60%, #0d9488)' }}>
                Criar meu Currículo 🎯 <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
              </button>
              <button onClick={() => setIsImportModalOpen(true)} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl flex items-center gap-3">
                📄 Importar PDF <i className="fas fa-file-import text-slate-400"></i>
              </button>
            </div>

            <div className="mt-4">
               <button onClick={() => navigateTo('/carta-de-apresentacao', 'cover-letter-page')} className="text-slate-400 hover:text-blue-600 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto group">
                 ✉️ Quer uma Carta de Apresentação que chame atenção? <i className="fas fa-arrow-right text-[9px] group-hover:translate-x-1 transition-transform"></i>
               </button>
            </div>

            {/* Trust bar */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">🎯 Abre e Já Usa</span>
              <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700 hidden sm:block"></span>
              <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">🔒 Seus Dados Só Seus</span>
              <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700 hidden sm:block"></span>
              <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">📄 PDF Grátis Agora</span>
              <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700 hidden sm:block"></span>
              <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">🤖 IA do Google</span>
            </div>

            <div className="mt-12 max-w-3xl mx-auto">
               <AdUnit slotId="" format="horizontal" />
            </div>
          </div>
        </main>

        {/* ── Features / Benefícios ── */}
        <section className="relative z-10 py-16 px-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-sm font-black uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-12">Tudo que você precisa. Nada do que te irrita. 🎯</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { emoji: '🎨', icon: 'fa-file-alt', title: '15 Modelos', desc: 'Do clássico ao arrojado — template certo para cada vaga' },
                { emoji: '🤖', icon: 'fa-wand-magic-sparkles', title: 'IA do Gemini', desc: 'Gera textos, sugere habilidades e aumenta seu score ATS' },
                { emoji: '📄', icon: 'fa-file-pdf', title: 'PDF Grátis', desc: 'Baixe agora em alta qualidade — sem pagar, sem informar e-mail' },
                { emoji: '🙈', icon: 'fa-user-slash', title: 'Abre e Usa', desc: 'Sem criar conta, sem confirmar e-mail. Abriu, editou, baixou. Simples.' },
              ].map(f => (
                <div key={f.icon} className="flex flex-col items-center text-center gap-3 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-2 transition-all duration-300 cursor-default group">
                  <div className="text-3xl group-hover:scale-125 transition-transform duration-300">{f.emoji}</div>
                  <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wide">{f.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-8 text-center">
              <div className="hover:scale-110 transition-transform cursor-default"><p className="text-3xl font-black text-blue-600 dark:text-blue-400">+<AnimatedCounter target={15000} /> 🎉</p><p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Currículos gerados</p></div>
              <div className="hidden md:block w-px h-12 bg-slate-200 dark:bg-slate-700"></div>
              <div className="hover:scale-110 transition-transform cursor-default"><p className="text-3xl font-black text-blue-600 dark:text-blue-400"><AnimatedCounter target={15} /> 🎨</p><p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Modelos exclusivos</p></div>
              <div className="hidden md:block w-px h-12 bg-slate-200 dark:bg-slate-700"></div>
              <div className="hover:scale-110 transition-transform cursor-default"><p className="text-3xl font-black text-blue-600 dark:text-blue-400">3 💚</p><p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Modelos gratuitos</p></div>
              <div className="hidden md:block w-px h-12 bg-slate-200 dark:bg-slate-700"></div>
              <div className="hover:scale-110 transition-transform cursor-default"><p className="text-3xl font-black text-blue-600 dark:text-blue-400">4.9 ⭐</p><p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Avaliação média</p></div>
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
            <p className="text-center text-[10px] font-black uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-3 text-sm">Depoimentos</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2 uppercase tracking-tight">Quem já conquistou sua vaga</h3>
            <p className="text-center text-sm text-slate-400 mb-10">Histórias reais de quem usou o CurriculoGO para se destacar</p>

            {/* Depoimentos fixos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                      <p className="text-xs text-slate-400 font-medium">{t.role} · {t.city}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Depoimentos da comunidade (aprovados) */}
            {communityReviews.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {communityReviews.map((t: any) => (
                  <div key={t.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-blue-100 dark:border-slate-700 shadow-sm relative">
                    <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">Verificado</span>
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(t.stars)].map((_: any, j: number) => <i key={j} className="fas fa-star text-amber-400 text-xs"></i>)}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5 italic">"{t.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-black text-sm shrink-0`}>{t.avatar}</div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-white text-sm">{t.name}</p>
                        <p className="text-xs text-slate-400 font-medium">{[t.role, t.city].filter(Boolean).join(' · ')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CTA: Deixar depoimento */}
            <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-10">
              {!reviewFormOpen && !reviewSent && (
                <div className="text-center">
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Você usou o CurriculoGO e conseguiu sua vaga? <span className="font-black text-slate-700 dark:text-white">Conta pra gente! 🎉</span></p>
                  <button
                    onClick={() => setReviewFormOpen(true)}
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-95"
                  >
                    <i className="fas fa-star"></i> Compartilhar minha experiência
                  </button>
                </div>
              )}

              {reviewSent && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-check text-green-500 text-2xl"></i>
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white text-lg mb-2">Depoimento enviado! 🎉</h4>
                  <p className="text-slate-500 text-sm mb-4">Obrigado! Seu depoimento será publicado após uma breve revisão.</p>
                  <button onClick={() => { setReviewSent(false); setReviewFormOpen(false); }} className="text-xs text-blue-500 hover:text-blue-700 font-bold uppercase tracking-widest">Fechar</button>
                </div>
              )}

              {reviewFormOpen && !reviewSent && (
                <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center justify-between mb-5">
                    <h4 className="font-black text-slate-900 dark:text-white">Sua experiência 💬</h4>
                    <button onClick={() => setReviewFormOpen(false)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </div>

                  {/* Estrelas */}
                  <div className="mb-4">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Avaliação</p>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(s => (
                        <button key={s} onClick={() => setReviewStars(s)} className="text-2xl transition-transform hover:scale-110 active:scale-95">
                          <i className={`fas fa-star ${s <= reviewStars ? 'text-amber-400' : 'text-slate-200 dark:text-slate-600'}`}></i>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campos */}
                  <div className="space-y-3 mb-4">
                    <input
                      value={reviewName} onChange={e => setReviewName(e.target.value)} maxLength={60}
                      placeholder="Seu nome *"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none transition-all"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={reviewRole} onChange={e => setReviewRole(e.target.value)} maxLength={60}
                        placeholder="Cargo / área"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none transition-all"
                      />
                      <input
                        value={reviewCity} onChange={e => setReviewCity(e.target.value)} maxLength={60}
                        placeholder="Cidade"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none transition-all"
                      />
                    </div>
                    <div className="relative">
                      <textarea
                        value={reviewText} onChange={e => setReviewText(e.target.value.slice(0, 400))}
                        placeholder="Conte como o CurriculoGO te ajudou... (mínimo 20 caracteres) *"
                        rows={4}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none transition-all resize-none"
                      />
                      <span className="absolute bottom-2 right-3 text-[10px] text-slate-400">{reviewText.length}/400</span>
                    </div>
                  </div>

                  {reviewError && <p className="text-xs text-red-500 font-medium mb-3">⚠️ {reviewError}</p>}

                  <button
                    onClick={handleSubmitReview}
                    disabled={reviewLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {reviewLoading
                      ? <><i className="fas fa-circle-notch fa-spin"></i> Enviando...</>
                      : <><i className="fas fa-paper-plane"></i> Enviar depoimento</>
                    }
                  </button>
                  <p className="text-center text-[10px] text-slate-400 mt-3">Seu depoimento será publicado após uma breve revisão pelo time do CurriculoGO.</p>
                </div>
              )}
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
                { slug: 'o-que-e-ats-e-como-passar-pela-triagem', title: 'O Que é ATS e Como Passar pela Triagem', cat: 'ATS & Tech' },
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
          <p className="text-[10px] text-slate-400 dark:text-slate-600">© 2026 CurriculoGO · Sua Carreira, Agora 🚀</p>
        </footer>
      </div>
    );
  }

  if (view === 'templates') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-300">
        {globalOverlays}
        <header className="h-20 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 md:px-8 sticky top-0 z-50">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('/', 'home')}>
             <i className="fas fa-arrow-left text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"></i>
             <span className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 hidden sm:block">Voltar</span>
          </div>
          <div className="text-center flex flex-col items-center">
            <span
              className="logo-nav inline-flex items-center gap-2 select-none"
              onTouchStart={handleLogoTouchStart}
              onTouchEnd={handleLogoTouchEnd}
              onTouchCancel={handleLogoTouchEnd}
            >
              <img src="/logo.png" alt="CurriculoGO" className="h-10 w-auto object-contain" />
              <span className="font-black text-[1.15rem] tracking-tight" style={{ background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CurriculoGO</span>
            </span>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block mt-0.5">Escolha seu estilo ✨</p>
          </div>
          <div className="w-20"></div>
        </header>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-12">

            {/* ── Seção Gratuitos ── */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                    <span className="text-base">🆓</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wide">Gratuitos</h2>
                    <p className="text-[10px] text-slate-400 font-bold">{FREE_TEMPLATES.length} modelos para começar agora</p>
                  </div>
                </div>
                <button onClick={() => setShowFreeTemplates(v => !v)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wide hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                  <i className={`fas ${showFreeTemplates ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                  {showFreeTemplates ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {showFreeTemplates && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {FREE_TEMPLATES.map((t) => (
                    <div key={t.id} className={`bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group border-2 flex flex-col ${template === t.id ? 'border-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/30' : 'border-transparent hover:border-blue-200 dark:hover:border-blue-800'}`}>
                      <div className="relative aspect-[210/297] bg-slate-100 dark:bg-slate-900 overflow-hidden">
                        <TemplateThumbnail template={t.id as TemplateId} className="w-full h-full" />
                        {t.badge && <div className={`absolute top-3 left-3 ${t.badgeColor} text-white text-[9px] font-black px-2 py-1 rounded-full`}>{t.badge}</div>}
                        {template === t.id && <div className="absolute top-3 right-3 bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded-full">✓ Ativo</div>}
                        <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button onClick={() => handleTemplateSelect(t.id as TemplateId)} className="bg-white text-blue-600 px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest shadow-xl transform scale-90 group-hover:scale-100 transition-transform flex items-center gap-2">🎯 Usar este</button>
                        </div>
                      </div>
                      <div className="p-5 flex flex-col gap-1.5">
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase">{t.label}</h3>
                        <p className="text-xs text-slate-400">{t.desc}</p>
                        <button onClick={() => handleTemplateSelect(t.id as TemplateId)} className={`mt-3 w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 ${template === t.id ? 'bg-blue-600 text-white shadow-lg' : 'border-2 border-slate-100 dark:border-slate-700 text-slate-500 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-md'}`}>
                          {template === t.id ? '✓ Selecionado — Vamos lá!' : 'Selecionar este'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Seção Premium ── */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-base">👑</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wide">Premium</h2>
                      {isPremium && premiumPlan === 'lifetime' && <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">♾️ Vitalício</span>}
                      {isPremium && premiumPlan !== 'lifetime' && daysLeft !== null && <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${daysLeft && daysLeft <= 1 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>⚡ {daysLeft}d restantes</span>}
                      {premiumExpired && <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase animate-pulse">⏰ Expirou</span>}
                      {!isPremium && !premiumExpired && <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">a partir de R$ 9,90</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold">{PREMIUM_TEMPLATES_LIST.length} designs exclusivos</p>
                  </div>
                </div>
                {!isPremium && (
                  <button onClick={() => { setPremiumModalTemplate(''); setIsPremiumModalOpen(true); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-wide hover:opacity-90 transition-all shadow-md active:scale-95 ${premiumExpired ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}>
                    {premiumExpired ? '⏰ Reativar' : '🔓 Desbloquear tudo'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {PREMIUM_TEMPLATES_LIST.map((t) => {
                  const unlocked = isPremium;
                  return (
                    <div key={t.id} className={`rounded-3xl overflow-hidden shadow-lg transition-all duration-300 group border-2 flex flex-col bg-white dark:bg-slate-800 hover:shadow-2xl hover:-translate-y-2 ${template === t.id ? 'border-amber-500 ring-4 ring-amber-100 dark:ring-amber-900/30' : unlocked ? 'border-transparent hover:border-amber-300 dark:hover:border-amber-700' : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700'}`}>
                      <div className="relative aspect-[210/297] bg-slate-100 dark:bg-slate-900 overflow-hidden">
                        {/* Thumbnail sempre nítido — o usuário vê o modelo completo */}
                        <TemplateThumbnail template={t.id as TemplateId} className="w-full h-full" />
                        {t.badge && <div className={`absolute top-3 left-3 ${t.badgeColor} text-white text-[9px] font-black px-2 py-1 rounded-full`}>{t.badge}</div>}
                        {template === t.id && unlocked && <div className="absolute top-3 right-3 bg-amber-500 text-white text-[9px] font-black px-2 py-1 rounded-full">✓ Ativo</div>}

                        {/* Cadeado pequeno no canto — só indica que é premium, sem esconder */}
                        {!unlocked && (
                          <div className="absolute top-3 right-3 w-7 h-7 bg-white/95 dark:bg-slate-900/95 rounded-lg flex items-center justify-center shadow-md border border-slate-200/60 dark:border-slate-700/60">
                            <span className="text-sm">{premiumExpired ? '⏰' : '🔒'}</span>
                          </div>
                        )}

                        {/* Overlay hover — aparece ao passar o mouse */}
                        <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          {unlocked
                            ? <button onClick={() => handleTemplateSelect(t.id as TemplateId)} className="bg-white text-blue-600 px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest shadow-xl transform scale-90 group-hover:scale-100 transition-transform">🎯 Usar este</button>
                            : <button onClick={() => { setPremiumModalTemplate(t.label); setIsPremiumModalOpen(true); }} className={`text-white px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest shadow-xl scale-90 group-hover:scale-100 transition-transform ${premiumExpired ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}>
                                {premiumExpired ? '⏰ Reativar' : '👑 Desbloquear'}
                              </button>
                          }
                        </div>
                      </div>

                      <div className="p-5 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase">{t.label}</h3>
                          {!unlocked && <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-black">PREMIUM</span>}
                        </div>
                        <p className="text-xs text-slate-400">{t.desc}</p>
                        {unlocked
                          ? <button onClick={() => handleTemplateSelect(t.id as TemplateId)} className={`mt-3 w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 ${template === t.id ? 'bg-amber-500 text-white shadow-lg' : 'border-2 border-slate-100 dark:border-slate-700 text-slate-500 hover:bg-amber-500 hover:text-white hover:border-amber-500 hover:shadow-md'}`}>
                              {template === t.id ? '✓ Selecionado' : 'Selecionar este'}
                            </button>
                          : <button onClick={() => { setPremiumModalTemplate(t.label); setIsPremiumModalOpen(true); }} className={`mt-3 w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-white hover:opacity-90 active:scale-95 transition-all shadow-md ${premiumExpired ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}>
                              {premiumExpired ? '⏰ Reativar acesso' : '👑 Desbloquear — R$ 9,90'}
                            </button>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Banner CTA se não for premium */}
              {!isPremium && (
                <div className={`mt-8 p-6 rounded-3xl border flex flex-col md:flex-row items-center gap-5 ${
                  premiumExpired
                    ? 'bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/20 border-rose-200 dark:border-rose-700/40'
                    : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700/40'
                }`}>
                  <div className="text-5xl">{premiumExpired ? '⏰' : '👑'}</div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="font-black text-slate-900 dark:text-white text-lg">
                      {premiumExpired ? 'Seu acesso de 7 dias expirou' : 'Desbloqueie todos os 12 templates'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      {premiumExpired
                        ? 'Reative por R$ 9,90 (7 dias) ou garanta o vitalício por R$ 29,90. Sem renovação automática. ✌️'
                        : '7 dias por R$ 9,90 ou vitalício por R$ 29,90 — sem assinatura, sem cadastro. ✌️'}
                    </p>
                  </div>
                  <button onClick={() => { setPremiumModalTemplate(''); setIsPremiumModalOpen(true); }} className={`shrink-0 px-8 py-4 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg hover:opacity-90 active:scale-95 transition-all ${premiumExpired ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}>
                    {premiumExpired ? '⏰ Reativar agora' : '🔓 Quero o Premium'}
                  </button>
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

      <nav className="no-print h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 md:px-8 z-50 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('/', 'home')}>
          <span className="logo-nav inline-flex items-center gap-2">
            <img src="/logo.png" alt="CurriculoGO" className="h-10 w-auto object-contain" />
            <span className="font-black text-[1.15rem] tracking-tight" style={{ background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CurriculoGO</span>
          </span>
        </div>
        
        {/* Título central mobile (limpo) */}
        <span className="flex md:hidden font-black text-sm text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          {mobileView === 'editor' ? '✏️ Editar' : '👁️ Preview'}
        </span>

        <div className="hidden lg:flex items-center gap-4">
           {/* Indicador de auto-save */}
           <div className="flex items-center gap-1.5 min-w-[90px]">
             {autoSaveStatus === 'saving' && (
               <span className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wide animate-pulse">
                 <i className="fas fa-circle-notch fa-spin text-[9px]"></i> Salvando...
               </span>
             )}
             {autoSaveStatus === 'saved' && (
               <span className="flex items-center gap-1.5 text-xs text-green-500 font-bold uppercase tracking-wide animate-in fade-in duration-300">
                 <i className="fas fa-check-circle text-[9px]"></i> Salvo
               </span>
             )}
             {autoSaveStatus === 'idle' && (
               <span className="flex items-center gap-1.5 text-xs text-slate-300 dark:text-slate-600 font-bold uppercase tracking-wide">
                 <i className="fas fa-hdd text-[9px]"></i> Auto-save ativo
               </span>
             )}
           </div>

           <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>

           <div className="flex items-center gap-2">
              <button onClick={undo} disabled={!canUndo} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${canUndo ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'}`} title="Desfazer"><i className="fas fa-undo text-xs"></i></button>
              <button onClick={redo} disabled={!canRedo} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${canRedo ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'}`} title="Refazer"><i className="fas fa-redo text-xs"></i></button>
           </div>

           <button
             onClick={() => setIsATSPanelOpen(true)}
             className="flex items-center gap-2 px-4 py-2 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-700/40 rounded-full font-black text-xs uppercase tracking-wide hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all"
             title="Analisar currículo com IA"
           >
             <i className="fas fa-brain text-xs"></i> Score ATS
           </button>

           <div className="flex items-center gap-3">
              <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${cvScore > 70 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${cvScore}%` }}></div>
              </div>
              <span className="text-sm font-black text-slate-600 dark:text-slate-300">{cvScore}%</span>
           </div>

           {/* Botão salvar na nuvem */}
           <button
             onClick={handleOpenSaveModal}
             className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/40 rounded-full font-black text-xs uppercase tracking-wide hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
             title={user ? 'Salvar na nuvem' : 'Login para salvar na nuvem'}
           >
             <i className={`fas ${cloudSaving ? 'fa-circle-notch fa-spin' : currentCloudId ? 'fa-cloud-upload-alt' : 'fa-cloud'} text-xs`}></i>
             <span className="hidden xl:inline">{user ? (currentCloudId ? 'Atualizar' : 'Salvar') : 'Nuvem'}</span>
           </button>

           <button
             onClick={handlePrint}
             className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold text-sm uppercase tracking-wide hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg"
           >
             <i className="fas fa-file-pdf"></i> Baixar PDF
           </button>

           {/* Avatar / botão de login */}
           {user ? (
             <button
               onClick={handleOpenCloudResumes}
               className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
               title="Meus currículos na nuvem"
             >
               {user.photoURL
                 ? <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
                 : <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black">{(user.displayName || user.email || 'U')[0].toUpperCase()}</div>
               }
               <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors hidden xl:inline">
                 {(user.displayName || user.email || '').split(' ')[0]}
               </span>
               <i className="fas fa-chevron-down text-[8px] text-slate-400 hidden xl:inline"></i>
             </button>
           ) : (
             <button
               onClick={() => setIsAuthModalOpen(true)}
               className="flex items-center gap-2 px-4 py-2 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-full font-black text-[10px] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 uppercase tracking-widest transition-all"
               title="Entrar para salvar na nuvem"
             >
               <i className="fas fa-user-circle text-sm"></i>
               <span className="hidden xl:inline">Entrar</span>
             </button>
           )}
        </div>

        {/* Mobile right buttons — apenas save indicator + nuvem */}
        <div className="flex md:hidden items-center gap-2">
          {autoSaveStatus === 'saving' && <i className="fas fa-circle-notch fa-spin text-slate-400 text-xs"></i>}
          {autoSaveStatus === 'saved' && <i className="fas fa-check-circle text-green-500 text-xs"></i>}
          <button
            onClick={handleOpenSaveModal}
            className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-slate-200 dark:border-slate-700 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
            title="Salvar na nuvem"
          >
            <i className={`fas ${cloudSaving ? 'fa-circle-notch fa-spin' : currentCloudId ? 'fa-cloud-upload-alt' : 'fa-cloud'} text-sm`}></i>
          </button>
        </div>
      </nav>

      {/* ===== BOTTOM NAVIGATION BAR — mobile only ===== */}
      <div className="md:hidden no-print fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 h-16 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Editar */}
        <button
          onClick={() => setMobileView('editor')}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${mobileView === 'editor' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500'}`}
        >
          <i className="fas fa-pencil-alt text-base"></i>
          <span className="text-[9px] font-black uppercase tracking-wide">Editar</span>
        </button>
        {/* Preview */}
        <button
          onClick={() => setMobileView('preview')}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${mobileView === 'preview' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500'}`}
        >
          <i className="fas fa-eye text-base"></i>
          <span className="text-[9px] font-black uppercase tracking-wide">Preview</span>
        </button>
        {/* PDF — destaque central */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wide transition-all shadow-lg shadow-blue-500/30"
        >
          <i className="fas fa-file-pdf"></i>
          <span>PDF</span>
        </button>
        {/* Word / DOCX */}
        <button
          onClick={handleExportDocx}
          title="Exportar como Word (.docx)"
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
        >
          <i className="fas fa-file-word text-base"></i>
          <span className="text-[9px] font-black uppercase tracking-wide">Word</span>
        </button>
        {/* Templates / Estilos */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${isSidebarOpen ? 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' : 'text-slate-400 dark:text-slate-500'}`}
        >
          <i className="fas fa-palette text-base"></i>
          <span className="text-[9px] font-black uppercase tracking-wide">Estilos</span>
        </button>
        {/* ATS Score */}
        <button
          onClick={() => setIsATSPanelOpen(true)}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-slate-400 dark:text-slate-500 transition-all"
        >
          <i className="fas fa-brain text-base"></i>
          <span className="text-[9px] font-black uppercase tracking-wide">Score</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        
        <div className={`no-print w-full md:w-[480px] lg:w-[520px] flex flex-col border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-30 shrink-0 transition-all duration-300 absolute md:relative inset-0 md:inset-auto pb-16 md:pb-0 ${mobileView === 'editor' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
           
           <div className="relative shrink-0">
           <div className="flex overflow-x-auto border-b border-slate-50 dark:border-slate-800 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50 px-2 tabs-scroll-container">
             <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50 dark:from-slate-900 to-transparent z-10 md:hidden"></div>
             {STEPS.map((step, idx) => (
               <button
                key={step.id}
                onClick={() => setCurrentStep(idx)}
                className={`flex-1 min-w-[80px] py-4 flex flex-col items-center gap-2 transition-all relative px-2 shrink-0 ${currentStep === idx ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 shadow-sm rounded-t-lg mt-1' : 'text-slate-400 grayscale hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
               >
                 <span className={`text-lg leading-none transition-transform ${currentStep === idx ? 'scale-125' : 'group-hover:scale-110'}`}>{step.emoji}</span>
                 <span className="text-xs font-black uppercase tracking-wide whitespace-nowrap">{step.label}</span>
                 {currentStep === idx && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>}
               </button>
             ))}
           </div>
           </div>

           <div ref={editorScrollRef} className={`flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 transition-colors duration-500 ${highlightedStep ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}>
              {activeTab === 'info' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1 uppercase tracking-tight">🧑 Sobre Você</h2>
                  <p className="text-sm text-slate-400 mb-6">Essas são as primeiras impressões — capriche! ✨</p>

                  <div className="flex items-center gap-6 mb-6">
                    <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                      <div className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                        {data.personalInfo?.photoUrl ? (
                          <img src={data.personalInfo.photoUrl} alt="Perfil" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-4xl group-hover:scale-125 transition-transform">📸</span>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-white text-[10px] font-bold uppercase">Alterar</span>
                      </div>
                      <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoSelect} />
                    </div>
                    <div>
                       <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">📷 Sua Foto</h3>
                       <p className="text-sm text-slate-400 max-w-[220px] leading-snug mt-1">Sorria! Uma boa foto aumenta muito as chances de chamarem você. 😊</p>
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
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">💼 Experiências</h2>
                    <button onClick={() => addItem('experiences')} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-blue-700 active:scale-95 transition-all">+ Adicionar</button>
                  </div>
                  <p className="text-sm text-slate-400 mb-6">Seus maiores feitos vão aqui. Não seja modesto! 💪</p>
                  {data.experiences?.map(exp => (
                    <div key={exp.id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 relative group border-l-4 border-l-blue-400 shadow-sm hover:shadow-md transition-shadow">
                      <button onClick={() => removeItem('experiences', exp.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
                      <Input label="Empresa" value={exp.company} onChange={(v) => updateItem('experiences', exp.id, 'company', v)} />
                      <Input label="Cargo" value={exp.position} onChange={(v) => updateItem('experiences', exp.id, 'position', v)} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input label="Início" value={exp.startDate} onChange={(v) => updateItem('experiences', exp.id, 'startDate', v)} placeholder="Ex: Jan 2020" />
                        <Input label="Fim" value={exp.endDate} onChange={(v) => { updateItem('experiences', exp.id, 'endDate', v); const r = validateDateRange(exp.startDate, v); if (!r.valid) setErrors(p => ({...p, [`exp_date_${exp.id}`]: r.error || null})); else setErrors(p => ({...p, [`exp_date_${exp.id}`]: null})); }} placeholder="Ex: Atual" error={errors[`exp_date_${exp.id}`] || undefined} />
                      </div>
                      <div className="mt-2 relative">
                         <div className="flex justify-between items-center mb-1">
                           <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Descrição</label>
                           <button onClick={() => handleEnhance(exp.description, 'experiência', 'experiences', exp.id)} disabled={!exp.description || isEnhancing === exp.id} className="text-xs text-blue-600 dark:text-blue-400 font-black uppercase hover:text-blue-800 transition-colors flex items-center gap-1.5">
                            <i className={`fas ${isEnhancing === exp.id ? 'fa-circle-notch fa-spin' : 'fa-wand-magic-sparkles'}`}></i> 🤖 Melhorar com IA
                           </button>
                         </div>
                         <textarea className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-base h-36 outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white focus:border-blue-500 resize-none transition-all" value={exp.description} onChange={(e) => updateItem('experiences', exp.id, 'description', e.target.value)} />
                      </div>
                    </div>
                  ))}
                  {data.experiences.length === 0 && (
                     <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                        <div className="text-5xl mb-3">💼</div>
                        <p className="text-base font-bold text-slate-500">Nenhuma experiência ainda.</p>
                        <p className="text-sm text-slate-400 mt-1">Todo mundo começa do zero! Adicione a sua. 😄</p>
                     </div>
                  )}
                </div>
              )}
              {activeTab === 'education' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">🎓 Educação</h2>
                    <button onClick={() => addItem('education')} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-blue-700 active:scale-95 transition-all">+ Adicionar</button>
                  </div>
                  <p className="text-sm text-slate-400 mb-6">Onde você aprendeu a ser incrível! 🏫</p>
                  {data.education?.map(edu => (
                    <div key={edu.id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 relative group border-l-4 border-l-indigo-400 shadow-sm hover:shadow-md transition-shadow">
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
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">🌍 Idiomas</h2>
                    <button onClick={() => addItem('languages')} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-blue-700 active:scale-95 transition-all">+ Adicionar</button>
                  </div>
                  <p className="text-sm text-slate-400 mb-6">Fala inglês? Ótimo. Fala mandarim? Melhor ainda. 😏</p>
                  {data.languages?.map(lang => (
                    <div key={lang.id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 relative group border-l-4 border-l-green-400 shadow-sm hover:shadow-md transition-shadow">
                      <button onClick={() => removeItem('languages', lang.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
                      <Input label="Idioma" value={lang.name} onChange={(v) => updateItem('languages', lang.id, 'name', v)} placeholder="Ex: Inglês" />
                      <Input label="Nível" value={lang.level} onChange={(v) => updateItem('languages', lang.id, 'level', v)} placeholder="Ex: Fluente, Intermediário" />
                    </div>
                  ))}
                  {(!data.languages || data.languages.length === 0) && (
                    <div className="text-center p-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                      <div className="text-4xl mb-2">🌍</div>
                      <p className="text-sm font-bold text-slate-500">Nenhum idioma adicionado ainda.</p>
                      <p className="text-xs text-slate-300 mt-1">Até o "Português nativo" conta! 🇧🇷</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'certifications' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">🏆 Cursos e Certificações</h2>
                    <button onClick={() => addItem('courses')} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-blue-700 active:scale-95 transition-all">+ Adicionar</button>
                  </div>
                  <p className="text-sm text-slate-400 mb-6">Cursos, certificações e tudo que você aprendeu além da faculdade. 📚</p>
                  {data.courses?.map(cert => (
                    <div key={cert.id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 relative group border-l-4 border-l-yellow-400 shadow-sm">
                      <button onClick={() => removeItem('courses', cert.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
                      <Input label="Curso / Certificação" value={cert.name} onChange={(v) => updateItem('courses', cert.id, 'name', v)} />
                      <Input label="Instituição" value={cert.institution} onChange={(v) => updateItem('courses', cert.id, 'institution', v)} />
                      <Input label="Ano" value={cert.year} onChange={(v) => updateItem('courses', cert.id, 'year', v)} placeholder="Ex: 2023" />
                    </div>
                  ))}
                  {(!data.courses || data.courses.length === 0) && (
                    <div className="text-center p-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                      <div className="text-4xl mb-2">🏆</div>
                      <p className="text-sm font-bold text-slate-500">Nenhum curso ainda.</p>
                      <p className="text-sm text-slate-400 mt-1">Até aquele curso de Excel de 2018 pode entrar! 😂</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'projects' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">🚀 Projetos</h2>
                    <button onClick={() => addItem('projects')} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-blue-700 active:scale-95 transition-all">+ Adicionar</button>
                  </div>
                  <p className="text-sm text-slate-400 mb-6">Mostre o que você construiu! Projetos pessoais, open source, apps, sites... 🔨</p>
                  {(data.projects || []).map(proj => (
                    <div key={proj.id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 relative group border-l-4 border-l-emerald-400 shadow-sm hover:shadow-md transition-shadow">
                      <button onClick={() => removeItem('projects', proj.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
                      <Input label="Nome do Projeto" value={proj.name} onChange={(v) => updateItem('projects', proj.id, 'name', v)} placeholder="Ex: App de Finanças Pessoais" />
                      <Input label="Tecnologias" value={proj.technologies} onChange={(v) => updateItem('projects', proj.id, 'technologies', v)} placeholder="Ex: React, Node.js, PostgreSQL" />
                      <Input label="Link (opcional)" value={proj.url} onChange={(v) => updateItem('projects', proj.id, 'url', v)} placeholder="https://github.com/seu-projeto" />
                      <div className="mt-2">
                        <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Descrição</label>
                        <textarea
                          className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-base h-28 outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white focus:border-blue-500 resize-none transition-all"
                          value={proj.description}
                          onChange={(e) => updateItem('projects', proj.id, 'description', e.target.value)}
                          placeholder="O que o projeto faz e qual problema resolve..."
                        />
                      </div>
                    </div>
                  ))}
                  {(!data.projects || data.projects.length === 0) && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                      <div className="text-5xl mb-3">🚀</div>
                      <p className="text-base font-bold text-slate-500">Nenhum projeto ainda.</p>
                      <p className="text-sm text-slate-400 mt-1">Para devs e designers, projetos valem ouro! ✨</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'skills' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">⚡ Skills</h2>
                     <button onClick={handleSuggestSkills} disabled={isEnhancing === 'skills-suggest'} className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-2 hover:text-blue-800 transition-colors">
                      <i className={`fas ${isEnhancing === 'skills-suggest' ? 'fa-circle-notch fa-spin' : 'fa-wand-magic-sparkles'}`}></i> 🤖 Sugerir com IA
                    </button>
                  </div>
                  <p className="text-sm text-slate-400 mb-6">Separe por vírgula. Seja honesto — ninguém quer "expert em tudo". 😅</p>
                  <div className="relative">
                    <textarea
                      className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-base h-44 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 dark:text-white resize-none leading-relaxed transition-all"
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
                      placeholder="Ex: Excel, Comunicação, Photoshop, Gestão de Projetos..."
                    />
                  </div>
                </div>
              )}
              {activeTab === 'summary' && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">✍️ Resumo Profissional</h2>
                    <button onClick={handleGenerateSummary} disabled={!data.skills?.length || isEnhancing === 'summary-gen'} className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase flex items-center gap-2 hover:text-blue-800 transition-colors">
                      <i className={`fas ${isEnhancing === 'summary-gen' ? 'fa-circle-notch fa-spin' : 'fa-wand-magic'}`}></i> 🤖 Gerar com IA
                    </button>
                  </div>
                  <p className="text-sm text-slate-400 mb-6">Seu pitch de 3 linhas para o recrutador. A IA faz por você! 🚀</p>
                  <div className="relative">
                    <textarea
                      className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-base h-64 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 dark:text-white resize-none leading-relaxed transition-all"
                      value={data.summary}
                      onChange={(e) => updateData(prev => ({ ...prev, summary: e.target.value }))}
                      placeholder="Clica em '🤖 Gerar com IA' e deixa a mágica acontecer... ou escreva você mesmo!"
                    />
                    <button
                      onClick={() => handleEnhance(data.summary, 'resumo')}
                      disabled={!data.summary || isEnhancing === 'resumo'}
                      className="absolute bottom-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700 hover:text-blue-600 transition-all active:scale-95"
                    >
                      <i className={`fas ${isEnhancing === 'resumo' ? 'fa-circle-notch fa-spin' : 'fa-magic'} mr-1`}></i> ✨ Refinar
                    </button>
                  </div>
                </div>
              )}
           </div>

           <div className="p-4 md:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 no-print bg-white dark:bg-slate-900 z-10">
              {/* Score on mobile */}
              <div className="flex md:hidden items-center gap-1.5 min-w-0">
                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${cvScore > 70 ? 'bg-green-500' : 'bg-blue-500'}`} style={{width:`${cvScore}%`}}></div>
                </div>
                <span className="text-xs font-black text-slate-500 uppercase">{cvScore}% {cvScore > 70 ? '🔥' : '📝'}</span>
              </div>
              <button onClick={prevStep} className={`hidden md:block flex-1 py-4 font-bold text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors ${currentStep === 0 ? 'invisible' : ''}`}>← Anterior</button>
              <button onClick={prevStep} className={`md:hidden w-10 h-10 rounded-xl border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 transition-colors active:scale-95 ${currentStep === 0 ? 'invisible' : ''}`}>
                <i className="fas fa-chevron-left text-sm"></i>
              </button>
              <button onClick={nextStep} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black text-sm uppercase tracking-wide hover:bg-blue-700 shadow-lg active:scale-95 transition-all">
                {currentStep === STEPS.length - 1
                  ? <><span>🎉 Baixar PDF!</span></>
                  : <><span className="">Próximo →</span><i className="fas fa-chevron-right sm:hidden text-xs"></i></>
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
            {/* Esquerda: label + template ativo */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400 hidden sm:block whitespace-nowrap">Pré-visualização A4</span>
              <span className=" text-slate-200 dark:text-slate-700">·</span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400 hidden sm:block truncate">{template.replace(/_/g,' ')}</span>
              <span className="text-sm font-bold text-slate-400 sm:hidden">{template.replace(/_/g,' ')}</span>
            </div>

            {/* Centro: controles de zoom */}
            <div className="flex items-center gap-1">
              <button onClick={() => setPreviewScale(s => Math.max(0.2, s - 0.05))} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Diminuir zoom">
                <i className="fas fa-minus text-xs"></i>
              </button>
              <span className="text-sm font-black text-slate-600 dark:text-slate-300 w-12 text-center tabular-nums">{Math.round(previewScale * 100)}%</span>
              <button onClick={() => setPreviewScale(s => Math.min(1, s + 0.05))} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Aumentar zoom">
                <i className="fas fa-plus text-xs"></i>
              </button>
              <button onClick={fitToScreen} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1" title="Ajustar à tela">
                <i className="fas fa-expand text-xs"></i>
              </button>
            </div>

            {/* Direita: botão toggle de Estilo (desktop) + Editar (mobile) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileView('editor')}
                className="md:hidden text-[9px] font-black text-blue-600 uppercase tracking-wide flex items-center gap-1"
              >
                <i className="fas fa-pencil-alt text-[9px]"></i> Editar
              </button>
              <button
                onClick={() => setIsSidebarOpen(v => !v)}
                className={`hidden md:flex items-center gap-1.5 px-3 h-7 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${isSidebarOpen ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                title={isSidebarOpen ? 'Ocultar painel de estilos' : 'Exibir painel de estilos'}
              >
                <i className={`fas fa-palette text-[9px] ${isSidebarOpen ? 'text-blue-600 dark:text-blue-400' : ''}`}></i>
                <span className="hidden lg:inline">{isSidebarOpen ? 'Ocultar Estilos' : 'Estilos'}</span>
                <i className={`fas fa-chevron-${isSidebarOpen ? 'right' : 'left'} text-[8px] opacity-60`}></i>
              </button>
            </div>
          </div>

          {/* Área de scroll com o currículo escalado */}
          <div
            className="flex-1 overflow-auto flex justify-center items-start custom-scrollbar"
            style={{
              background: isDarkMode
                ? 'radial-gradient(ellipse at 60% 40%, #1e293b 0%, #0f172a 100%)'
                : 'radial-gradient(ellipse at 60% 40%, #e2e8f0 0%, #cbd5e1 100%)',
              padding: '32px 24px 48px',
            }}
          >
            {/* Wrapper que dá a ilusão do papel na mesa */}
            <div className="flex flex-col items-center gap-3">
              {/* Badge do template ativo — fica acima do papel */}
              <div className="flex items-center gap-2 opacity-70">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {FREE_TEMPLATES.find(t => t.id === template)?.label || PREMIUM_TEMPLATES_LIST.find(t => t.id === template)?.label || template}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 opacity-60"></span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  {Math.round(794 * previewScale)}×{Math.round(1123 * previewScale)}px
                </span>
              </div>

              {/* O papel em si */}
              <div
                className="print-area relative"
                style={{
                  width: `${794 * previewScale}px`,
                  height: `${1123 * previewScale}px`,
                  minWidth: `${794 * previewScale}px`,
                  minHeight: `${1123 * previewScale}px`,
                  boxShadow: isDarkMode
                    ? '0 25px 60px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.04)'
                    : '0 25px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(0,0,0,0.04)',
                  borderRadius: '2px',
                }}
              >
                {/* Dobra de canto superior direito estilo papel */}
                <div
                  className="absolute top-0 right-0 z-10 pointer-events-none"
                  style={{
                    width: `${Math.max(8, 20 * previewScale)}px`,
                    height: `${Math.max(8, 20 * previewScale)}px`,
                    background: isDarkMode
                      ? 'linear-gradient(225deg, #1e293b 50%, rgba(255,255,255,0.05) 50%)'
                      : 'linear-gradient(225deg, #cbd5e1 50%, rgba(0,0,0,0.06) 50%)',
                  }}
                />
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

              {/* Sombra "mesa" abaixo do papel */}
              <div
                className="opacity-40"
                style={{
                  width: `${794 * previewScale * 0.85}px`,
                  height: '8px',
                  background: 'radial-gradient(ellipse, rgba(0,0,0,0.4) 0%, transparent 70%)',
                  filter: 'blur(4px)',
                  marginTop: '-4px',
                }}
              />
            </div>
          </div>
        </div>

        {/* Aba flutuante para reabrir o painel de estilos no desktop quando fechado */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="hidden lg:flex no-print absolute right-0 top-1/2 -translate-y-1/2 z-50 flex-col items-center justify-center gap-1 w-7 py-4 bg-white dark:bg-slate-900 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-xl shadow-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
            title="Exibir painel de estilos"
          >
            <i className="fas fa-palette text-[10px]"></i>
            <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-[8px] font-black uppercase tracking-widest leading-none">Estilos</span>
            <i className="fas fa-chevron-left text-[8px] opacity-50"></i>
          </button>
        )}

        {/* Overlay para fechar o bottom sheet no mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-[55] md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        {/* SIDEBAR: drawer lateral no desktop, bottom sheet no mobile */}
        <div className={`no-print bg-white dark:bg-slate-900 flex flex-col shrink-0 z-[56] transition-all duration-300 ease-in-out shadow-2xl overflow-hidden
          md:border-l md:border-slate-100 md:dark:border-slate-800
          fixed bottom-0 left-0 right-0 rounded-t-3xl md:rounded-none md:relative md:bottom-auto md:left-auto md:right-auto
          ${isSidebarOpen
            ? 'md:w-[360px] translate-y-0 max-h-[88vh] md:max-h-none'
            : 'md:w-0 translate-y-full md:translate-y-0 max-h-0 md:max-h-none'
          }`}>
          {/* Handle bar — só aparece no mobile */}
          <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
          </div>
           <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
              <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wide flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <i className="fas fa-palette text-blue-600 dark:text-blue-400 text-sm"></i>
                </div>
                Estilo
              </h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                title="Ocultar painel"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 py-4 md:py-6 space-y-6 md:space-y-7 pb-8">
              <section>
                 <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tamanho da Fonte</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setFontSize(s => Math.max(8, s - 0.5))} className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-base font-bold">−</button>
                      <span className="text-base font-black text-blue-600 dark:text-blue-400 w-12 text-center tabular-nums">{fontSize}px</span>
                      <button onClick={() => setFontSize(s => Math.min(16, s + 0.5))} className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-base font-bold">+</button>
                    </div>
                 </div>
                 <input type="range" min="8" max="16" step="0.5" value={fontSize} onChange={(e) => setFontSize(parseFloat(e.target.value))} className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-2" />
                 <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 font-semibold">
                   <span>Menor</span>
                   <span>Padrão (12)</span>
                   <span>Maior</span>
                 </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Família da Fonte</h3>
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 truncate max-w-[100px]" style={{ fontFamily }}>
                    {FONTS.find(f => f.family === fontFamily)?.label ?? 'Custom'}
                  </span>
                </div>
                {/* Preview ao vivo da fonte */}
                <div className="mb-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="text-base text-slate-700 dark:text-slate-200 leading-snug" style={{ fontFamily }}>
                    Analista Sênior · São Paulo
                  </p>
                  <p className="text-sm text-slate-400 mt-1" style={{ fontFamily }}>
                    experiência · educação · habilidades
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {FONTS.map(f => (
                    <button 
                      key={f.id}
                      onClick={() => setFontFamily(f.family)}
                      className={`px-3 py-3 rounded-xl text-sm border-2 transition-all truncate text-left ${fontFamily === f.family ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm' : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}
                      style={{ fontFamily: f.family }}
                      title={f.label}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                 {/* Header "Templates gratuitos" com toggle */}
                 <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2">
                     <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                       <span className="text-[10px]">🆓</span>
                     </div>
                     <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">Gratuitos</h3>
                   </div>
                   <button
                     onClick={() => setShowFreeTemplates(v => !v)}
                     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${showFreeTemplates ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}
                   >
                     <i className={`fas ${showFreeTemplates ? 'fa-eye-slash' : 'fa-eye'} text-[8px]`}></i>
                     {showFreeTemplates ? 'Ocultar' : 'Mostrar'}
                   </button>
                 </div>
                 {showFreeTemplates && (
                   <>
                   {/* Desktop: lista linear | Mobile: grid 2 colunas */}
                   <div className="hidden md:block space-y-2">
                     {FREE_TEMPLATES.map(t => (
                       <button key={t.id} onClick={() => handleTemplateSelect(t.id as TemplateId)} className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 group ${template === t.id ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}>
                          <TemplateThumbnail template={t.id as TemplateId} className="w-16 h-[84px] shrink-0 rounded-sm overflow-hidden" />
                          <div className="text-left flex-1 min-w-0">
                            <p className={`text-sm font-black uppercase truncate ${template === t.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{t.label}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">{t.desc}</p>
                            {t.badge && <span className={`inline-block mt-1 text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${t.badgeColor}`}>{t.badge}</span>}
                          </div>
                          {template === t.id && (
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                              <i className="fas fa-check text-white text-xs"></i>
                            </div>
                          )}
                       </button>
                     ))}
                   </div>
                   {/* Mobile: grid 2 colunas com thumbnails maiores */}
                   <div className="md:hidden grid grid-cols-2 gap-3">
                     {FREE_TEMPLATES.map(t => (
                       <button key={t.id} onClick={() => handleTemplateSelect(t.id as TemplateId)} className={`flex flex-col rounded-2xl border-2 overflow-hidden transition-all active:scale-95 ${template === t.id ? 'border-blue-600 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-slate-100 dark:border-slate-800'}`}>
                          <TemplateThumbnail template={t.id as TemplateId} className="w-full h-[110px] overflow-hidden" />
                          <div className="p-2 text-left">
                            <p className={`text-[10px] font-black uppercase truncate ${template === t.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{t.label}</p>
                            {template === t.id && <span className="text-[9px] text-blue-600 font-bold">✓ Ativo</span>}
                          </div>
                       </button>
                     ))}
                   </div>
                   </>
                 )}

                 {/* Separador Premium na sidebar */}
                 <div className="pt-4 mt-2">
                   <div className="flex items-center gap-2 mb-3">
                     <div className="flex-1 h-px bg-gradient-to-r from-amber-300 to-orange-400"></div>
                     <button
                       onClick={() => setShowPremiumTemplates(v => !v)}
                       className="flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide hover:opacity-70 transition-opacity"
                       title={showPremiumTemplates ? 'Ocultar templates premium' : 'Mostrar templates premium'}
                     >
                       👑 Premium
                       <i className={`fas fa-chevron-${showPremiumTemplates ? 'up' : 'down'} text-[7px] ml-0.5`}></i>
                     </button>
                     <div className="flex-1 h-px bg-gradient-to-l from-amber-300 to-orange-400"></div>
                   </div>
                   {showPremiumTemplates && <><div className="hidden md:block space-y-3">
                     {PREMIUM_TEMPLATES_LIST.map(t => {
                       const unlocked = isPremium;
                       const isActive = template === t.id;
                       return (
                         <button
                           key={t.id}
                           onClick={() => handleTemplateSelect(t.id as TemplateId)}
                           className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 group relative ${isActive && unlocked ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/20 shadow-sm' : 'border-slate-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700'}`}
                         >
                           <div className="relative w-16 h-[84px] shrink-0">
                             {/* Thumbnail nítido — visível sempre */}
                             <TemplateThumbnail template={t.id as TemplateId} className="w-full h-full" />
                             {/* Cadeado pequeno no canto superior direito */}
                             {!unlocked && (
                               <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white/95 dark:bg-slate-900/95 rounded flex items-center justify-center shadow-sm">
                                 <span className="text-[9px]">🔒</span>
                               </div>
                             )}
                           </div>
                           <div className="text-left flex-1 min-w-0">
                             <p className={`text-sm font-black uppercase truncate ${isActive && unlocked ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>{t.label}</p>
                             <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">{unlocked ? t.desc : 'Premium 👑'}</p>
                           </div>
                           {isActive && unlocked && <i className="fas fa-check text-amber-500 text-xs shrink-0"></i>}
                         </button>
                       );
                     })}
                   </div>
                   {/* Mobile: grid 2 colunas premium */}
                   <div className="md:hidden grid grid-cols-2 gap-3">
                     {PREMIUM_TEMPLATES_LIST.map(t => {
                       const unlocked = isPremium;
                       const isActive = template === t.id;
                       return (
                         <button
                           key={t.id}
                           onClick={() => handleTemplateSelect(t.id as TemplateId)}
                           className={`flex flex-col rounded-2xl border-2 overflow-hidden transition-all active:scale-95 relative ${isActive && unlocked ? 'border-amber-500 ring-2 ring-amber-200 dark:ring-amber-800' : 'border-slate-100 dark:border-slate-800'}`}
                         >
                           <div className="relative w-full h-[110px]">
                             <TemplateThumbnail template={t.id as TemplateId} className="w-full h-full" />
                             {!unlocked && (
                               <div className="absolute inset-0 bg-black/20 flex items-start justify-end p-1">
                                 <span className="text-[9px] bg-black/60 text-amber-300 px-1.5 py-0.5 rounded font-bold">🔒</span>
                               </div>
                             )}
                           </div>
                           <div className="p-2 text-left">
                             <p className={`text-[10px] font-black uppercase truncate ${isActive && unlocked ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>{t.label}</p>
                             <p className="text-[9px] text-slate-400">{unlocked ? '✓ Desbloqueado' : 'Premium 👑'}</p>
                           </div>
                         </button>
                       );
                     })}
                   </div>
                   </>}

                   {/* Badge de status premium na sidebar */}
                   {isPremium && premiumPlan !== 'lifetime' && daysLeft !== null && (
                     <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl px-3 py-2.5 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <span className="text-sm">⚡</span>
                         <span className="text-sm font-black text-blue-700 dark:text-blue-300">Premium ativo</span>
                       </div>
                       <span className={`text-[10px] font-black tabular-nums rounded-full px-2 py-0.5 ${
                         daysLeft <= 1
                           ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse'
                           : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                       }`}>
                         {daysLeft === 0 ? 'Expira hoje!' : `${daysLeft}d restantes`}
                       </span>
                     </div>
                   )}
                   {isPremium && premiumPlan === 'lifetime' && (
                     <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-3 py-2.5 flex items-center gap-2">
                       <span className="text-sm">👑</span>
                       <span className="text-sm font-black text-amber-700 dark:text-amber-400">Acesso Vitalício ativo</span>
                     </div>
                   )}
                   {premiumExpired && (
                     <button
                       onClick={() => { setPremiumModalTemplate(''); setIsPremiumModalOpen(true); }}
                       className="mt-4 w-full py-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 animate-pulse"
                     >
                       ⏰ Acesso expirou — Reativar
                     </button>
                   )}
                   {!isPremium && !premiumExpired && (
                     <button onClick={() => { setPremiumModalTemplate(''); setIsPremiumModalOpen(true); }} className="mt-4 w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2">
                       🔓 Desbloquear — a partir de R$ 9,90
                     </button>
                   )}
                 </div>
              </section>
              <section className="pt-4 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                     <span className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Modo Escuro</span>
                     <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-14 h-7 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                       <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isDarkMode ? 'translate-x-7' : ''}`}></div>
                     </button>
                  </div>
              </section>
              <div className="pt-8 space-y-3">
                 <button onClick={handleClearData} className="w-full py-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl text-sm font-black uppercase tracking-wide hover:bg-red-200 dark:hover:bg-red-900/50 transition-all border-2 border-red-200 dark:border-red-800/50 flex items-center justify-center gap-2">
                   <i className="fas fa-trash-alt text-sm"></i> Apagar tudo e recomeçar
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}