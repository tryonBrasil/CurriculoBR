
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ResumeData, TemplateId, Experience, Education, Skill, Language, Course, SectionId } from './types';
import { INITIAL_RESUME_DATA, MOCK_RESUME_DATA } from './constants';
import Input from './components/Input';
import ResumePreview from './components/ResumePreview';
import PhotoCropModal from './components/PhotoCropModal';
import { enhanceText, generateSummary, suggestSkills } from './services/geminiService';

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

const TemplateThumbnail: React.FC<{ template: TemplateId }> = ({ template }) => {
  const [scale, setScale] = useState(0.08);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const s = containerRef.current.clientWidth / 794;
        if (s > 0) setScale(s);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={containerRef} className="w-20 h-24 overflow-hidden bg-white border border-slate-200 rounded-lg relative shrink-0 shadow-sm group-hover:border-blue-400 transition-colors">
      <div className="origin-top-left absolute top-0 left-0 pointer-events-none" style={{ transform: `scale(${scale})`, width: '210mm', height: '297mm' }}>
        <ResumePreview data={MOCK_RESUME_DATA} template={template} fontSize={12} />
      </div>
      <div className="absolute inset-0 bg-transparent z-10"></div>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'editor'>('home');
  const [data, setData] = useState<ResumeData>(INITIAL_RESUME_DATA);
  const [template, setTemplate] = useState<TemplateId>('modern_blue');
  const [currentStep, setCurrentStep] = useState(0);
  const [previewScale, setPreviewScale] = useState(0.55);
  const [fontSize, setFontSize] = useState(12);
  const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [highlightedStep, setHighlightedStep] = useState<string | null>(null);
  
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.data) setData(parsed.data);
        if (parsed.template) setTemplate(parsed.template);
        if (parsed.fontSize) setFontSize(parsed.fontSize);
        setView('editor');
      } catch (e) {
        console.error("Erro ao carregar dados salvos:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (view === 'editor') {
      const stateToSave = {
        data,
        template,
        fontSize
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [data, template, fontSize, view]);

  const handleClearData = () => {
    if (window.confirm("Tem certeza que deseja apagar todos os dados e começar do zero?")) {
      setData(INITIAL_RESUME_DATA);
      setTemplate('modern_blue');
      setFontSize(12);
      localStorage.removeItem(STORAGE_KEY);
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

  const updatePersonalInfo = (field: keyof ResumeData['personalInfo'], value: string) => {
    setData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }));
  };

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
  };

  const addItem = (listName: 'experiences' | 'education' | 'skills' | 'languages' | 'courses') => {
    const id = Math.random().toString(36).substr(2, 9);
    if (listName === 'experiences') {
      const newItem: Experience = { id, company: '', position: '', location: '', startDate: '', endDate: '', current: false, description: '' };
      setData(prev => ({ ...prev, experiences: [newItem, ...(prev.experiences || [])] }));
    } else if (listName === 'education') {
      const newItem: Education = { id, institution: '', degree: '', field: '', location: '', startDate: '', endDate: '' };
      setData(prev => ({ ...prev, education: [newItem, ...(prev.education || [])] }));
    } else if (listName === 'skills') {
      const newItem: Skill = { id, name: '', level: 'Intermediate' };
      setData(prev => ({ ...prev, skills: [...(prev.skills || []), newItem] }));
    } else if (listName === 'languages') {
      const newItem: Language = { id, name: '', level: '', percentage: 60 };
      setData(prev => ({ ...prev, languages: [...(prev.languages || []), newItem] }));
    } else if (listName === 'courses') {
      const newItem: Course = { id, name: '', institution: '', year: '' };
      setData(prev => ({ ...prev, courses: [...(prev.courses || []), newItem] }));
    }
  };

  const removeItem = (listName: 'experiences' | 'education' | 'skills' | 'languages' | 'courses', id: string) => {
    setData(prev => ({
      ...prev,
      [listName]: (prev[listName] as any[]).filter(item => item.id !== id)
    }));
  };

  const updateItem = (listName: 'experiences' | 'education' | 'skills' | 'languages' | 'courses', id: string, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      [listName]: (prev[listName] as any[]).map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleEnhance = async (text: string, context: string, listName?: any, id?: string) => {
    if (!text || isEnhancing) return;
    setIsEnhancing(id || context);
    try {
      const enhanced = await enhanceText(text, context);
      if (listName && id) {
        updateItem(listName, id, 'description', enhanced);
      } else if (context === 'summary') {
        setData(prev => ({ ...prev, summary: enhanced }));
      }
    } catch (err) {
      console.error(err);
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
      setData(prev => ({ ...prev, summary: generated }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsEnhancing(null);
    }
  };

  const handleSectionClick = (sectionId: string) => {
    const index = STEPS.findIndex(step => step.id === sectionId);
    if (index !== -1) {
      setCurrentStep(index);
      setHighlightedStep(sectionId);
      setTimeout(() => setHighlightedStep(null), 1500);
      if (editorScrollRef.current) {
        editorScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const resetZoom = () => {
    if (!previewContainerRef.current) return;
    const containerHeight = previewContainerRef.current.clientHeight;
    const containerWidth = previewContainerRef.current.clientWidth;
    const scaleY = (containerHeight - 140) / 1123;
    const scaleX = (containerWidth - 100) / 794; 
    const bestScale = Math.min(scaleX, scaleY);
    setPreviewScale(Math.min(1.0, Math.max(0.3, bestScale)));
  };

  useEffect(() => {
    if (view === 'editor') {
      resetZoom();
      const timer = setTimeout(resetZoom, 400);
      window.addEventListener('resize', resetZoom);
      return () => {
        window.removeEventListener('resize', resetZoom);
        clearTimeout(timer);
      };
    }
  }, [view, isSidebarOpen]);

  if (view === 'home') {
    return (
      <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] aspect-square bg-blue-50 rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] aspect-square bg-indigo-50 rounded-full blur-[120px] opacity-60"></div>
        <header className="relative z-10 h-24 flex items-center justify-between px-8 md:px-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
               <i className="fas fa-file-invoice text-lg"></i>
            </div>
            <h1 className="font-black text-2xl tracking-tighter text-slate-800 uppercase italic">Curriculo<span className="text-blue-600">BR</span></h1>
          </div>
          <button onClick={() => { setData(MOCK_RESUME_DATA); setView('editor'); }} className="hidden md:block text-xs font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">Ver Exemplo</button>
        </header>
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-24 text-center">
          <div className="max-w-5xl w-full space-y-8">
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
              <span className="inline-block py-2 px-4 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">Profissional & Elegante</span>
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-none">Seu currículo perfeito, <br className="hidden md:block"/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 italic">simples e direto.</span></h2>
              <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">Design de alto nível para destacar suas habilidades. Construído para profissionais que buscam o próximo nível na carreira.</p>
            </div>
            <div className="flex items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <button onClick={() => { setData(INITIAL_RESUME_DATA); setView('editor'); }} className="group bg-slate-900 text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 hover:scale-[1.05] transition-all shadow-2xl flex items-center gap-3">Criar Meu Currículo <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i></button>
            </div>
            <div className="pt-20 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 animate-in fade-in duration-1000 delay-500 px-4">
              {TEMPLATES.slice(0, 5).map(t => (
                <div key={t.id} className="group relative cursor-pointer" onClick={() => { setTemplate(t.id as TemplateId); setView('editor'); }}>
                  <div className="w-full aspect-[3/4] rounded-2xl shadow-lg group-hover:-translate-y-2 transition-transform duration-500 overflow-hidden border border-slate-100 relative">
                    <div className="absolute inset-0 scale-[0.35] origin-top-left">
                       <ResumePreview data={MOCK_RESUME_DATA} template={t.id as TemplateId} fontSize={12} />
                    </div>
                  </div>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">{t.label}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
        <footer className="relative z-10 py-12 border-t border-slate-50 flex flex-col items-center gap-4">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.5em]">Gerador de Currículos CurriculoBR</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {isCropModalOpen && tempImage && (
        <PhotoCropModal imageSrc={tempImage} onConfirm={handleCropConfirm} onCancel={() => { setIsCropModalOpen(false); setTempImage(null); }} />
      )}
      <nav className="no-print h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 z-50 shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg"><i className="fas fa-file-invoice text-sm"></i></div>
          <h1 className="font-extrabold text-xl tracking-tighter text-slate-800 uppercase italic">Curriculo<span className="text-blue-600">BR</span></h1>
        </div>
        <div className="hidden lg:flex items-center gap-8">
           <div className="flex items-center gap-3">
              <div className="w-32 h-1.5 bg-slate-100 rounded-full"><div className={`h-full rounded-full transition-all duration-1000 ${cvScore > 70 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${cvScore}%` }}></div></div>
              <span className="text-xs font-black text-slate-700 tracking-tighter">{cvScore}% Completo</span>
           </div>
           <div className="flex gap-4">
             <button onClick={() => setView('home')} className="px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">Voltar</button>
             <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg">
               <i className="fas fa-download"></i> Baixar PDF
             </button>
           </div>
        </div>
      </nav>
      <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
        <div className="no-print w-full md:w-[420px] flex flex-col border-r border-slate-100 bg-white z-40 shrink-0 shadow-xl">
           <div className="flex overflow-x-auto border-b border-slate-50 shrink-0 custom-scrollbar bg-slate-50/50">
             {STEPS.map((step, idx) => (
               <button key={step.id} onClick={() => setCurrentStep(idx)} className={`flex-1 min-w-[100px] py-5 flex flex-col items-center gap-2 transition-all relative px-2 shrink-0 ${currentStep === idx ? 'text-blue-600 bg-white shadow-inner' : 'text-slate-400 grayscale hover:bg-white/50'}`}>
                 <i className={`fas ${step.icon} text-[14px]`}></i>
                 <span className="text-[9px] font-black uppercase tracking-[0.1em] whitespace-nowrap">{step.label}</span>
                 {currentStep === idx && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>}
               </button>
             ))}
           </div>
           <div ref={editorScrollRef} className={`flex-1 overflow-y-auto custom-scrollbar p-6 transition-colors duration-500 ${highlightedStep ? 'bg-blue-50/30' : ''}`}>
              <div className={highlightedStep === activeTab ? 'section-highlight p-2' : ''}>
                {activeTab === 'info' && (
                  <div className="animate-in slide-in-from-bottom-2 duration-300">
                    <h2 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-tight">Informações Pessoais</h2>
                    <div className="mb-8 flex flex-col items-center">
                      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-slate-50 shadow-inner bg-slate-100 flex items-center justify-center">
                          {data.personalInfo.photoUrl ? <img src={data.personalInfo.photoUrl} className="w-full h-full object-cover" /> : <i className="fas fa-user text-3xl text-slate-300"></i>}
                        </div>
                        <div className="absolute inset-0 bg-blue-600/60 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase text-center p-2">Alterar Foto</div>
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                    <div className="space-y-4">
                      <Input label="Nome Completo" value={data.personalInfo.fullName} onChange={(v) => updatePersonalInfo('fullName', v)} placeholder="Ex: João da Silva" />
                      <Input label="Cargo Pretendido" value={data.personalInfo.jobTitle} onChange={(v) => updatePersonalInfo('jobTitle', v)} placeholder="Ex: Gerente de Vendas" />
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="E-mail" value={data.personalInfo.email} onChange={(v) => updatePersonalInfo('email', v)} placeholder="email@exemplo.com" />
                        <Input label="Telefone" value={data.personalInfo.phone} onChange={(v) => updatePersonalInfo('phone', v)} placeholder="(11) 99999-9999" />
                      </div>
                      <Input label="Localização" value={data.personalInfo.location} onChange={(v) => updatePersonalInfo('location', v)} placeholder="Cidade, Estado" />
                      <Input label="LinkedIn (URL)" value={data.personalInfo.linkedin} onChange={(v) => updatePersonalInfo('linkedin', v)} placeholder="linkedin.com/in/perfil" />
                      <Input label="Website / Portfólio" value={data.personalInfo.website} onChange={(v) => updatePersonalInfo('website', v)} placeholder="meusite.com" />
                    </div>
                  </div>
                )}
                {activeTab === 'experience' && (
                  <div className="animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Experiências</h2>
                      <button onClick={() => addItem('experiences')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase shadow-sm hover:bg-blue-700 transition-colors">+ Adicionar</button>
                    </div>
                    {data.experiences?.map(exp => (
                      <div key={exp.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 mb-6 relative group border-l-4 border-l-blue-400">
                        <button onClick={() => removeItem('experiences', exp.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
                        <Input label="Empresa" value={exp.company} onChange={(v) => updateItem('experiences', exp.id, 'company', v)} placeholder="Nome da empresa" />
                        <Input label="Cargo" value={exp.position} onChange={(v) => updateItem('experiences', exp.id, 'position', v)} placeholder="Seu cargo" />
                        <div className="grid grid-cols-2 gap-4">
                          <Input label="Início" value={exp.startDate} onChange={(v) => updateItem('experiences', exp.id, 'startDate', v)} placeholder="MM/AAAA" />
                          <Input label="Fim" value={exp.endDate} onChange={(v) => updateItem('experiences', exp.id, 'endDate', v)} placeholder="MM/AAAA ou 'Atual'" />
                        </div>
                        <div className="mt-2 relative">
                           <div className="flex justify-between items-center mb-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase">Descrição</label>
                             <button onClick={() => handleEnhance(exp.description, 'experiência', 'experiences', exp.id)} disabled={!exp.description || isEnhancing === exp.id} className="text-[9px] text-blue-600 font-black uppercase hover:text-blue-800 transition-colors"><i className={`fas ${isEnhancing === exp.id ? 'fa-circle-notch fa-spin' : 'fa-magic'}`}></i> IA</button>
                           </div>
                           <textarea className="w-full p-4 rounded-xl border text-sm h-32 outline-none focus:ring-1 focus:ring-blue-500 bg-white" value={exp.description} onChange={(e) => updateItem('experiences', exp.id, 'description', e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'education' && (
                  <div className="animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Educação</h2>
                      <button onClick={() => addItem('education')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase shadow-sm hover:bg-blue-700 transition-colors">+ Adicionar</button>
                    </div>
                    {data.education?.map(edu => (
                      <div key={edu.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 mb-6 relative group border-l-4 border-l-indigo-400">
                        <button onClick={() => removeItem('education', edu.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
                        <Input label="Instituição" value={edu.institution} onChange={(v) => updateItem('education', edu.id, 'institution', v)} placeholder="Ex: USP, Harvard..." />
                        <Input label="Curso / Formação" value={edu.degree} onChange={(v) => updateItem('education', edu.id, 'degree', v)} placeholder="Ex: Bacharelado em Design" />
                        <div className="grid grid-cols-2 gap-4">
                          <Input label="Início" value={edu.startDate} onChange={(v) => updateItem('education', edu.id, 'startDate', v)} placeholder="Ano" />
                          <Input label="Fim" value={edu.endDate} onChange={(v) => updateItem('education', edu.id, 'endDate', v)} placeholder="Ano" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'skills' && (
                  <div className="animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Habilidades</h2>
                      <button onClick={() => addItem('skills')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase shadow-sm hover:bg-blue-700 transition-colors">+ Adicionar</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {data.skills?.map(skill => (
                        <div key={skill.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                          <input className="flex-1 bg-transparent border-none text-[11px] font-bold outline-none" value={skill.name} onChange={(e) => updateItem('skills', skill.id, 'name', e.target.value)} placeholder="Habilidade..." />
                          <button onClick={() => removeItem('skills', skill.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><i className="fas fa-times"></i></button>
                        </div>
                      ))}
                    </div>
                    <button onClick={async () => {
                      if (!data.personalInfo.jobTitle) return;
                      setIsEnhancing('skills-suggest');
                      const suggested = await suggestSkills(data.personalInfo.jobTitle);
                      suggested.forEach(s => {
                         const id = Math.random().toString(36).substr(2, 9);
                         setData(prev => ({ ...prev, skills: [...prev.skills, { id, name: s, level: 'Intermediate' }] }));
                      });
                      setIsEnhancing(null);
                    }} disabled={isEnhancing === 'skills-suggest'} className="w-full py-4 border-2 border-dashed border-blue-100 rounded-2xl text-[10px] font-black text-blue-400 uppercase tracking-widest hover:bg-blue-50/50 transition-all">
                      <i className={`fas ${isEnhancing === 'skills-suggest' ? 'fa-circle-notch fa-spin' : 'fa-wand-magic-sparkles'} mr-2`}></i> Sugerir com IA
                    </button>
                  </div>
                )}
                {activeTab === 'extras' && (
                  <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-8">
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Idiomas</h2>
                        <button onClick={() => addItem('languages')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase shadow-sm hover:bg-blue-700 transition-colors">+ Novo Idioma</button>
                      </div>
                      {data.languages?.map(lang => (
                        <div key={lang.id} className="p-4 bg-slate-50 rounded-2xl mb-4 border border-slate-100">
                          <div className="flex justify-between items-center mb-2">
                             <input className="bg-transparent font-black text-xs outline-none" value={lang.name} onChange={(e) => updateItem('languages', lang.id, 'name', e.target.value)} placeholder="Ex: Inglês" />
                             <button onClick={() => removeItem('languages', lang.id)} className="text-slate-300 hover:text-red-500"><i className="fas fa-trash-alt text-[10px]"></i></button>
                          </div>
                          <div className="flex items-center gap-4">
                            <input className="bg-transparent text-[10px] italic outline-none flex-1" value={lang.level} onChange={(e) => updateItem('languages', lang.id, 'level', e.target.value)} placeholder="Nível (Avançado...)" />
                            <input type="range" className="w-24 h-1 bg-slate-200 accent-blue-600 appearance-none rounded-full" value={lang.percentage} onChange={(e) => updateItem('languages', lang.id, 'percentage', parseInt(e.target.value))} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Cursos Adicionais</h2>
                        <button onClick={() => addItem('courses')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase shadow-sm hover:bg-blue-700 transition-colors">+ Novo Curso</button>
                      </div>
                      {data.courses?.map(course => (
                        <div key={course.id} className="p-4 bg-slate-50 rounded-2xl mb-4 border border-slate-100 relative group">
                           <button onClick={() => removeItem('courses', course.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-[10px]"></i></button>
                           <Input label="Nome do Curso" value={course.name} onChange={(v) => updateItem('courses', course.id, 'name', v)} />
                           <div className="grid grid-cols-2 gap-4">
                             <Input label="Instituição" value={course.institution} onChange={(v) => updateItem('courses', course.id, 'institution', v)} />
                             <Input label="Ano" value={course.year} onChange={(v) => updateItem('courses', course.id, 'year', v)} />
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activeTab === 'summary' && (
                  <div className="animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Resumo Profissional</h2>
                      <button onClick={handleGenerateSummary} disabled={!data.personalInfo.jobTitle || isEnhancing === 'summary-gen'} className="text-[10px] font-black text-blue-600 uppercase hover:text-blue-800 transition-all flex items-center gap-2">
                        <i className={`fas ${isEnhancing === 'summary-gen' ? 'fa-circle-notch fa-spin' : 'fa-wand-magic'}`}></i> Gerar com IA
                      </button>
                    </div>
                    <div className="relative">
                       <textarea className="w-full p-6 bg-slate-50 rounded-3xl border border-slate-100 text-sm h-64 outline-none focus:ring-2 focus:ring-blue-500/20 resize-none leading-relaxed" value={data.summary} onChange={(e) => setData(prev => ({ ...prev, summary: e.target.value }))} placeholder="Escreva um pouco sobre você e suas principais conquistas..." />
                       <button onClick={() => handleEnhance(data.summary, 'resumo')} disabled={!data.summary || isEnhancing === 'summary'} className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-black text-slate-600 shadow-sm border border-slate-100 hover:text-blue-600">
                         <i className={`fas ${isEnhancing === 'summary' ? 'fa-circle-notch fa-spin' : 'fa-magic'} mr-1`}></i> Refinar
                       </button>
                    </div>
                  </div>
                )}
              </div>
           </div>
           <div className="p-6 border-t border-slate-50 flex items-center justify-between gap-4 shrink-0 no-print">
              <button onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))} className={`flex-1 py-4 font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all ${currentStep === 0 ? 'invisible' : ''}`}>Anterior</button>
              <button onClick={() => currentStep === STEPS.length - 1 ? window.print() : setCurrentStep(prev => prev + 1)} className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95">{currentStep === STEPS.length - 1 ? 'Baixar Currículo' : 'Próximo Passo'}</button>
           </div>
        </div>

        <div ref={previewContainerRef} className="flex-1 bg-[#f1f5f9] relative flex flex-col items-center justify-center overflow-hidden paper-texture transition-all duration-300">
           {/* Controles de Zoom Superior */}
           <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-200 z-[70] no-print">
              <button onClick={() => setPreviewScale(p => Math.max(0.3, p - 0.1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-all"><i className="fas fa-minus text-xs"></i></button>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">{Math.round(previewScale * 100)}%</span>
              <button onClick={() => setPreviewScale(p => Math.min(1.5, p + 0.1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-all"><i className="fas fa-plus text-xs"></i></button>
              <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
              <button onClick={resetZoom} className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-800 transition-all px-2">Reset</button>
           </div>

           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute bottom-6 right-6 no-print w-12 h-12 bg-white shadow-xl rounded-full flex items-center justify-center text-slate-600 hover:text-blue-600 z-[60] border border-slate-100 transition-transform active:scale-90" title={isSidebarOpen ? "Expandir" : "Configurar"}>
             <i className={`fas ${isSidebarOpen ? 'fa-expand' : 'fa-cog'}`}></i>
           </button>

           <div className="print-container transition-transform duration-300 ease-out flex items-center justify-center" style={{ transform: `scale(${previewScale})` }}>
              <div className="bg-white shadow-2xl ring-1 ring-slate-200">
                <ResumePreview 
                  data={data} 
                  template={template} 
                  fontSize={fontSize}
                  onSectionClick={handleSectionClick} 
                  onReorder={(newOrder) => setData(prev => ({ ...prev, sectionOrder: newOrder }))}
                />
              </div>
           </div>
        </div>

        <div className={`no-print border-l border-slate-100 bg-white flex flex-col shrink-0 z-40 no-print-sidebar transition-all duration-300 ease-in-out shadow-2xl overflow-hidden ${isSidebarOpen ? 'w-[320px] opacity-100' : 'w-0 opacity-0'}`}>
           <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><i className="fas fa-cog text-blue-600"></i> Configurações</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-300 hover:text-slate-600 transition-colors"><i className="fas fa-chevron-right text-xs"></i></button>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              {/* Ajuste de Fonte */}
              <section>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tamanho da Fonte</h3>
                    <span className="text-[10px] font-black text-blue-600">{fontSize}px</span>
                 </div>
                 <input 
                    type="range" min="8" max="16" step="0.5" 
                    value={fontSize} 
                    onChange={(e) => setFontSize(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                 />
              </section>

              <section>
                 <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Estilos</h3>
                 <div className="space-y-4">
                    {TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => setTemplate(t.id as TemplateId)} className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-4 group ${template === t.id ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-50 hover:border-slate-200'}`}>
                         <TemplateThumbnail template={t.id as TemplateId} />
                         <div className="text-left flex-1 min-w-0">
                           <p className={`text-[10px] font-black uppercase truncate ${template === t.id ? 'text-blue-700' : 'text-slate-700'}`}>{t.label}</p>
                           <p className="text-[8px] text-slate-400 font-bold uppercase truncate">{t.desc}</p>
                         </div>
                         {template === t.id && <i className="fas fa-check-circle text-blue-600 text-xs"></i>}
                      </button>
                    ))}
                 </div>
              </section>

              <section className="space-y-3 pb-8">
                 <button onClick={() => setData(MOCK_RESUME_DATA)} className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100/50">Restaurar Exemplo</button>
                 <button onClick={handleClearData} className="w-full py-4 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100/50">Limpar Dados</button>
              </section>
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;
