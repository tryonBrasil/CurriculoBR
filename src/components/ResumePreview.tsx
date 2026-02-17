
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
  const { personalInfo, summary, experiences, education, skills, languages, courses, sectionOrder } = data;
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
