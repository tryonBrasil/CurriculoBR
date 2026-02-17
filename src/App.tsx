import React, { useState, useEffect, useCallback } from 'react';
// Importação de tipos ajustada
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
import { validateEmailError } from './services/validationService';

// 1. CORREÇÃO: Certifique-se que 'creative' existe no enum TemplateId em types.ts
const STEPS: { id: SectionId; label: string; icon: string }[] = [
  { id: 'info', label: 'Dados', icon: 'fa-id-card' },
  { id: 'experience', label: 'Experiência', icon: 'fa-briefcase' },
  { id: 'education', label: 'Educação', icon: 'fa-graduation-cap' },
  { id: 'skills', label: 'Habilidades', icon: 'fa-bolt' },
  { id: 'summary', label: 'Resumo', icon: 'fa-align-left' },
];

const TEMPLATES: { id: TemplateId; label: string; desc: string }[] = [
  { id: 'modern', label: 'Moderno', desc: 'Limpo' },
  { id: 'classic', label: 'Clássico', desc: 'Elegante' },
  { id: 'minimalist', label: 'Minimalista', desc: 'Foco' },
  // Se der erro aqui, adicione 'creative' ao type TemplateId no seu arquivo types.ts
  { id: 'creative' as TemplateId, label: 'Criativo', desc: 'Visual' }, 
];

export default function App() {
  const [data, setData] = useState<ResumeData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resume-data');
      return saved ? JSON.parse(saved) : INITIAL_RESUME_DATA;
    }
    return INITIAL_RESUME_DATA;
  });

  const [view, setView] = useState<'home' | 'templates' | 'editor' | 'privacy' | 'terms'>('home');
  // 2. CORREÇÃO: Cast para SectionId para evitar erro de atribuição
  const [activeStep, setActiveStep] = useState<SectionId>('info' as SectionId);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // 3. CORREÇÃO: O hook useResumeHistory retorna objetos específicos. 
  // Se ele não retorna addToHistory, usamos o updateData que ele gerencia.
  const history = useResumeHistory(data);

  useEffect(() => {
    localStorage.setItem('resume-data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const updateData = useCallback((newData: Partial<ResumeData>) => {
    setData(prev => {
      const updated = { ...prev, ...newData } as ResumeData;
      // 4. CORREÇÃO: Verifique se o seu hook tem essa função ou se ele faz o tracking automático
      if ('addToHistory' in history) (history as any).addToHistory(updated);
      return updated;
    });
  }, [history]);

  const handleClearData = () => {
    setData(INITIAL_RESUME_DATA);
    setIsClearing(false);
    setToast({ message: 'Dados limpos!', type: 'success' });
  };

  if (view === 'privacy' || view === 'terms') {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 p-10">
        <button onClick={() => setView('home')} className="mb-5 text-blue-600 font-bold uppercase text-xs">← Voltar</button>
        <h1 className="text-2xl font-black dark:text-white mb-4 uppercase">{view === 'privacy' ? 'Privacidade' : 'Termos'}</h1>
        <p className="dark:text-slate-400">Dados processados localmente.</p>
      </div>
    );
  }

  if (view === 'home') {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col">
        <header className="h-20 flex items-center justify-between px-10">
          <h1 className="font-black text-xl dark:text-white italic uppercase">Curriculo<span className="text-blue-600">BR</span></h1>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="dark:text-white"><i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i></button>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <h2 className="text-5xl font-black dark:text-white mb-6 italic uppercase">Crie seu currículo com <span className="text-blue-600">IA.</span></h2>
          <div className="flex gap-4">
            <button onClick={() => setView('templates')} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold uppercase text-sm">Começar</button>
            <button onClick={() => { setData(MOCK_RESUME_DATA); setView('editor'); }} className="bg-slate-100 dark:bg-slate-800 dark:text-white px-8 py-4 rounded-2xl font-bold uppercase text-sm">Exemplo</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col ${isDarkMode ? 'dark bg-slate-900' : 'bg-slate-50'}`}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {view === 'templates' ? (
        <div className="flex-1 p-10 overflow-y-auto">
          <button onClick={() => setView('home')} className="mb-10 text-blue-600 font-bold uppercase text-xs">← Voltar</button>
          <div className="grid grid-cols-4 gap-6">
            {TEMPLATES.map(t => (
              <div key={t.id} onClick={() => { updateData({ templateId: t.id } as any); setView('editor'); }} className="cursor-pointer">
                <div className="aspect-[3/4] bg-white rounded-3xl p-4 shadow-lg hover:border-blue-600 border-2 border-transparent">
                  {/* 5. CORREÇÃO: Removido o 'id' se o componente não o aceita */}
                  <TemplateThumbnail templateId={t.id} data={data} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-8 flex items-center justify-between">
            <h1 className="font-black text-sm dark:text-white uppercase italic">Curriculo<span className="text-blue-600">BR</span></h1>
            <div className="flex gap-4">
              <button onClick={() => setIsClearing(true)} className="text-[10px] font-bold uppercase text-red-500">Limpar</button>
              <button onClick={() => setView('templates')} className="text-[10px] font-bold uppercase text-blue-600">Templates</button>
            </div>
          </header>

          <div className="flex-1 flex overflow-hidden">
            <aside className="w-20 border-r dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center py-6 gap-6">
              {STEPS.map(step => (
                <button key={step.id} onClick={() => setActiveStep(step.id)} className={`flex flex-col items-center gap-1 ${activeStep === step.id ? 'text-blue-600' : 'text-slate-400'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeStep === step.id ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800'}`}>
                    <i className={`fas ${step.icon} text-xs`}></i>
                  </div>
                </button>
              ))}
            </aside>

            <main className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-900">
              <div className="max-w-xl mx-auto">
                <h2 className="text-xl font-black dark:text-white uppercase mb-6">{STEPS.find(s => s.id === activeStep)?.label}</h2>
                
                {/* 6. CORREÇÃO: Comparação de SectionId e uso de fullName em vez de name */}
                {activeStep === ('info' as SectionId) && (
                  <div className="grid grid-cols-1 gap-4">
                    <Input 
                      label="Nome" 
                      value={data.personalInfo.fullName} 
                      onChange={(v) => updateData({ personalInfo: { ...data.personalInfo, fullName: v } })} 
                    />
                    <Input 
                      label="E-mail" 
                      value={data.personalInfo.email} 
                      error={validateEmailError(data.personalInfo.email)} 
                      onChange={(v) => updateData({ personalInfo: { ...data.personalInfo, email: v } })} 
                    />
                  </div>
                )}
                <div className="mt-10"><AdUnit slotId="1234567890" format="horizontal" /></div>
              </div>
            </main>

            <section className="flex-1 bg-slate-100 dark:bg-slate-800 p-10 justify-center overflow-y-auto hidden lg:flex">
              <div className="w-full max-w-[210mm] shadow-2xl bg-white">
                {/* 7. CORREÇÃO: Verifique se templateId existe no ResumeData ou use data.templateId */}
                <ResumePreview data={data} template={(data as any).templateId || 'modern'} />
              </div>
            </section>
          </div>
        </div>
      )}

      {/* 8. CORREÇÃO: Verifique o nome da prop no ConfirmModal (onCancel ou onClose) */}
      <ConfirmModal 
        isOpen={isClearing} 
        onClose={() => setIsClearing(false)} 
        onConfirm={handleClearData} 
        title="Limpar" 
        message="Apagar?" 
      />
    </div>
  );
}
