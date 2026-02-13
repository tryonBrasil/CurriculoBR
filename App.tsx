import React, { useState, useEffect, useRef } from 'react';
import { ResumeData, TemplateId } from './types';
import { INITIAL_RESUME_DATA } from './constants';
import Input from './components/Input';
import ResumePreview from './components/ResumePreview';
import { useResumeHistory } from './hooks/useResumeHistory';
import { exportToDocx } from './services/exportService';

const STEPS = [
  { id: 'info', label: 'Dados Pessoais' },
  { id: 'experience', label: 'Experiência' },
  { id: 'education', label: 'Educação' },
  { id: 'summary', label: 'Resumo' },
];

const TEMPLATES = [
  { id: 'modern_blue', label: 'Modern Blue' },
  { id: 'executive_navy', label: 'Executive Navy' },
  { id: 'modern_vitae', label: 'Modern Vitae' }
];

export default function App() {
  const [view, setView] = useState<'home' | 'templates' | 'editor'>('home');
  const [template, setTemplate] = useState<TemplateId>('modern_blue');
  const [currentStep, setCurrentStep] = useState(0);
  const { data, updateData } = useResumeHistory(INITIAL_RESUME_DATA);

  // CORREÇÃO: Define a aba ativa dinamicamente
  const activeTab = STEPS[currentStep]?.id || 'info';

  if (view === 'home') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900">
        <h1 className="text-5xl font-black mb-6 dark:text-white italic">Curriculo<span className="text-blue-600">BR</span></h1>
        <button onClick={() => setView('templates')} className="bg-blue-600 text-white px-10 py-4 rounded-full font-bold uppercase shadow-xl hover:scale-105 transition-all">
          Criar Novo Currículo
        </button>
      </div>
    );
  }

  if (view === 'templates') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black mb-12 dark:text-white text-center uppercase">Escolha um <span className="text-blue-600">Modelo</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TEMPLATES.map((t) => (
              <div 
                key={t.id} 
                onClick={() => { setTemplate(t.id as TemplateId); setView('editor'); }}
                className="cursor-pointer bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border-4 border-transparent hover:border-blue-600 transition-all"
              >
                <div className="aspect-[210/297] bg-slate-200 dark:bg-slate-700 rounded-xl mb-4 flex items-center justify-center">
                   <span className="text-slate-400 font-bold text-xs uppercase">Preview {t.label}</span>
                </div>
                <h3 className="font-bold text-center dark:text-white">{t.label}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
      <nav className="h-16 border-b flex items-center justify-between px-8 bg-white dark:bg-slate-900">
        <div className="font-black text-xl dark:text-white italic cursor-pointer" onClick={() => setView('home')}>
          Curriculo<span className="text-blue-600">BR</span>
        </div>
        <button onClick={() => exportToDocx(data)} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase">Exportar Word</button>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-12">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-black mb-8 uppercase dark:text-white text-blue-600">{STEPS[currentStep].label}</h2>
            
            {/* CORREÇÃO: Removido isTextArea para evitar erro TS2322 */}
            {activeTab === 'info' && (
              <div className="space-y-4">
                <Input label="Nome Completo" value={data.fullName || ''} onChange={(val) => updateData({...data, fullName: val})} />
                <Input label="E-mail" value={data.email || ''} onChange={(val) => updateData({...data, email: val})} />
                <Input label="Telefone" value={data.phone || ''} onChange={(val) => updateData({...data, phone: val})} />
              </div>
            )}

            {activeTab === 'summary' && (
              <textarea 
                className="w-full p-4 rounded-xl border-2 dark:bg-slate-800 dark:text-white min-h-[150px] outline-none focus:border-blue-600"
                value={data.summary || ''}
                onChange={(e) => updateData({...data, summary: e.target.value})}
                placeholder="Escreva seu resumo profissional..."
              />
            )}

            <div className="mt-8 flex justify-between">
              <button disabled={currentStep === 0} onClick={() => setCurrentStep(s => s - 1)} className="text-slate-400 font-bold uppercase text-xs">Anterior</button>
              <button onClick={() => currentStep < STEPS.length - 1 ? setCurrentStep(s => s + 1) : window.print()} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs">
                {currentStep === STEPS.length - 1 ? 'Finalizar' : 'Próximo'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="origin-top shadow-2xl bg-white" style={{ transform: 'scale(0.6)' }}>
            <ResumePreview data={data} template={template} fontSize={12} fontFamily="'Inter', sans-serif" />
          </div>
        </div>
      </div>
    </div>
  );
}
