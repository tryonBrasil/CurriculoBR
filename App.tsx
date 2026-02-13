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
];

const TEMPLATES = [
  { id: 'modern_blue', label: 'Modern Blue' },
  { id: 'executive_navy', label: 'Executive Navy' },
  { id: 'modern_vitae', label: 'Modern Vitae' },
];

export default function App() {
  const [view, setView] = useState<'home' | 'templates' | 'editor'>('home');
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [template, setTemplate] = useState<TemplateId>('modern_blue');
  const [currentStep, setCurrentStep] = useState(0);
  const [previewScale, setPreviewScale] = useState(0.55);
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState<string>("'Inter', sans-serif");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  
  const { data, updateData } = useResumeHistory(INITIAL_RESUME_DATA);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const activeTab = STEPS[currentStep]?.id || 'info';

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  if (view === 'home') {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-6xl font-black mb-4 dark:text-white italic">Curriculo<span className="text-blue-600">BR</span></h1>
        <button onClick={() => setView('templates')} className="bg-blue-600 text-white px-12 py-4 rounded-full font-bold uppercase shadow-2xl hover:scale-105 transition-all">
          Começar
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <nav className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 bg-white dark:bg-slate-900 z-50">
        <div className="font-black text-xl dark:text-white italic cursor-pointer" onClick={() => setView('home')}>
          Curriculo<span className="text-blue-600">BR</span>
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-400">
             <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
          <button onClick={() => exportToDocx(data)} className="bg-slate-100 dark:bg-slate-800 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold">WORD</button>
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold">PDF</button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 overflow-y-auto p-8 lg:p-12 ${mobileView === 'editor' ? 'block' : 'hidden md:block'}`}>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-black mb-8 uppercase dark:text-white">{STEPS[currentStep].label}</h2>
            
            <div className="space-y-6">
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 gap-4">
                  <Input label="Nome Completo" value={data.fullName} onChange={(val) => updateData({...data, fullName: val})} />
                  <Input label="E-mail" value={data.email} onChange={(val) => updateData({...data, email: val})} />
                  <Input label="Telefone" value={data.phone} onChange={(val) => updateData({...data, phone: val})} />
                </div>
              )}

              {activeTab === 'summary' && (
                <div className="space-y-4">
                  {/* CORREÇÃO: Removido isTextArea para evitar erro TS2322 */}
                  <Input 
                    label="Resumo Profissional" 
                    value={data.summary || ''} 
                    onChange={(val) => updateData({...data, summary: val})} 
                  />
                </div>
              )}
            </div>

            <div className="mt-12 flex justify-between pt-8 border-t dark:border-slate-800">
              <button disabled={currentStep === 0} onClick={() => setCurrentStep(prev => prev - 1)} className="text-slate-400 font-bold uppercase text-xs">Anterior</button>
              <button onClick={() => currentStep < STEPS.length - 1 ? setCurrentStep(prev => prev + 1) : window.print()} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs">
                {currentStep === STEPS.length - 1 ? 'Finalizar' : 'Próximo'}
              </button>
            </div>
          </div>
        </div>

        <div className={`flex-1 bg-slate-100 dark:bg-slate-950 items-center justify-center p-4 ${mobileView === 'preview' ? 'flex' : 'hidden md:flex'}`}>
           <div className="origin-top shadow-2xl bg-white" style={{ transform: `scale(${previewScale})` }}>
              <ResumePreview data={data} template={template} fontSize={fontSize} fontFamily={fontFamily} />
           </div>
        </div>
      </div>
      
      {/* Botões Mobile */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 shadow-2xl rounded-full p-1 flex z-50 border dark:border-slate-700">
        <button onClick={() => setMobileView('editor')} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase ${mobileView === 'editor' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Editar</button>
        <button onClick={() => setMobileView('preview')} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase ${mobileView === 'preview' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Ver</button>
      </div>
    </div>
  );
}
