import React, { useState, useEffect, useRef } from 'react';
import { ResumeData, TemplateId } from './types';
import { INITIAL_RESUME_DATA } from './constants';
import Input from './components/Input';
import ResumePreview from './components/ResumePreview';
import Toast from './components/Toast';
import { useResumeHistory } from './hooks/useResumeHistory';
import { exportToDocx } from './services/exportService';

// 1. Garante que a lista de templates existe e está acessível
const TEMPLATES = [
  { id: 'modern_blue', label: 'Modern Blue', desc: 'Profissional e Limpo' },
  { id: 'executive_navy', label: 'Executive Navy', desc: 'Premium e Luxuoso' },
  { id: 'modern_vitae', label: 'Modern Vitae', desc: 'Elegante e Espaçoso' },
  { id: 'classic_serif', label: 'Classic Serif', desc: 'Tradicional Acadêmico' },
  { id: 'swiss_minimal', label: 'Swiss Minimal', desc: 'Design Suíço' }
];

const STEPS = [
  { id: 'info', label: 'Dados', icon: 'fa-id-card' },
  { id: 'experience', label: 'Experiência', icon: 'fa-briefcase' },
  { id: 'education', label: 'Educação', icon: 'fa-graduation-cap' },
  { id: 'summary', label: 'Resumo', icon: 'fa-align-left' },
];

export default function App() {
  const [view, setView] = useState<'home' | 'templates' | 'editor'>('home');
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [template, setTemplate] = useState<TemplateId>('modern_blue');
  const [currentStep, setCurrentStep] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  
  const { data, updateData } = useResumeHistory(INITIAL_RESUME_DATA);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Define a aba ativa baseada no step atual
  const activeTab = STEPS[currentStep]?.id || 'info';

  // --- VIEW: HOME ---
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6">
        <h1 className="text-6xl font-black mb-8 dark:text-white uppercase italic">Curriculo<span className="text-blue-600">BR</span></h1>
        <button 
          onClick={() => setView('templates')} 
          className="bg-blue-600 text-white px-12 py-4 rounded-full font-bold uppercase shadow-2xl hover:scale-105 transition-all"
        >
          Começar Agora
        </button>
      </div>
    );
  }

  // --- VIEW: SELEÇÃO DE TEMPLATES (CORRIGIDO) ---
  if (view === 'templates') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-12">
            <h2 className="text-3xl font-black dark:text-white uppercase">Escolha um <span className="text-blue-600">Modelo</span></h2>
            <p className="text-slate-500 mt-2">Selecione o design base para o seu currículo</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {TEMPLATES.map((t) => (
              <div 
                key={t.id} 
                onClick={() => { setTemplate(t.id as TemplateId); setView('editor'); }}
                className="group cursor-pointer bg-white dark:bg-slate-800 p-4 rounded-[2rem] border-2 border-transparent hover:border-blue-600 transition-all shadow-lg hover:shadow-2xl"
              >
                <div className="aspect-[210/297] bg-slate-100 dark:bg-slate-700 rounded-2xl mb-4 flex items-center justify-center overflow-hidden">
                   {/* Fallback visual caso não tenha imagem */}
                   <span className="text-slate-400 font-bold text-xs uppercase opacity-50">Preview {t.label}</span>
                </div>
                <h3 className="font-bold text-center dark:text-white">{t.label}</h3>
                <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest mt-1">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: EDITOR ---
  return (
    <div className={`h-screen flex flex-col ${isDarkMode ? 'dark' : ''} bg-white dark:bg-slate-950 overflow-hidden`}>
      <nav className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 bg-white dark:bg-slate-900 z-50">
        <div className="font-black text-xl dark:text-white italic cursor-pointer" onClick={() => setView('home')}>
          Curriculo<span className="text-blue-600">BR</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => exportToDocx(data)} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-slate-200 transition-colors">DOCX</button>
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase shadow-lg">PDF</button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Formulário */}
        <div className={`flex-1 overflow-y-auto p-8 lg:p-12 ${mobileView === 'editor' ? 'block' : 'hidden md:block'}`}>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-black mb-8 uppercase dark:text-white italic">{STEPS[currentStep].label}</h2>
            
            <div className="space-y-6">
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 gap-4">
                  <Input label="Nome Completo" value={data.fullName || ''} onChange={(val) => updateData({...data, fullName: val})} />
                  <Input label="E-mail" value={data.email || ''} onChange={(val) => updateData({...data, email: val})} />
                  <Input label="Telefone" value={data.phone || ''} onChange={(val) => updateData({...data, phone: val})} />
                </div>
              )}
              {activeTab === 'summary' && (
                <Input label="Resumo" value={data.summary || ''} onChange={(val) => updateData({...data, summary: val})} />
              )}
            </div>

            <div className="mt-12 flex justify-between items-center border-t dark:border-slate-800 pt-8">
              <button disabled={currentStep === 0} onClick={() => setCurrentStep(prev => prev - 1)} className="text-slate-400 font-bold uppercase text-xs disabled:opacity-0">Anterior</button>
              <button onClick={() => currentStep < STEPS.length - 1 ? setCurrentStep(prev => prev + 1) : window.print()} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs">
                {currentStep === STEPS.length - 1 ? 'Finalizar' : 'Próximo'}
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className={`flex-1 bg-slate-100 dark:bg-slate-950 items-center justify-center p-4 ${mobileView === 'preview' ? 'flex' : 'hidden md:flex'}`}>
           <div className="origin-top shadow-2xl bg-white" style={{ transform: 'scale(0.6)' }}>
              <ResumePreview data={data} template={template} fontSize={12} fontFamily="'Inter', sans-serif" />
           </div>
        </div>
      </div>
    </div>
  );
}
