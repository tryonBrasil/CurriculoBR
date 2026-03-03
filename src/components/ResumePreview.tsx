
import React, { useState } from 'react';
import { ResumeData, TemplateId, SectionId } from '../types';

interface Props {
  data: ResumeData;
  template: TemplateId;
  onSectionClick?: (sectionId: string) => void;
  onReorder?: (newOrder: SectionId[]) => void;
  fontSize?: number;
}

const ResumePreview: React.FC<Props> = ({ data, template, onSectionClick, onReorder, fontSize = 12 }) => {
  const { personalInfo, summary, experiences, education, skills, languages, courses, projects = [], sectionOrder } = data;
  const [draggedSection, setDraggedSection] = useState<SectionId | null>(null);
  const [dragOverSection, setDragOverSection] = useState<SectionId | null>(null);

  const handleDragStart = (e: React.DragEvent, id: SectionId) => {
    setDraggedSection(id);
    // Define o efeito de movimento e anexa um elemento "fantasma" se necessário, 
    // mas o navegador geralmente lida com a imagem do drag automaticamente.
    e.dataTransfer.effectAllowed = 'move';
    // Oculta a imagem fantasma padrão se quisermos customizar (opcional), 
    // por enquanto deixamos o padrão do navegador.
  };

  const handleDragOver = (e: React.DragEvent, id: SectionId) => {
    e.preventDefault(); // Necessário para permitir o drop
    if (draggedSection && draggedSection !== id) {
      setDragOverSection(id);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Opcional: limpar o dragOver se sair da área, mas o handleDrop/End cuida disso.
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
    setDragOverSection(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: SectionId) => {
    e.preventDefault();
    setDragOverSection(null);
    if (!draggedSection || draggedSection === targetId) return;

    const newOrder = [...sectionOrder];
    const draggedIdx = newOrder.indexOf(draggedSection);
    const targetIdx = newOrder.indexOf(targetId);

    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedSection);

    onReorder?.(newOrder);
    setDraggedSection(null);
  };

  const sectionWrapperStyle = (id: SectionId) => {
    const isDragged = draggedSection === id;
    const isDragOver = dragOverSection === id;
    const isDraggingSomething = draggedSection !== null;

    // Base classes
    let classes = "relative group/section transition-all duration-200 rounded-lg cursor-pointer mb-1 ";

    if (isDragged) {
      // Estado: Sendo arrastado (Placeholder visual)
      // Aumentamos a opacidade de 20 para 40 para ficar mais visível
      classes += "opacity-40 scale-[0.98] border-2 border-dashed border-slate-300 bg-slate-50 grayscale ";
    } else if (isDragOver) {
      // Estado: Alvo do Drop (Destino)
      // Destaque forte com borda azul tracejada e fundo azulado
      classes += "scale-[1.02] border-2 border-dashed border-blue-500 bg-blue-50/50 shadow-lg z-10 py-2 ";
    } else {
      // Estado: Normal
      classes += "opacity-100 border border-transparent ";
      
      if (isDraggingSomething) {
        // Se estamos arrastando algo, os outros itens mostram que podem ser alvos
        classes += "hover:border-blue-300 hover:border-dashed hover:bg-slate-50/50 ";
      } else {
        // Hover normal de edição
        classes += "hover:bg-blue-50/10 hover:ring-1 hover:ring-blue-400/20 ";
      }
    }

    return classes + " p-2"; // Padding padrão
  };

  const DragHandle = ({ id }: { id: SectionId }) => (
    <div 
      draggable
      onDragStart={(e) => handleDragStart(e, id)}
      onDragEnd={handleDragEnd}
      className="no-print absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-10 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/section:opacity-100 transition-opacity bg-white hover:bg-slate-50 rounded-md shadow-sm border border-slate-200 z-20 hover:scale-110 duration-200"
      title="Arrastar para reordenar"
    >
      <i className="fas fa-grip-vertical text-slate-400 text-xs"></i>
    </div>
  );

  const ContactItem = ({ icon, text, dark = false }: { icon: string, text: string | undefined, dark?: boolean }) => {
    if (!text) return null;
    return (
      <div className={`flex items-center gap-2 text-[0.85em] font-semibold ${dark ? 'text-slate-800' : 'text-white'}`}>
        <i className={`fas ${icon} w-3.5 text-center ${dark ? 'text-blue-700' : 'text-[#d4af37]'}`}></i>
        <span className="truncate">{text}</span>
      </div>
    );
  };

  const renderSectionContent = (id: SectionId) => {
    const isModernBlue = template === 'modern_blue';
    const isExecutiveRed = template === 'executive_red';
    
    switch (id) {
      case 'summary':
        if (!summary) return null;
        return (
          <div key={id} className={sectionWrapperStyle(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={(e) => handleDrop(e, id)} onClick={() => onSectionClick?.('summary')}>
            <DragHandle id={id} />
            <h2 className={`font-bold uppercase tracking-widest mb-2 ${isModernBlue ? 'text-blue-900 border-b-2 border-blue-100' : isExecutiveRed ? 'text-[#800000] border-b border-red-100 pb-1' : 'text-slate-900'} text-[1em]`}>Perfil</h2>
            <p className="text-[0.9em] text-slate-800 leading-relaxed text-justify font-medium">{summary}</p>
          </div>
        );
      case 'experience':
        if (experiences.length === 0) return null;
        return (
          <div key={id} className={sectionWrapperStyle(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={(e) => handleDrop(e, id)} onClick={() => onSectionClick?.('experience')}>
            <DragHandle id={id} />
            <h2 className={`font-bold uppercase tracking-widest mb-4 ${isModernBlue ? 'text-blue-900 border-b-2 border-blue-100' : isExecutiveRed ? 'text-[#800000] border-b border-red-100 pb-1' : 'text-slate-900'} text-[1em]`}>Experiência</h2>
            <div className="space-y-6">
              {experiences.map(exp => (
                <div key={exp.id}>
                  <div className="flex justify-between font-bold text-slate-900 text-[0.95em] items-baseline">
                    <h3 className="text-slate-950">{exp.position}</h3>
                    <span className="text-[0.85em] text-slate-700 font-semibold whitespace-nowrap ml-4">{exp.startDate} - {exp.endDate}</span>
                  </div>
                  <p className={`text-[0.9em] font-bold ${isExecutiveRed ? 'text-[#800000]' : 'text-blue-700'}`}>{exp.company}</p>
                  <p className="text-[0.9em] text-slate-700 mt-2 leading-relaxed whitespace-pre-wrap font-medium">{exp.description}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'education':
        if (education.length === 0) return null;
        return (
          <div key={id} className={sectionWrapperStyle(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={(e) => handleDrop(e, id)} onClick={() => onSectionClick?.('education')}>
            <DragHandle id={id} />
            <h2 className={`font-bold uppercase tracking-widest mb-4 ${isModernBlue ? 'text-blue-900 border-b-2 border-blue-100' : isExecutiveRed ? 'text-[#800000] border-b border-red-100 pb-1' : 'text-slate-900'} text-[1em]`}>Educação</h2>
            <div className="space-y-4">
              {education.map(edu => (
                <div key={edu.id}>
                  <h4 className="font-bold text-slate-950 text-[0.95em]">{edu.institution}</h4>
                  <p className="text-[0.9em] text-slate-800 font-medium">{edu.degree}</p>
                  <p className="text-[0.85em] text-slate-600 font-semibold">{edu.startDate} - {edu.endDate}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'skills':
        if (skills.length === 0) return null;
        return (
          <div key={id} className={sectionWrapperStyle(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={(e) => handleDrop(e, id)} onClick={() => onSectionClick?.('skills')}>
            <DragHandle id={id} />
            <h2 className={`font-bold uppercase tracking-widest mb-4 ${isModernBlue ? 'text-blue-900 border-b-2 border-blue-100' : isExecutiveRed ? 'text-[#800000] border-b border-red-100 pb-1' : 'text-slate-900'} text-[1em]`}>Habilidades</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map(s => <span key={s.id} className="bg-slate-100 border border-slate-300 text-slate-900 px-2 py-1 rounded-md text-[0.85em] font-bold">{s.name}</span>)}
            </div>
          </div>
        );
      case 'extras':
        if (courses.length === 0 && languages.length === 0) return null;
        return (
          <div key={id} className={sectionWrapperStyle(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={(e) => handleDrop(e, id)} onClick={() => onSectionClick?.('extras')}>
            <DragHandle id={id} />
            <h2 className={`font-bold uppercase tracking-widest mb-4 ${isModernBlue ? 'text-blue-900 border-b-2 border-blue-100' : isExecutiveRed ? 'text-[#800000] border-b border-red-100 pb-1' : 'text-slate-900'} text-[1em]`}>Idiomas & Cursos</h2>
            <div className="space-y-4">
              <div className="space-y-3">
                {languages.map(l => (
                  <div key={l.id} className="text-[0.85em]">
                    <div className="flex justify-between mb-1 font-semibold text-slate-800"><span>{l.name}</span><span className="text-slate-600">{l.level}</span></div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${isExecutiveRed ? 'bg-[#800000]' : 'bg-blue-600'}`} style={{width: `${l.percentage}%`}}></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {courses.map(c => (
                  <div key={c.id} className="text-[0.85em]">
                    <p className="font-bold text-slate-900 leading-tight">{c.name}</p>
                    <p className="text-slate-600 font-semibold text-[0.9em]">{c.institution} • {c.year}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'projects': {
        if (projects.length === 0) return null;
        return (
          <div key={id} className={sectionWrapperStyle(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={(e) => handleDrop(e, id)} onClick={() => onSectionClick?.('projects')}>
            <DragHandle id={id} />
            <h2 className={`font-bold uppercase tracking-widest mb-4 ${isModernBlue ? 'text-blue-900 border-b-2 border-blue-100' : isExecutiveRed ? 'text-[#800000] border-b border-red-100 pb-1' : 'text-slate-900'} text-[1em]`}>Projetos</h2>
            <div className="space-y-5">
              {projects.map(proj => (
                <div key={proj.id}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-slate-950 text-[0.95em]">{proj.name}</h3>
                    {proj.url && (
                      <span className={`text-[0.8em] font-semibold ${isExecutiveRed ? 'text-[#800000]' : 'text-blue-600'} truncate ml-4 max-w-[40%]`}>{proj.url.replace(/^https?:\/\//, '')}</span>
                    )}
                  </div>
                  {proj.technologies && (
                    <p className={`text-[0.85em] font-bold mb-1 ${isExecutiveRed ? 'text-[#800000]' : 'text-blue-700'}`}>{proj.technologies}</p>
                  )}
                  {proj.description && (
                    <p className="text-[0.9em] text-slate-700 leading-relaxed font-medium">{proj.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }
      default: return null;
    }
  };

  // Alterado: Removemos 'mx-auto' e adicionamos 'origin-top-left' para controle externo
  // Adicionamos shadow apenas visualmente, o layout é controlado pelo pai
  const a4ContainerStyle = "bg-white w-[210mm] h-[297mm] shadow-[0_0_50px_-12px_rgba(0,0,0,0.25)] relative overflow-hidden flex flex-col print-container text-slate-900 shrink-0";

  // Template Managers (Layouts permanecem os mesmos, mas encapsulados)
  const getTemplateLayout = () => {
    switch(template) {
      case 'modern_blue':
        return (
          <div className="flex flex-row h-full">
            <div className="w-[75mm] bg-[#1e40af] text-white p-10 flex flex-col shrink-0">
              <div className="mb-10 text-center cursor-pointer" onClick={() => onSectionClick?.('info')}>
                <div className="w-36 h-36 rounded-2xl overflow-hidden mx-auto mb-6 border-4 border-white/30 shadow-xl bg-[#1e3a8a] flex items-center justify-center">
                  {personalInfo.photoUrl ? <img src={personalInfo.photoUrl} className="w-full h-full object-cover" /> : <i className="fas fa-user text-5xl opacity-40"></i>}
                </div>
                <h1 className="text-[1.8em] font-black uppercase tracking-tight leading-tight">{personalInfo.fullName || 'Seu Nome'}</h1>
                <p className="text-[0.9em] font-bold uppercase tracking-[0.1em] text-white mt-2">{personalInfo.jobTitle}</p>
              </div>
              <div className="space-y-8">
                <section onClick={() => onSectionClick?.('info')}>
                  <h2 className="text-[0.85em] font-black uppercase tracking-widest text-blue-100 mb-4">Contato</h2>
                  <div className="space-y-3">
                    <ContactItem icon="fa-phone" text={personalInfo.phone} />
                    <ContactItem icon="fa-envelope" text={personalInfo.email} />
                    <ContactItem icon="fa-map-marker-alt" text={personalInfo.location} />
                    <ContactItem icon="fa-car" text={personalInfo.drivingLicense} />
                    <ContactItem icon="fab fa-linkedin" text={personalInfo.linkedin} />
                    <ContactItem icon="fa-globe" text={personalInfo.website} />
                  </div>
                </section>
              </div>
            </div>
            <div className="flex-1 p-14 bg-white overflow-hidden space-y-10">
              {sectionOrder.map(id => renderSectionContent(id))}
            </div>
          </div>
        );

      case 'executive_red':
        return (
          <div className="flex flex-col h-full bg-[#fcfcfc]">
            <header className="bg-[#800000] text-white p-12 flex justify-between items-center" onClick={() => onSectionClick?.('info')}>
              <div>
                <h1 className="text-[2.8em] font-serif-premium font-bold tracking-tight mb-2 leading-none">{personalInfo.fullName || 'Seu Nome'}</h1>
                <p className="text-[1em] font-medium uppercase tracking-[0.3em] text-white">{personalInfo.jobTitle || 'Seu Cargo'}</p>
              </div>
              <div className="text-right space-y-2">
                <ContactItem icon="fa-envelope" text={personalInfo.email} />
                <ContactItem icon="fa-phone" text={personalInfo.phone} />
                <ContactItem icon="fa-map-marker-alt" text={personalInfo.location} />
                <ContactItem icon="fa-car" text={personalInfo.drivingLicense} />
              </div>
            </header>
            <div className="p-12 flex-1 overflow-hidden">
               <div className="grid grid-cols-12 gap-12 h-full">
                  <div className="col-span-8 space-y-10">
                    {sectionOrder.map(id => (id === 'summary' || id === 'experience') && renderSectionContent(id))}
                  </div>
                  <div className="col-span-4 space-y-10 border-l border-slate-200 pl-10">
                    {sectionOrder.map(id => (id !== 'summary' && id !== 'experience') && renderSectionContent(id))}
                  </div>
               </div>
            </div>
          </div>
        );

      case 'executive_navy':
        return (
          <div className="flex flex-row h-full">
            <div className="w-[85mm] bg-[#0c1221] text-white p-12 flex flex-col shrink-0 border-r border-[#d4af37]/20">
              <div className="mb-12 text-center" onClick={() => onSectionClick?.('info')}>
                <div className="w-40 h-40 rounded-full overflow-hidden mx-auto mb-8 border-[5px] border-[#d4af37]/30 p-1 shadow-2xl">
                  {personalInfo.photoUrl ? <img src={personalInfo.photoUrl} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full bg-[#1e293b] rounded-full flex items-center justify-center"><i className="fas fa-user text-5xl opacity-50 text-white"></i></div>}
                </div>
                <h1 className="text-[1.8em] font-serif uppercase tracking-tighter mb-1 text-[#d4af37]">{personalInfo.fullName || 'Nome'}</h1>
                <p className="text-[0.8em] font-bold uppercase tracking-[0.3em] text-white mt-4">{personalInfo.jobTitle}</p>
              </div>
              <div className="space-y-10">
                <section onClick={() => onSectionClick?.('info')}>
                  <h2 className="text-[0.8em] font-black uppercase tracking-[0.4em] text-[#d4af37] mb-5 flex items-center gap-3"><span className="w-4 h-[1px] bg-[#d4af37]"></span> Contato</h2>
                  <div className="space-y-3">
                    <ContactItem icon="fa-envelope" text={personalInfo.email} />
                    <ContactItem icon="fa-phone" text={personalInfo.phone} />
                    <ContactItem icon="fa-map-marker-alt" text={personalInfo.location} />
                    <ContactItem icon="fa-car" text={personalInfo.drivingLicense} />
                    <ContactItem icon="fab fa-linkedin" text={personalInfo.linkedin} />
                  </div>
                </section>
              </div>
            </div>
            <div className="flex-1 p-14 flex flex-col gap-10 overflow-hidden bg-[#fdfdfd]">
              {sectionOrder.map(id => renderSectionContent(id))}
            </div>
          </div>
        );

      case 'teal_sidebar':
        return (
          <div className="flex flex-row h-full">
            <div className="w-[70mm] bg-[#2D4F4F] text-white p-8 flex flex-col shrink-0">
              <div className="text-center mb-10" onClick={() => onSectionClick?.('info')}>
                {personalInfo.photoUrl && <img src={personalInfo.photoUrl} className="w-32 h-32 rounded-full mx-auto mb-6 object-cover border-4 border-white/20 shadow-lg" />}
                <h1 className="font-bold text-[1.4em] uppercase tracking-widest mb-2 leading-tight">{personalInfo.fullName || 'Nome'}</h1>
                <p className="text-[0.8em] uppercase text-white/90 font-semibold">{personalInfo.jobTitle}</p>
              </div>
              <section className="mt-4" onClick={() => onSectionClick?.('info')}>
                <div className="space-y-3">
                  <ContactItem icon="fa-envelope" text={personalInfo.email} />
                  <ContactItem icon="fa-phone" text={personalInfo.phone} />
                  <ContactItem icon="fa-map-marker-alt" text={personalInfo.location} />
                  <ContactItem icon="fa-car" text={personalInfo.drivingLicense} />
                </div>
              </section>
            </div>
            <div className="flex-1 p-12 bg-white space-y-12 overflow-hidden">
               {sectionOrder.map(id => renderSectionContent(id))}
            </div>
          </div>
        );

      case 'corporate_gray':
        return (
          <div className="flex flex-col h-full bg-slate-50">
            <header className="bg-[#334155] text-white p-12 flex justify-between items-center" onClick={() => onSectionClick?.('info')}>
              <div>
                <h1 className="text-[2.4em] font-bold tracking-tight mb-1">{personalInfo.fullName || 'Seu Nome'}</h1>
                <p className="text-[1.1em] text-slate-100 font-bold tracking-widest uppercase">{personalInfo.jobTitle}</p>
              </div>
              <div className="space-y-1">
                <ContactItem icon="fa-envelope" text={personalInfo.email} />
                <ContactItem icon="fa-phone" text={personalInfo.phone} />
                <ContactItem icon="fa-car" text={personalInfo.drivingLicense} />
              </div>
            </header>
            <div className="p-12 -mt-6 grid grid-cols-12 gap-8 flex-1 overflow-hidden">
              <div className="col-span-8 bg-white p-8 rounded shadow-sm space-y-10">
                {sectionOrder.map(id => (id === 'summary' || id === 'experience') && renderSectionContent(id))}
              </div>
              <div className="col-span-4 bg-white p-8 rounded shadow-sm space-y-10 border-t-4 border-slate-600">
                {sectionOrder.map(id => (id !== 'summary' && id !== 'experience') && renderSectionContent(id))}
              </div>
            </div>
          </div>
        );

      case 'swiss_minimal':
        return (
          <div className="p-16 font-sans flex flex-col h-full bg-white">
            <header className="grid grid-cols-12 gap-8 mb-16" onClick={() => onSectionClick?.('info')}>
              <div className="col-span-8">
                <h1 className="text-[3.8em] font-black tracking-tighter leading-none mb-4 uppercase text-black">{personalInfo.fullName || 'Seu Nome'}</h1>
                <p className="text-[1.4em] font-bold text-blue-700 uppercase tracking-[0.2em]">{personalInfo.jobTitle}</p>
              </div>
              <div className="col-span-4 flex flex-col justify-end text-right space-y-1 text-[0.8em] font-bold uppercase text-slate-700">
                <p>{personalInfo.email}</p>
                <p>{personalInfo.phone}</p>
                <p>{personalInfo.location}</p>
                {personalInfo.drivingLicense && <p>CNH: {personalInfo.drivingLicense}</p>}
              </div>
            </header>
            <div className="flex-1 overflow-hidden space-y-12">
               {sectionOrder.map(id => renderSectionContent(id))}
            </div>
          </div>
        );

      case 'minimal_red_line':
        return (
          <div className="flex flex-row h-full bg-white">
            <div className="w-2 bg-[#D32F2F] h-full shrink-0"></div>
            <div className="flex-1 p-16 flex flex-col h-full overflow-hidden">
              <header className="mb-16" onClick={() => onSectionClick?.('info')}>
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-[3.5em] font-thin tracking-tight text-black mb-2">{personalInfo.fullName || 'Nome'}</h1>
                    <p className="text-[1.2em] font-bold text-[#D32F2F] tracking-widest uppercase">{personalInfo.jobTitle}</p>
                  </div>
                  <div className="text-right text-[0.8em] text-slate-500 font-semibold space-y-1">
                      <p>{personalInfo.email}</p>
                      <p>{personalInfo.phone}</p>
                      {personalInfo.drivingLicense && <p>{personalInfo.drivingLicense}</p>}
                  </div>
                </div>
              </header>
              <div className="flex-1 space-y-12 overflow-hidden">
                {sectionOrder.map(id => renderSectionContent(id))}
              </div>
            </div>
          </div>
        );

      case 'modern_vitae':
        return (
          <div className="p-14 bg-[#fcfdfd] text-slate-900 flex flex-col h-full">
            <header className="flex items-center justify-between mb-12 border-b-2 border-slate-200 pb-10" onClick={() => onSectionClick?.('info')}>
              <div className="max-w-[70%]">
                <h1 className="text-[2.2em] font-extrabold text-black leading-tight mb-2">{personalInfo.fullName || 'Nome'}</h1>
                <p className="text-[1.1em] font-bold text-blue-700 uppercase tracking-widest">{personalInfo.jobTitle}</p>
                <div className="flex flex-wrap gap-4 mt-4 text-[0.85em] font-semibold text-slate-600">
                  <span>{personalInfo.email}</span>
                  <span>{personalInfo.phone}</span>
                  {personalInfo.drivingLicense && <span><i className="fas fa-car mr-1"></i>{personalInfo.drivingLicense}</span>}
                </div>
              </div>
              {personalInfo.photoUrl && <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white shadow-xl"><img src={personalInfo.photoUrl} className="w-full h-full object-cover" /></div>}
            </header>
            <div className="flex-1 grid grid-cols-12 gap-12 overflow-hidden">
              <div className="col-span-8 space-y-12">
                {sectionOrder.map(id => (id === 'experience' || id === 'summary') && renderSectionContent(id))}
              </div>
              <div className="col-span-4 space-y-10">
                {sectionOrder.map(id => (id !== 'experience' && id !== 'summary') && renderSectionContent(id))}
              </div>
            </div>
          </div>
        );

      case 'classic_serif':
        return (
          <div className="font-serif p-16 text-center h-full bg-white flex flex-col overflow-hidden">
            <header className="mb-12 border-b-4 border-double border-slate-900 pb-8" onClick={() => onSectionClick?.('info')}>
              <h1 className="text-[2.4em] font-bold uppercase tracking-widest mb-2 text-black">{personalInfo.fullName || 'Nome Completo'}</h1>
              <p className="text-[1.1em] italic text-slate-800 font-medium">{personalInfo.jobTitle}</p>
              <div className="mt-4 flex justify-center gap-6 text-[0.85em] uppercase font-sans font-bold text-slate-800">
                <span>{personalInfo.email}</span>
                <span>{personalInfo.phone}</span>
                {personalInfo.drivingLicense && <span>{personalInfo.drivingLicense}</span>}
              </div>
            </header>
            <div className="text-left flex-1 space-y-12 overflow-hidden">
               {sectionOrder.map(id => renderSectionContent(id))}
            </div>
          </div>
        );

      /* ══════════════════════════════════════════════════
         PREMIUM TEMPLATES
         ══════════════════════════════════════════════════ */

      case 'aurora_dark':
        return (
          <div className="h-full flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', color: '#e2e8f0', fontFamily: 'inherit' }}>
            {/* Header */}
            <header className="relative px-10 py-8 overflow-hidden cursor-pointer" onClick={() => onSectionClick?.('info')}>
              <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ background: 'radial-gradient(ellipse at 30% 50%, #7c3aed, transparent 60%), radial-gradient(ellipse at 80% 20%, #2563eb, transparent 50%)' }}></div>
              <div className="relative z-10 flex items-center gap-8">
                {personalInfo.photoUrl && (
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 shrink-0" style={{ borderColor: '#7c3aed', boxShadow: '0 0 24px rgba(124,58,237,0.5)' }}>
                    <img src={personalInfo.photoUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="font-black uppercase tracking-tight leading-none mb-1" style={{ fontSize: '2em', background: 'linear-gradient(90deg, #c4b5fd, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{personalInfo.fullName || 'Seu Nome'}</h1>
                  <p className="font-bold uppercase tracking-[0.2em] text-[0.85em]" style={{ color: '#a78bfa' }}>{personalInfo.jobTitle}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-[0.78em]" style={{ color: '#94a3b8' }}>
                    {personalInfo.email && <span><i className="fas fa-envelope mr-1" style={{ color: '#7c3aed' }}></i>{personalInfo.email}</span>}
                    {personalInfo.phone && <span><i className="fas fa-phone mr-1" style={{ color: '#7c3aed' }}></i>{personalInfo.phone}</span>}
                    {personalInfo.location && <span><i className="fas fa-map-marker-alt mr-1" style={{ color: '#7c3aed' }}></i>{personalInfo.location}</span>}
                    {personalInfo.linkedin && <span><i className="fab fa-linkedin mr-1" style={{ color: '#7c3aed' }}></i>{personalInfo.linkedin}</span>}
                    {personalInfo.drivingLicense && <span><i className="fas fa-car mr-1" style={{ color: '#7c3aed' }}></i>{personalInfo.drivingLicense}</span>}
                  </div>
                </div>
              </div>
            </header>
            {/* Body */}
            <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '1fr 2fr', gap: '0' }}>
              {/* Sidebar */}
              <div className="px-8 py-6 space-y-6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', borderRight: '1px solid rgba(124,58,237,0.3)' }}>
                {summary && (
                  <div className={sectionWrapperStyle('summary')} onDragOver={(e) => handleDragOver(e, 'summary')} onDrop={(e) => handleDrop(e, 'summary')} onClick={() => onSectionClick?.('summary')}>
                    <DragHandle id="summary" />
                    <h2 className="font-black uppercase tracking-widest text-[0.75em] mb-2" style={{ color: '#a78bfa', borderBottom: '1px solid rgba(124,58,237,0.4)', paddingBottom: '6px' }}>Perfil</h2>
                    <p className="text-[0.8em] leading-relaxed" style={{ color: '#cbd5e1' }}>{summary}</p>
                  </div>
                )}
                {skills.length > 0 && (
                  <div className={sectionWrapperStyle('skills')} onDragOver={(e) => handleDragOver(e, 'skills')} onDrop={(e) => handleDrop(e, 'skills')} onClick={() => onSectionClick?.('skills')}>
                    <DragHandle id="skills" />
                    <h2 className="font-black uppercase tracking-widest text-[0.75em] mb-3" style={{ color: '#a78bfa', borderBottom: '1px solid rgba(124,58,237,0.4)', paddingBottom: '6px' }}>Habilidades</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map(s => <span key={s.id} className="px-2 py-0.5 rounded-md text-[0.75em] font-bold" style={{ background: 'rgba(124,58,237,0.25)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.4)' }}>{s.name}</span>)}
                    </div>
                  </div>
                )}
                {(languages.length > 0 || courses.length > 0) && (
                  <div className={sectionWrapperStyle('extras')} onDragOver={(e) => handleDragOver(e, 'extras')} onDrop={(e) => handleDrop(e, 'extras')} onClick={() => onSectionClick?.('extras')}>
                    <DragHandle id="extras" />
                    {languages.length > 0 && <>
                      <h2 className="font-black uppercase tracking-widest text-[0.75em] mb-3" style={{ color: '#a78bfa', borderBottom: '1px solid rgba(124,58,237,0.4)', paddingBottom: '6px' }}>Idiomas</h2>
                      <div className="space-y-2 mb-4">
                        {languages.map(l => (
                          <div key={l.id} className="text-[0.78em]">
                            <div className="flex justify-between mb-0.5" style={{ color: '#e2e8f0' }}><span className="font-bold">{l.name}</span><span style={{ color: '#94a3b8' }}>{l.level}</span></div>
                            <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}><div className="h-full rounded-full" style={{ width: `${l.percentage}%`, background: 'linear-gradient(90deg, #7c3aed, #2563eb)' }}></div></div>
                          </div>
                        ))}
                      </div>
                    </>}
                    {courses.length > 0 && <>
                      <h2 className="font-black uppercase tracking-widest text-[0.75em] mb-2" style={{ color: '#a78bfa', borderBottom: '1px solid rgba(124,58,237,0.4)', paddingBottom: '6px' }}>Cursos</h2>
                      <div className="space-y-2">
                        {courses.map(c => <div key={c.id} className="text-[0.78em]"><p className="font-bold" style={{ color: '#e2e8f0' }}>{c.name}</p><p style={{ color: '#94a3b8' }}>{c.institution} • {c.year}</p></div>)}
                      </div>
                    </>}
                  </div>
                )}
              </div>
              {/* Main */}
              <div className="px-8 py-6 space-y-6 overflow-hidden">
                {experiences.length > 0 && (
                  <div className={sectionWrapperStyle('experience')} onDragOver={(e) => handleDragOver(e, 'experience')} onDrop={(e) => handleDrop(e, 'experience')} onClick={() => onSectionClick?.('experience')}>
                    <DragHandle id="experience" />
                    <h2 className="font-black uppercase tracking-widest text-[0.75em] mb-4" style={{ color: '#a78bfa', borderBottom: '1px solid rgba(124,58,237,0.4)', paddingBottom: '6px' }}>Experiência</h2>
                    <div className="space-y-5">
                      {experiences.map(exp => (
                        <div key={exp.id} className="relative pl-5" style={{ borderLeft: '2px solid rgba(124,58,237,0.5)' }}>
                          <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full" style={{ background: '#7c3aed', boxShadow: '0 0 8px rgba(124,58,237,0.8)' }}></div>
                          <div className="flex justify-between items-baseline">
                            <h3 className="font-bold text-[0.9em]" style={{ color: '#f1f5f9' }}>{exp.position}</h3>
                            <span className="text-[0.75em]" style={{ color: '#94a3b8' }}>{exp.startDate} - {exp.endDate}</span>
                          </div>
                          <p className="font-bold text-[0.82em]" style={{ color: '#a78bfa' }}>{exp.company}</p>
                          <p className="text-[0.8em] mt-1 leading-relaxed whitespace-pre-wrap" style={{ color: '#94a3b8' }}>{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {education.length > 0 && (
                  <div className={sectionWrapperStyle('education')} onDragOver={(e) => handleDragOver(e, 'education')} onDrop={(e) => handleDrop(e, 'education')} onClick={() => onSectionClick?.('education')}>
                    <DragHandle id="education" />
                    <h2 className="font-black uppercase tracking-widest text-[0.75em] mb-4" style={{ color: '#a78bfa', borderBottom: '1px solid rgba(124,58,237,0.4)', paddingBottom: '6px' }}>Educação</h2>
                    <div className="space-y-3">
                      {education.map(edu => (
                        <div key={edu.id} className="relative pl-5" style={{ borderLeft: '2px solid rgba(124,58,237,0.5)' }}>
                          <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full" style={{ background: '#7c3aed' }}></div>
                          <h4 className="font-bold text-[0.9em]" style={{ color: '#f1f5f9' }}>{edu.institution}</h4>
                          <p className="text-[0.82em]" style={{ color: '#a78bfa' }}>{edu.degree}</p>
                          <p className="text-[0.78em]" style={{ color: '#94a3b8' }}>{edu.endDate}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'creative_portfolio':
        return (
          <div className="h-full flex flex-col bg-white overflow-hidden" style={{ fontFamily: 'inherit' }}>
            {/* Bold top bar */}
            <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6)' }}></div>
            {/* Header */}
            <header className="px-10 pt-8 pb-6 cursor-pointer flex gap-8 items-start" onClick={() => onSectionClick?.('info')}>
              {personalInfo.photoUrl && (
                <div className="w-28 h-28 rounded-2xl overflow-hidden shrink-0 shadow-xl" style={{ border: '3px solid #f59e0b' }}>
                  <img src={personalInfo.photoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <h1 className="font-black leading-none mb-1" style={{ fontSize: '2.4em', color: '#0f172a' }}>{personalInfo.fullName || 'Seu Nome'}</h1>
                <p className="font-black uppercase tracking-[0.3em] text-[0.8em]" style={{ color: '#f59e0b' }}>{personalInfo.jobTitle}</p>
                <div className="flex flex-wrap gap-4 mt-4 text-[0.78em] font-semibold text-slate-600">
                  {personalInfo.email && <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[0.7em]" style={{ background: '#f59e0b' }}><i className="fas fa-envelope"></i></span>{personalInfo.email}</span>}
                  {personalInfo.phone && <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[0.7em]" style={{ background: '#ef4444' }}><i className="fas fa-phone"></i></span>{personalInfo.phone}</span>}
                  {personalInfo.location && <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[0.7em]" style={{ background: '#8b5cf6' }}><i className="fas fa-map-marker-alt"></i></span>{personalInfo.location}</span>}
                  {personalInfo.linkedin && <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[0.7em]" style={{ background: '#0077b5' }}><i className="fab fa-linkedin"></i></span>{personalInfo.linkedin}</span>}
                  {personalInfo.drivingLicense && <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[0.7em]" style={{ background: '#64748b' }}><i className="fas fa-car"></i></span>{personalInfo.drivingLicense}</span>}
                </div>
              </div>
            </header>
            {/* Content */}
            <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '2fr 1fr', padding: '0 2.5rem', gap: '2rem' }}>
              <div className="space-y-6 overflow-hidden py-4">
                {summary && (
                  <div className={sectionWrapperStyle('summary')} onDragOver={(e) => handleDragOver(e, 'summary')} onDrop={(e) => handleDrop(e, 'summary')} onClick={() => onSectionClick?.('summary')}>
                    <DragHandle id="summary" />
                    <div className="flex items-center gap-2 mb-2"><div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}></div><h2 className="font-black uppercase tracking-widest text-[0.82em] text-slate-800">Sobre Mim</h2></div>
                    <p className="text-[0.85em] text-slate-700 leading-relaxed">{summary}</p>
                  </div>
                )}
                {experiences.length > 0 && (
                  <div className={sectionWrapperStyle('experience')} onDragOver={(e) => handleDragOver(e, 'experience')} onDrop={(e) => handleDrop(e, 'experience')} onClick={() => onSectionClick?.('experience')}>
                    <DragHandle id="experience" />
                    <div className="flex items-center gap-2 mb-3"><div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #ef4444, #8b5cf6)' }}></div><h2 className="font-black uppercase tracking-widest text-[0.82em] text-slate-800">Experiência</h2></div>
                    <div className="space-y-5">
                      {experiences.map(exp => (
                        <div key={exp.id} className="relative" style={{ borderLeft: '3px solid #f59e0b', paddingLeft: '14px' }}>
                          <div className="flex justify-between items-baseline">
                            <h3 className="font-black text-[0.92em] text-slate-900">{exp.position}</h3>
                            <span className="text-[0.75em] font-bold text-slate-500 whitespace-nowrap ml-2">{exp.startDate} - {exp.endDate}</span>
                          </div>
                          <p className="font-bold text-[0.82em]" style={{ color: '#f59e0b' }}>{exp.company}</p>
                          <p className="text-[0.82em] text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {education.length > 0 && (
                  <div className={sectionWrapperStyle('education')} onDragOver={(e) => handleDragOver(e, 'education')} onDrop={(e) => handleDrop(e, 'education')} onClick={() => onSectionClick?.('education')}>
                    <DragHandle id="education" />
                    <div className="flex items-center gap-2 mb-3"><div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #8b5cf6, #f59e0b)' }}></div><h2 className="font-black uppercase tracking-widest text-[0.82em] text-slate-800">Educação</h2></div>
                    <div className="space-y-3">
                      {education.map(edu => (
                        <div key={edu.id} style={{ borderLeft: '3px solid #8b5cf6', paddingLeft: '14px' }}>
                          <h4 className="font-black text-[0.9em] text-slate-900">{edu.institution}</h4>
                          <p className="text-[0.82em] font-bold" style={{ color: '#8b5cf6' }}>{edu.degree}</p>
                          <p className="text-[0.78em] text-slate-500 font-semibold">{edu.endDate}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Right column */}
              <div className="space-y-6 overflow-hidden py-4" style={{ borderLeft: '1px dashed #e2e8f0', paddingLeft: '1.5rem' }}>
                {skills.length > 0 && (
                  <div className={sectionWrapperStyle('skills')} onDragOver={(e) => handleDragOver(e, 'skills')} onDrop={(e) => handleDrop(e, 'skills')} onClick={() => onSectionClick?.('skills')}>
                    <DragHandle id="skills" />
                    <h2 className="font-black uppercase tracking-widest text-[0.78em] text-slate-800 mb-3">Skills</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map(s => <span key={s.id} className="px-2 py-1 rounded-lg text-[0.75em] font-black text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>{s.name}</span>)}
                    </div>
                  </div>
                )}
                {(languages.length > 0 || courses.length > 0) && (
                  <div className={sectionWrapperStyle('extras')} onDragOver={(e) => handleDragOver(e, 'extras')} onDrop={(e) => handleDrop(e, 'extras')} onClick={() => onSectionClick?.('extras')}>
                    <DragHandle id="extras" />
                    {languages.length > 0 && <>
                      <h2 className="font-black uppercase tracking-widest text-[0.78em] text-slate-800 mb-3">Idiomas</h2>
                      <div className="space-y-2 mb-4">
                        {languages.map(l => (
                          <div key={l.id} className="text-[0.78em]">
                            <div className="flex justify-between font-bold text-slate-700 mb-0.5"><span>{l.name}</span><span className="text-slate-500">{l.level}</span></div>
                            <div className="h-1.5 bg-slate-100 rounded-full"><div className="h-full rounded-full" style={{ width: `${l.percentage}%`, background: 'linear-gradient(90deg, #f59e0b, #8b5cf6)' }}></div></div>
                          </div>
                        ))}
                      </div>
                    </>}
                    {courses.length > 0 && <>
                      <h2 className="font-black uppercase tracking-widest text-[0.78em] text-slate-800 mb-2">Cursos</h2>
                      <div className="space-y-2">
                        {courses.map(c => <div key={c.id} className="text-[0.78em]"><p className="font-bold text-slate-900 leading-tight">{c.name}</p><p className="text-slate-500">{c.institution} • {c.year}</p></div>)}
                      </div>
                    </>}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'minimalist_pro':
        return (
          <div className="h-full bg-white flex flex-col overflow-hidden px-14 py-12" style={{ fontFamily: 'inherit' }}>
            <header className="mb-8 cursor-pointer" onClick={() => onSectionClick?.('info')}>
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="font-black tracking-tight leading-none text-slate-900" style={{ fontSize: '2.8em' }}>{personalInfo.fullName || 'Seu Nome'}</h1>
                  <p className="text-[0.9em] font-medium text-slate-500 mt-1 tracking-widest uppercase">{personalInfo.jobTitle}</p>
                </div>
                {personalInfo.photoUrl && <div className="w-20 h-20 rounded-full overflow-hidden" style={{ border: '2px solid #0f172a' }}><img src={personalInfo.photoUrl} alt="" className="w-full h-full object-cover" /></div>}
              </div>
              <div className="mt-4 h-px bg-slate-900"></div>
              <div className="flex flex-wrap gap-6 mt-3 text-[0.78em] text-slate-600 font-medium">
                {personalInfo.email && <span>{personalInfo.email}</span>}
                {personalInfo.phone && <span>{personalInfo.phone}</span>}
                {personalInfo.location && <span>{personalInfo.location}</span>}
                {personalInfo.linkedin && <span>{personalInfo.linkedin}</span>}
                {personalInfo.drivingLicense && <span>{personalInfo.drivingLicense}</span>}
              </div>
            </header>
            <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '2fr 1fr', gap: '2.5rem' }}>
              <div className="space-y-6 overflow-hidden">
                {sectionOrder.map(id => {
                  if (id === 'skills' || id === 'extras') return null;
                  if (id === 'summary' && !summary) return null;
                  if (id === 'experience' && experiences.length === 0) return null;
                  if (id === 'education' && education.length === 0) return null;
                  const labels: Record<string, string> = { summary: 'Perfil', experience: 'Experiência', education: 'Educação' };
                  return (
                    <div key={id} className={sectionWrapperStyle(id as SectionId)} onDragOver={(e) => handleDragOver(e, id as SectionId)} onDrop={(e) => handleDrop(e, id as SectionId)} onClick={() => onSectionClick?.(id)}>
                      <DragHandle id={id as SectionId} />
                      <h2 className="text-[0.75em] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">{labels[id]}</h2>
                      {id === 'summary' && <p className="text-[0.88em] text-slate-700 leading-relaxed">{summary}</p>}
                      {id === 'experience' && (
                        <div className="space-y-5">
                          {experiences.map(exp => (
                            <div key={exp.id}>
                              <div className="flex justify-between items-baseline">
                                <h3 className="font-bold text-[0.92em] text-slate-900">{exp.position}</h3>
                                <span className="text-[0.75em] text-slate-400 font-medium whitespace-nowrap ml-2">{exp.startDate} - {exp.endDate}</span>
                              </div>
                              <p className="text-[0.82em] text-slate-500 font-semibold">{exp.company}</p>
                              <p className="text-[0.82em] text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {id === 'education' && (
                        <div className="space-y-3">
                          {education.map(edu => (
                            <div key={edu.id}>
                              <h4 className="font-bold text-[0.9em] text-slate-900">{edu.institution}</h4>
                              <p className="text-[0.82em] text-slate-600">{edu.degree}</p>
                              <p className="text-[0.78em] text-slate-400">{edu.endDate}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-6 overflow-hidden">
                {skills.length > 0 && (
                  <div className={sectionWrapperStyle('skills')} onDragOver={(e) => handleDragOver(e, 'skills')} onDrop={(e) => handleDrop(e, 'skills')} onClick={() => onSectionClick?.('skills')}>
                    <DragHandle id="skills" />
                    <h2 className="text-[0.75em] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Habilidades</h2>
                    <div className="space-y-1.5">
                      {skills.map(s => (
                        <div key={s.id} className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-slate-900 shrink-0"></div>
                          <span className="text-[0.82em] text-slate-700 font-medium">{s.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(languages.length > 0 || courses.length > 0) && (
                  <div className={sectionWrapperStyle('extras')} onDragOver={(e) => handleDragOver(e, 'extras')} onDrop={(e) => handleDrop(e, 'extras')} onClick={() => onSectionClick?.('extras')}>
                    <DragHandle id="extras" />
                    {languages.length > 0 && <>
                      <h2 className="text-[0.75em] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Idiomas</h2>
                      <div className="space-y-1.5 mb-4">
                        {languages.map(l => <div key={l.id} className="flex justify-between text-[0.8em]"><span className="font-medium text-slate-700">{l.name}</span><span className="text-slate-400">{l.level}</span></div>)}
                      </div>
                    </>}
                    {courses.length > 0 && <>
                      <h2 className="text-[0.75em] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Cursos</h2>
                      <div className="space-y-2">
                        {courses.map(c => <div key={c.id}><p className="text-[0.8em] font-semibold text-slate-700 leading-tight">{c.name}</p><p className="text-[0.75em] text-slate-400">{c.institution} • {c.year}</p></div>)}
                      </div>
                    </>}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'bold_impact':
        return (
          <div className="h-full bg-white flex flex-col overflow-hidden" style={{ fontFamily: 'inherit' }}>
            {/* Giant name header */}
            <header className="px-10 pt-8 pb-6 cursor-pointer" onClick={() => onSectionClick?.('info')} style={{ borderBottom: '4px solid #0f172a' }}>
              <div className="flex items-end justify-between">
                <div className="flex-1">
                  <p className="text-[0.7em] font-black uppercase tracking-[0.4em] text-slate-400 mb-1">{personalInfo.jobTitle}</p>
                  <h1 className="font-black leading-none uppercase text-slate-900" style={{ fontSize: '3em', letterSpacing: '-0.02em' }}>{personalInfo.fullName || 'SEU NOME'}</h1>
                </div>
                {personalInfo.photoUrl && <div className="w-20 h-20 rounded-none overflow-hidden shrink-0 ml-6" style={{ border: '3px solid #0f172a' }}><img src={personalInfo.photoUrl} alt="" className="w-full h-full object-cover" /></div>}
              </div>
              <div className="flex flex-wrap gap-5 mt-4 text-[0.78em] font-bold text-slate-700">
                {personalInfo.email && <span><i className="fas fa-at mr-1 text-slate-400"></i>{personalInfo.email}</span>}
                {personalInfo.phone && <span><i className="fas fa-mobile-alt mr-1 text-slate-400"></i>{personalInfo.phone}</span>}
                {personalInfo.location && <span><i className="fas fa-map-pin mr-1 text-slate-400"></i>{personalInfo.location}</span>}
                {personalInfo.linkedin && <span><i className="fab fa-linkedin mr-1 text-slate-400"></i>{personalInfo.linkedin}</span>}
                {personalInfo.drivingLicense && <span><i className="fas fa-car mr-1 text-slate-400"></i>{personalInfo.drivingLicense}</span>}
              </div>
            </header>
            <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '3fr 1fr' }}>
              <div className="px-10 py-6 space-y-6 overflow-hidden" style={{ borderRight: '2px solid #0f172a' }}>
                {summary && (
                  <div className={sectionWrapperStyle('summary')} onDragOver={(e) => handleDragOver(e, 'summary')} onDrop={(e) => handleDrop(e, 'summary')} onClick={() => onSectionClick?.('summary')}>
                    <DragHandle id="summary" />
                    <h2 className="font-black uppercase tracking-[0.2em] text-[0.75em] text-slate-900 mb-2 flex items-center gap-2"><span className="w-6 h-0.5 bg-slate-900 inline-block"></span>Perfil</h2>
                    <p className="text-[0.85em] text-slate-700 leading-relaxed">{summary}</p>
                  </div>
                )}
                {experiences.length > 0 && (
                  <div className={sectionWrapperStyle('experience')} onDragOver={(e) => handleDragOver(e, 'experience')} onDrop={(e) => handleDrop(e, 'experience')} onClick={() => onSectionClick?.('experience')}>
                    <DragHandle id="experience" />
                    <h2 className="font-black uppercase tracking-[0.2em] text-[0.75em] text-slate-900 mb-4 flex items-center gap-2"><span className="w-6 h-0.5 bg-slate-900 inline-block"></span>Experiência</h2>
                    <div className="space-y-5">
                      {experiences.map(exp => (
                        <div key={exp.id}>
                          <div className="flex justify-between items-baseline">
                            <h3 className="font-black text-[0.95em] text-slate-900 uppercase">{exp.position}</h3>
                            <span className="text-[0.75em] font-bold text-slate-400 whitespace-nowrap ml-3">{exp.startDate} – {exp.endDate}</span>
                          </div>
                          <p className="text-[0.82em] font-black text-slate-500 uppercase tracking-widest">{exp.company}</p>
                          <p className="text-[0.82em] text-slate-600 mt-1.5 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {education.length > 0 && (
                  <div className={sectionWrapperStyle('education')} onDragOver={(e) => handleDragOver(e, 'education')} onDrop={(e) => handleDrop(e, 'education')} onClick={() => onSectionClick?.('education')}>
                    <DragHandle id="education" />
                    <h2 className="font-black uppercase tracking-[0.2em] text-[0.75em] text-slate-900 mb-3 flex items-center gap-2"><span className="w-6 h-0.5 bg-slate-900 inline-block"></span>Educação</h2>
                    <div className="space-y-3">
                      {education.map(edu => (
                        <div key={edu.id}>
                          <h4 className="font-black text-[0.9em] text-slate-900 uppercase">{edu.institution}</h4>
                          <p className="text-[0.82em] font-bold text-slate-500 uppercase tracking-wider">{edu.degree}</p>
                          <p className="text-[0.78em] text-slate-400">{edu.endDate}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Right narrow column */}
              <div className="px-6 py-6 space-y-6 overflow-hidden bg-slate-50">
                {skills.length > 0 && (
                  <div className={sectionWrapperStyle('skills')} onDragOver={(e) => handleDragOver(e, 'skills')} onDrop={(e) => handleDrop(e, 'skills')} onClick={() => onSectionClick?.('skills')}>
                    <DragHandle id="skills" />
                    <h2 className="font-black uppercase tracking-[0.2em] text-[0.7em] text-slate-900 mb-3">Skills</h2>
                    <div className="space-y-1.5">
                      {skills.map(s => <div key={s.id} className="text-[0.78em] font-bold text-slate-700 border-b border-slate-200 pb-1.5">{s.name}</div>)}
                    </div>
                  </div>
                )}
                {(languages.length > 0 || courses.length > 0) && (
                  <div className={sectionWrapperStyle('extras')} onDragOver={(e) => handleDragOver(e, 'extras')} onDrop={(e) => handleDrop(e, 'extras')} onClick={() => onSectionClick?.('extras')}>
                    <DragHandle id="extras" />
                    {languages.length > 0 && <>
                      <h2 className="font-black uppercase tracking-[0.2em] text-[0.7em] text-slate-900 mb-2">Idiomas</h2>
                      <div className="space-y-1.5 mb-4">
                        {languages.map(l => <div key={l.id} className="text-[0.75em]"><p className="font-black text-slate-900">{l.name}</p><p className="text-slate-500">{l.level}</p></div>)}
                      </div>
                    </>}
                    {courses.length > 0 && <>
                      <h2 className="font-black uppercase tracking-[0.2em] text-[0.7em] text-slate-900 mb-2">Cursos</h2>
                      <div className="space-y-2">
                        {courses.map(c => <div key={c.id} className="text-[0.75em]"><p className="font-bold text-slate-900 leading-tight">{c.name}</p><p className="text-slate-500">{c.institution}</p></div>)}
                      </div>
                    </>}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'soft_pastel':
        return (
          <div className="h-full flex flex-col overflow-hidden" style={{ background: '#fdf6f0', fontFamily: 'inherit' }}>
            {/* Decorative top */}
            <div className="h-3 w-full" style={{ background: 'linear-gradient(90deg, #f9a8d4, #fda4af, #fcd34d, #86efac)' }}></div>
            <header className="px-10 py-8 cursor-pointer flex items-center gap-8" onClick={() => onSectionClick?.('info')} style={{ background: '#fff5f7' }}>
              {personalInfo.photoUrl && (
                <div className="w-24 h-24 rounded-full overflow-hidden shrink-0" style={{ border: '3px solid #f9a8d4', boxShadow: '0 4px 16px rgba(249,168,212,0.4)' }}>
                  <img src={personalInfo.photoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <h1 className="font-black leading-tight" style={{ fontSize: '2em', color: '#831843' }}>{personalInfo.fullName || 'Seu Nome'}</h1>
                <p className="font-bold text-[0.85em] mt-1" style={{ color: '#db2777' }}>{personalInfo.jobTitle}</p>
                <div className="flex flex-wrap gap-4 mt-3 text-[0.75em] font-semibold" style={{ color: '#9d174d' }}>
                  {personalInfo.email && <span><i className="fas fa-envelope mr-1" style={{ color: '#f472b6' }}></i>{personalInfo.email}</span>}
                  {personalInfo.phone && <span><i className="fas fa-phone mr-1" style={{ color: '#f472b6' }}></i>{personalInfo.phone}</span>}
                  {personalInfo.location && <span><i className="fas fa-map-marker-alt mr-1" style={{ color: '#f472b6' }}></i>{personalInfo.location}</span>}
                  {personalInfo.linkedin && <span><i className="fab fa-linkedin mr-1" style={{ color: '#f472b6' }}></i>{personalInfo.linkedin}</span>}
                  {personalInfo.drivingLicense && <span><i className="fas fa-car mr-1" style={{ color: '#f472b6' }}></i>{personalInfo.drivingLicense}</span>}
                </div>
              </div>
            </header>
            <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '1fr 2fr', gap: '0' }}>
              {/* Left pastel sidebar */}
              <div className="px-7 py-7 space-y-6 overflow-hidden" style={{ background: '#fff0f6' }}>
                {skills.length > 0 && (
                  <div className={sectionWrapperStyle('skills')} onDragOver={(e) => handleDragOver(e, 'skills')} onDrop={(e) => handleDrop(e, 'skills')} onClick={() => onSectionClick?.('skills')}>
                    <DragHandle id="skills" />
                    <h2 className="font-black uppercase tracking-widest text-[0.72em] mb-3 pb-1.5" style={{ color: '#db2777', borderBottom: '2px solid #fce7f3' }}>Habilidades</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map(s => <span key={s.id} className="px-2 py-0.5 rounded-full text-[0.75em] font-bold" style={{ background: '#fce7f3', color: '#9d174d' }}>{s.name}</span>)}
                    </div>
                  </div>
                )}
                {(languages.length > 0 || courses.length > 0) && (
                  <div className={sectionWrapperStyle('extras')} onDragOver={(e) => handleDragOver(e, 'extras')} onDrop={(e) => handleDrop(e, 'extras')} onClick={() => onSectionClick?.('extras')}>
                    <DragHandle id="extras" />
                    {languages.length > 0 && <>
                      <h2 className="font-black uppercase tracking-widest text-[0.72em] mb-3 pb-1.5" style={{ color: '#db2777', borderBottom: '2px solid #fce7f3' }}>Idiomas</h2>
                      <div className="space-y-2 mb-4">
                        {languages.map(l => (
                          <div key={l.id} className="text-[0.78em]">
                            <div className="flex justify-between font-semibold mb-0.5" style={{ color: '#831843' }}><span>{l.name}</span><span style={{ color: '#db2777' }}>{l.level}</span></div>
                            <div className="h-1.5 rounded-full" style={{ background: '#fce7f3' }}><div className="h-full rounded-full" style={{ width: `${l.percentage}%`, background: 'linear-gradient(90deg, #f9a8d4, #db2777)' }}></div></div>
                          </div>
                        ))}
                      </div>
                    </>}
                    {courses.length > 0 && <>
                      <h2 className="font-black uppercase tracking-widest text-[0.72em] mb-2 pb-1.5" style={{ color: '#db2777', borderBottom: '2px solid #fce7f3' }}>Cursos</h2>
                      <div className="space-y-2">
                        {courses.map(c => <div key={c.id} className="text-[0.78em]"><p className="font-bold leading-tight" style={{ color: '#831843' }}>{c.name}</p><p style={{ color: '#9d174d' }}>{c.institution} • {c.year}</p></div>)}
                      </div>
                    </>}
                  </div>
                )}
              </div>
              {/* Right main */}
              <div className="px-8 py-7 space-y-5 overflow-hidden">
                {summary && (
                  <div className={sectionWrapperStyle('summary')} onDragOver={(e) => handleDragOver(e, 'summary')} onDrop={(e) => handleDrop(e, 'summary')} onClick={() => onSectionClick?.('summary')}>
                    <DragHandle id="summary" />
                    <h2 className="font-black uppercase tracking-widest text-[0.72em] mb-2 pb-1.5" style={{ color: '#db2777', borderBottom: '2px solid #fce7f3' }}>Sobre Mim</h2>
                    <p className="text-[0.85em] leading-relaxed" style={{ color: '#4a1942' }}>{summary}</p>
                  </div>
                )}
                {experiences.length > 0 && (
                  <div className={sectionWrapperStyle('experience')} onDragOver={(e) => handleDragOver(e, 'experience')} onDrop={(e) => handleDrop(e, 'experience')} onClick={() => onSectionClick?.('experience')}>
                    <DragHandle id="experience" />
                    <h2 className="font-black uppercase tracking-widest text-[0.72em] mb-3 pb-1.5" style={{ color: '#db2777', borderBottom: '2px solid #fce7f3' }}>Experiência</h2>
                    <div className="space-y-4">
                      {experiences.map(exp => (
                        <div key={exp.id} className="pl-3" style={{ borderLeft: '2px solid #f9a8d4' }}>
                          <div className="flex justify-between items-baseline">
                            <h3 className="font-black text-[0.9em]" style={{ color: '#831843' }}>{exp.position}</h3>
                            <span className="text-[0.73em] font-semibold" style={{ color: '#db2777' }}>{exp.startDate} - {exp.endDate}</span>
                          </div>
                          <p className="font-bold text-[0.8em]" style={{ color: '#db2777' }}>{exp.company}</p>
                          <p className="text-[0.8em] mt-1 leading-relaxed whitespace-pre-wrap" style={{ color: '#9d174d' }}>{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {education.length > 0 && (
                  <div className={sectionWrapperStyle('education')} onDragOver={(e) => handleDragOver(e, 'education')} onDrop={(e) => handleDrop(e, 'education')} onClick={() => onSectionClick?.('education')}>
                    <DragHandle id="education" />
                    <h2 className="font-black uppercase tracking-widest text-[0.72em] mb-3 pb-1.5" style={{ color: '#db2777', borderBottom: '2px solid #fce7f3' }}>Educação</h2>
                    <div className="space-y-3">
                      {education.map(edu => (
                        <div key={edu.id} className="pl-3" style={{ borderLeft: '2px solid #f9a8d4' }}>
                          <h4 className="font-black text-[0.88em]" style={{ color: '#831843' }}>{edu.institution}</h4>
                          <p className="text-[0.8em] font-semibold" style={{ color: '#db2777' }}>{edu.degree}</p>
                          <p className="text-[0.76em]" style={{ color: '#9d174d' }}>{edu.endDate}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'tech_dark':
        return (
          <div className="h-full flex flex-col overflow-hidden" style={{ background: '#0d1117', color: '#e6edf3', fontFamily: "'Courier New', monospace" }}>
            {/* Terminal-style header */}
            <header className="px-10 py-7 cursor-pointer" onClick={() => onSectionClick?.('info')} style={{ borderBottom: '1px solid #21262d', background: '#161b22' }}>
              <div className="flex items-start gap-6">
                {personalInfo.photoUrl && (
                  <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0" style={{ border: '2px solid #30363d', boxShadow: '0 0 12px rgba(88,166,255,0.3)' }}>
                    <img src={personalInfo.photoUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: '#58a6ff' }} className="text-[0.75em] font-bold">$</span>
                    <span style={{ color: '#3fb950' }} className="text-[0.75em]">whoami</span>
                  </div>
                  <h1 className="font-bold leading-none" style={{ fontSize: '2em', color: '#58a6ff' }}>{personalInfo.fullName || 'dev@machine'}</h1>
                  <p className="text-[0.82em] mt-1" style={{ color: '#3fb950' }}>// {personalInfo.jobTitle}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-[0.72em]" style={{ color: '#8b949e' }}>
                    {personalInfo.email && <span><span style={{ color: '#58a6ff' }}>mail:</span> {personalInfo.email}</span>}
                    {personalInfo.phone && <span><span style={{ color: '#58a6ff' }}>tel:</span> {personalInfo.phone}</span>}
                    {personalInfo.location && <span><span style={{ color: '#58a6ff' }}>loc:</span> {personalInfo.location}</span>}
                    {personalInfo.linkedin && <span><span style={{ color: '#58a6ff' }}>in:</span> {personalInfo.linkedin}</span>}
                    {personalInfo.drivingLicense && <span><span style={{ color: '#58a6ff' }}>cnh:</span> {personalInfo.drivingLicense}</span>}
                  </div>
                </div>
              </div>
            </header>
            <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '2fr 1fr' }}>
              {/* Main content */}
              <div className="px-8 py-6 space-y-6 overflow-hidden" style={{ borderRight: '1px solid #21262d' }}>
                {summary && (
                  <div className={sectionWrapperStyle('summary')} onDragOver={(e) => handleDragOver(e, 'summary')} onDrop={(e) => handleDrop(e, 'summary')} onClick={() => onSectionClick?.('summary')}>
                    <DragHandle id="summary" />
                    <h2 className="text-[0.7em] font-bold mb-2 flex items-center gap-2" style={{ color: '#3fb950' }}><span style={{ color: '#58a6ff' }}>#</span> README.md</h2>
                    <p className="text-[0.82em] leading-relaxed" style={{ color: '#c9d1d9' }}>{summary}</p>
                  </div>
                )}
                {experiences.length > 0 && (
                  <div className={sectionWrapperStyle('experience')} onDragOver={(e) => handleDragOver(e, 'experience')} onDrop={(e) => handleDrop(e, 'experience')} onClick={() => onSectionClick?.('experience')}>
                    <DragHandle id="experience" />
                    <h2 className="text-[0.7em] font-bold mb-4 flex items-center gap-2" style={{ color: '#3fb950' }}><span style={{ color: '#58a6ff' }}>#</span> experience.log</h2>
                    <div className="space-y-5">
                      {experiences.map(exp => (
                        <div key={exp.id} className="pl-4" style={{ borderLeft: '2px solid #238636' }}>
                          <div className="flex justify-between items-baseline">
                            <h3 className="font-bold text-[0.88em]" style={{ color: '#58a6ff' }}>{exp.position}</h3>
                            <span className="text-[0.72em]" style={{ color: '#6e7681' }}>{exp.startDate} – {exp.endDate}</span>
                          </div>
                          <p className="font-bold text-[0.78em]" style={{ color: '#3fb950' }}>@ {exp.company}</p>
                          <p className="text-[0.78em] mt-1.5 leading-relaxed whitespace-pre-wrap" style={{ color: '#8b949e' }}>{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {education.length > 0 && (
                  <div className={sectionWrapperStyle('education')} onDragOver={(e) => handleDragOver(e, 'education')} onDrop={(e) => handleDrop(e, 'education')} onClick={() => onSectionClick?.('education')}>
                    <DragHandle id="education" />
                    <h2 className="text-[0.7em] font-bold mb-3 flex items-center gap-2" style={{ color: '#3fb950' }}><span style={{ color: '#58a6ff' }}>#</span> education.json</h2>
                    <div className="space-y-3">
                      {education.map(edu => (
                        <div key={edu.id} className="pl-4" style={{ borderLeft: '2px solid #388bfd' }}>
                          <h4 className="font-bold text-[0.86em]" style={{ color: '#58a6ff' }}>{edu.institution}</h4>
                          <p className="text-[0.78em]" style={{ color: '#3fb950' }}>{edu.degree}</p>
                          <p className="text-[0.72em]" style={{ color: '#6e7681' }}>{edu.endDate}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Right sidebar */}
              <div className="px-6 py-6 space-y-6 overflow-hidden" style={{ background: '#161b22' }}>
                {skills.length > 0 && (
                  <div className={sectionWrapperStyle('skills')} onDragOver={(e) => handleDragOver(e, 'skills')} onDrop={(e) => handleDrop(e, 'skills')} onClick={() => onSectionClick?.('skills')}>
                    <DragHandle id="skills" />
                    <h2 className="text-[0.7em] font-bold mb-3" style={{ color: '#3fb950' }}><span style={{ color: '#58a6ff' }}>#</span> skills[]</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map(s => <span key={s.id} className="px-2 py-0.5 rounded text-[0.72em] font-bold" style={{ background: 'rgba(56,139,253,0.15)', color: '#58a6ff', border: '1px solid rgba(56,139,253,0.3)' }}>{s.name}</span>)}
                    </div>
                  </div>
                )}
                {(languages.length > 0 || courses.length > 0) && (
                  <div className={sectionWrapperStyle('extras')} onDragOver={(e) => handleDragOver(e, 'extras')} onDrop={(e) => handleDrop(e, 'extras')} onClick={() => onSectionClick?.('extras')}>
                    <DragHandle id="extras" />
                    {languages.length > 0 && <>
                      <h2 className="text-[0.7em] font-bold mb-2" style={{ color: '#3fb950' }}><span style={{ color: '#58a6ff' }}>#</span> languages()</h2>
                      <div className="space-y-2 mb-4">
                        {languages.map(l => (
                          <div key={l.id} className="text-[0.72em]">
                            <div className="flex justify-between mb-0.5" style={{ color: '#c9d1d9' }}><span className="font-bold">{l.name}</span><span style={{ color: '#6e7681' }}>{l.level}</span></div>
                            <div className="h-1 rounded" style={{ background: '#21262d' }}><div className="h-full rounded" style={{ width: `${l.percentage}%`, background: '#3fb950' }}></div></div>
                          </div>
                        ))}
                      </div>
                    </>}
                    {courses.length > 0 && <>
                      <h2 className="text-[0.7em] font-bold mb-2" style={{ color: '#3fb950' }}><span style={{ color: '#58a6ff' }}>#</span> certs[]</h2>
                      <div className="space-y-2">
                        {courses.map(c => <div key={c.id} className="text-[0.72em]"><p className="font-bold" style={{ color: '#c9d1d9' }}>{c.name}</p><p style={{ color: '#6e7681' }}>{c.institution} • {c.year}</p></div>)}
                      </div>
                    </>}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      id="resume-preview-container"
      className={a4ContainerStyle} 
      style={{ fontSize: `${fontSize}px` }}
    >
      {getTemplateLayout()}
    </div>
  );
};

// Optimization: Only re-render if data actually changed
export default React.memo(ResumePreview, (prev, next) => {
  return prev.template === next.template && 
         prev.fontSize === next.fontSize &&
         JSON.stringify(prev.data) === JSON.stringify(next.data);
});
