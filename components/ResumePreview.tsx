
import React from 'react';
import { ResumeData, TemplateId } from '../types';

interface Props {
  data: ResumeData;
  template: TemplateId;
  onSectionClick?: (sectionId: string) => void;
  // onReorder removido pois sectionOrder não existe mais
  onReorder?: any; 
  fontSize?: number;
  fontFamily?: string;
}

const ResumePreview: React.FC<Props> = ({ data, template, onSectionClick, fontSize = 12, fontFamily = "'Inter', sans-serif" }) => {
  // Verificação de segurança caso data seja undefined
  if (!data) return null;

  // Desestruturação segura com valores padrão para evitar erros com null/undefined
  const { 
      fullName = '', 
      email = '', 
      phone = '', 
      location = '', 
      summary = '', 
      experiences = [], 
      education = [], 
      skills = '', 
      languages = [], 
      certifications = [], 
      photoUrl = '' 
  } = data || {};

  // Detecta se é uma miniatura baseada no tamanho da fonte injetado
  // Se a fonte for artificialmente grande (>16), estamos em modo thumbnail para compensar o scale down
  const isThumbnail = fontSize > 16;
  
  // Classes utilitárias dinâmicas para melhorar legibilidade
  // textBase: Usado para descrições e corpo do texto. Mudado de slate-900 para black para contraste máximo.
  const textBase = isThumbnail ? 'text-black font-semibold' : 'text-black font-normal';
  
  // textMuted: Usado para detalhes secundários. Mudado de slate-500 para slate-700 para evitar aspecto "apagado".
  const textMuted = isThumbnail ? 'text-slate-900 font-medium' : 'text-slate-700';
  
  const textLight = isThumbnail ? 'text-white font-bold' : 'text-white';
  const borderClass = isThumbnail ? 'border-2' : 'border'; // Bordas mais grossas em miniaturas

  const ContactItem = ({ icon, text, dark = false }: { icon: string, text: string | undefined, dark?: boolean }) => {
    if (!text) return null;
    return (
      <div className={`flex items-center gap-2 text-[0.85em] ${dark ? 'text-slate-950' : 'text-white'} ${isThumbnail ? 'font-bold' : 'font-semibold'}`}>
        <i className={`fas ${icon} w-3.5 text-center ${dark ? 'text-blue-900' : 'text-[#d4af37]'}`}></i>
        <span className="truncate">{text}</span>
      </div>
    );
  };

  const renderSummary = (isModernBlue: boolean, isExecutiveRed: boolean) => {
    if (!summary) return null;
    return (
      <div className="mb-6 relative group/section hover:bg-blue-50/10 p-2 rounded transition-colors" onClick={() => onSectionClick?.('summary')}>
        <h2 className={`font-bold uppercase tracking-widest mb-2 ${isModernBlue ? 'text-blue-900 border-b-2 border-blue-100' : isExecutiveRed ? 'text-[#800000] border-b border-red-100 pb-1' : 'text-black'} text-[1em]`}>Perfil</h2>
        <p className={`text-[0.9em] leading-relaxed text-justify ${textBase}`}>{summary}</p>
      </div>
    );
  };

  const renderExperience = (isModernBlue: boolean, isExecutiveRed: boolean) => {
    if (!experiences || experiences.length === 0) return null;
    return (
      <div className="mb-6 relative group/section hover:bg-blue-50/10 p-2 rounded transition-colors" onClick={() => onSectionClick?.('experience')}>
        <h2 className={`font-bold uppercase tracking-widest mb-4 ${isModernBlue ? 'text-blue-900 border-b-2 border-blue-100' : isExecutiveRed ? 'text-[#800000] border-b border-red-100 pb-1' : 'text-black'} text-[1em]`}>Experiência</h2>
        <div className="space-y-6">
          {experiences.map(exp => (
            <div key={exp.id}>
              <div className="flex justify-between font-bold text-black text-[0.95em] items-baseline">
                <h3 className="text-black">{exp.position}</h3>
                <span className={`text-[0.85em] font-bold whitespace-nowrap ml-4 ${textBase}`}>{exp.period}</span>
              </div>
              <p className={`text-[0.9em] font-bold ${isExecutiveRed ? 'text-[#800000]' : 'text-blue-800'}`}>{exp.company}</p>
              <p className={`text-[0.9em] mt-2 leading-relaxed whitespace-pre-wrap ${textBase}`}>{exp.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEducation = (isModernBlue: boolean, isExecutiveRed: boolean) => {
    if (!education || education.length === 0) return null;
    return (
      <div className="mb-6 relative group/section hover:bg-blue-50/10 p-2 rounded transition-colors" onClick={() => onSectionClick?.('education')}>
        <h2 className={`font-bold uppercase tracking-widest mb-4 ${isModernBlue ? 'text-blue-900 border-b-2 border-blue-100' : isExecutiveRed ? 'text-[#800000] border-b border-red-100 pb-1' : 'text-black'} text-[1em]`}>Educação</h2>
        <div className="space-y-4">
          {education.map(edu => (
            <div key={edu.id}>
              <div className="flex justify-between items-baseline">
                 <h4 className="font-bold text-black text-[0.95em]">{edu.school}</h4>
                 <span className={`text-[0.85em] font-bold ${textBase}`}>{edu.year}</span>
              </div>
              <p className={`text-[0.9em] ${textBase}`}>{edu.degree}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLanguages = (isSidebar: boolean, isRed: boolean) => {
    if (!languages || languages.length === 0) return null;
    return (
      <div className={`mb-6 relative group/section hover:bg-blue-50/10 p-2 rounded transition-colors`} onClick={() => onSectionClick?.('languages')}>
        <h2 className={`${isSidebar ? 'text-[0.85em] font-black text-blue-100 uppercase tracking-widest mb-3' : `font-bold uppercase tracking-widest mb-4 text-[1em] ${isRed ? 'text-[#800000] border-b border-red-100 pb-1' : 'text-black'}`}`}>Idiomas</h2>
        <div className="space-y-2">
          {languages.map(lang => (
            <div key={lang.id} className="flex justify-between items-baseline">
              <span className={`font-bold ${isSidebar ? textLight : 'text-slate-900'} text-[0.9em]`}>{lang.name}</span>
              <span className={`${isSidebar ? 'text-blue-200' : textMuted} text-[0.8em] font-medium`}>{lang.level}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCertifications = (isSidebar: boolean, isRed: boolean) => {
    if (!certifications || certifications.length === 0) return null;
    return (
      <div className={`mb-6 relative group/section hover:bg-blue-50/10 p-2 rounded transition-colors`} onClick={() => onSectionClick?.('certifications')}>
        <h2 className={`${isSidebar ? 'text-[0.85em] font-black text-blue-100 uppercase tracking-widest mb-3' : `font-bold uppercase tracking-widest mb-4 text-[1em] ${isRed ? 'text-[#800000] border-b border-red-100 pb-1' : 'text-black'}`}`}>Cursos</h2>
        <div className="space-y-3">
          {certifications.map(cert => (
            <div key={cert.id}>
              <p className={`font-bold ${isSidebar ? textLight : 'text-slate-900'} text-[0.9em] leading-tight`}>{cert.name}</p>
              <div className="flex gap-2 text-[0.8em]">
                 <span className={`${isSidebar ? 'text-blue-200' : textMuted} font-medium`}>{cert.issuer}</span>
                 {cert.year && <span className={`${isSidebar ? 'text-blue-300' : textMuted} font-medium`}>• {cert.year}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSkills = (isModernBlue: boolean, isExecutiveRed: boolean) => {
    if (!skills) return null;
    return (
      <div className="mb-6 relative group/section hover:bg-blue-50/10 p-2 rounded transition-colors" onClick={() => onSectionClick?.('skills')}>
        <h2 className={`font-bold uppercase tracking-widest mb-4 ${isModernBlue ? 'text-blue-900 border-b-2 border-blue-100' : isExecutiveRed ? 'text-[#800000] border-b border-red-100 pb-1' : 'text-black'} text-[1em]`}>Habilidades</h2>
        <p className={`text-[0.9em] leading-relaxed ${textBase}`}>{skills}</p>
      </div>
    );
  };

  const renderAllSections = (isModernBlue: boolean, isExecutiveRed: boolean) => (
    <>
      {renderSummary(isModernBlue, isExecutiveRed)}
      {renderExperience(isModernBlue, isExecutiveRed)}
      {renderEducation(isModernBlue, isExecutiveRed)}
      {!isModernBlue && renderLanguages(false, isExecutiveRed)}
      {!isModernBlue && renderCertifications(false, isExecutiveRed)}
      {renderSkills(isModernBlue, isExecutiveRed)}
    </>
  );

  const a4ContainerStyle = "bg-white w-[210mm] h-[297mm] shadow-[0_0_50px_-12px_rgba(0,0,0,0.25)] relative overflow-hidden flex flex-col print-container text-black shrink-0";

  const getTemplateLayout = () => {
    // Safety check for template
    if (!template) return null;

    switch(template) {
      case 'modern_blue':
        return (
          <div className="flex flex-row h-full">
            <div className="w-[75mm] bg-[#1e40af] text-white p-8 flex flex-col shrink-0">
              <div className="mb-10 text-center cursor-pointer" onClick={() => onSectionClick?.('info')}>
                {photoUrl ? (
                    <div className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white/20 overflow-hidden shadow-lg">
                        <img src={photoUrl} className="w-full h-full object-cover" alt="Perfil" />
                    </div>
                ) : (
                    <div className="w-24 h-24 rounded-full bg-white/20 mx-auto mb-4 flex items-center justify-center">
                        <span className="text-4xl font-bold text-white">{fullName ? fullName.charAt(0) : ''}</span>
                    </div>
                )}
                <h1 className="text-[1.8em] font-black uppercase tracking-tight leading-tight break-words">{fullName || 'Seu Nome'}</h1>
              </div>
              <div className="space-y-8">
                <section onClick={() => onSectionClick?.('info')}>
                  <h2 className="text-[0.85em] font-black uppercase tracking-widest text-blue-100 mb-4">Contato</h2>
                  <div className="space-y-3">
                    <ContactItem icon="fa-phone" text={phone} />
                    <ContactItem icon="fa-envelope" text={email} />
                    <ContactItem icon="fa-map-marker-alt" text={location} />
                  </div>
                </section>
                {renderLanguages(true, false)}
                {renderCertifications(true, false)}
              </div>
            </div>
            <div className="flex-1 p-10 bg-white overflow-hidden space-y-2">
              {renderAllSections(true, false)}
            </div>
          </div>
        );

      case 'executive_red':
        return (
          <div className="flex flex-col h-full bg-[#fcfcfc]">
            <header className="bg-[#800000] text-white p-12 flex justify-between items-center" onClick={() => onSectionClick?.('info')}>
              <div className="flex items-center gap-6">
                {photoUrl && (
                    <img src={photoUrl} className="w-28 h-28 object-cover rounded-lg border-2 border-[#a33232] shadow-lg" alt="Perfil" />
                )}
                <div>
                  <h1 className="text-[2.8em] font-bold tracking-tight mb-2 leading-none">{fullName || 'Seu Nome'}</h1>
                </div>
              </div>
              <div className="text-right space-y-2">
                <ContactItem icon="fa-envelope" text={email} />
                <ContactItem icon="fa-phone" text={phone} />
                <ContactItem icon="fa-map-marker-alt" text={location} />
              </div>
            </header>
            <div className="p-12 flex-1 overflow-hidden">
               <div className="space-y-8">
                  {renderAllSections(false, true)}
               </div>
            </div>
          </div>
        );

      case 'executive_navy':
        return (
          <div className="flex flex-row h-full">
            <div className="w-[85mm] bg-[#0c1221] text-white p-12 flex flex-col shrink-0 border-r border-[#d4af37]/20">
              <div className="mb-12 text-center" onClick={() => onSectionClick?.('info')}>
                {photoUrl && (
                    <div className="w-32 h-32 mx-auto mb-6 rounded-full border-2 border-[#d4af37] p-1">
                        <img src={photoUrl} className="w-full h-full object-cover rounded-full" alt="Perfil" />
                    </div>
                )}
                <h1 className="text-[1.8em] uppercase tracking-tighter mb-1 text-[#d4af37]">{fullName || 'Nome'}</h1>
              </div>
              <div className="space-y-10">
                <section onClick={() => onSectionClick?.('info')}>
                  <h2 className="text-[0.8em] font-black uppercase tracking-[0.4em] text-[#d4af37] mb-5 flex items-center gap-3"><span className="w-4 h-[1px] bg-[#d4af37]"></span> Contato</h2>
                  <div className="space-y-3">
                    <ContactItem icon="fa-envelope" text={email} />
                    <ContactItem icon="fa-phone" text={phone} />
                    <ContactItem icon="fa-map-marker-alt" text={location} />
                  </div>
                </section>
                <div className="pt-6 border-t border-[#d4af37]/20">
                    <h2 className="text-[0.8em] font-black uppercase tracking-[0.4em] text-[#d4af37] mb-5">Idiomas</h2>
                    <div className="space-y-2">
                        {languages?.map(l => (
                            <div key={l.id} className="flex justify-between text-[0.85em]">
                                <span className="font-bold">{l.name}</span>
                                <span className="text-slate-300 font-medium">{l.level}</span>
                            </div>
                        ))}
                    </div>
                </div>
                {certifications && certifications.length > 0 && (
                   <div className="pt-6 border-t border-[#d4af37]/20">
                        <h2 className="text-[0.8em] font-black uppercase tracking-[0.4em] text-[#d4af37] mb-5">Cursos</h2>
                        <div className="space-y-3">
                            {certifications.map(c => (
                                <div key={c.id} className="text-[0.85em]">
                                    <p className="font-bold">{c.name}</p>
                                    <p className="text-slate-300 text-xs font-medium">{c.issuer} • {c.year}</p>
                                </div>
                            ))}
                        </div>
                   </div>
                )}
              </div>
            </div>
            <div className="flex-1 p-14 flex flex-col gap-8 overflow-hidden bg-[#fdfdfd]">
              {renderSummary(false, false)}
              {renderExperience(false, false)}
              {renderEducation(false, false)}
              {renderSkills(false, false)}
            </div>
          </div>
        );

      case 'teal_sidebar':
        return (
          <div className="flex flex-row h-full">
            <div className="w-[70mm] bg-[#2D4F4F] text-white p-8 flex flex-col shrink-0">
              <div className="text-center mb-10" onClick={() => onSectionClick?.('info')}>
                {photoUrl && (
                    <div className="w-32 h-32 mx-auto mb-4 overflow-hidden rounded-xl border-4 border-white/10 shadow-lg">
                        <img src={photoUrl} className="w-full h-full object-cover" alt="Perfil" />
                    </div>
                )}
                <h1 className="font-bold text-[1.4em] uppercase tracking-widest mb-2 leading-tight">{fullName || 'Nome'}</h1>
              </div>
              <section className="mt-4" onClick={() => onSectionClick?.('info')}>
                <div className="space-y-3">
                  <ContactItem icon="fa-envelope" text={email} />
                  <ContactItem icon="fa-phone" text={phone} />
                  <ContactItem icon="fa-map-marker-alt" text={location} />
                </div>
              </section>
              <div className="mt-10 space-y-8">
                 {renderLanguages(true, false)}
                 {renderCertifications(true, false)}
              </div>
            </div>
            <div className="flex-1 p-12 bg-white space-y-8 overflow-hidden">
               {renderSummary(false, false)}
               {renderExperience(false, false)}
               {renderEducation(false, false)}
               {renderSkills(false, false)}
            </div>
          </div>
        );

      case 'corporate_gray':
        return (
          <div className="flex flex-col h-full bg-slate-50">
            <header className="bg-[#334155] text-white p-12 flex justify-between items-center" onClick={() => onSectionClick?.('info')}>
              <div className="flex items-center gap-6">
                {photoUrl && (
                    <img src={photoUrl} className="w-24 h-24 rounded-full border-4 border-slate-400/30 object-cover" alt="Perfil" />
                )}
                <div>
                  <h1 className="text-[2.4em] font-bold tracking-tight mb-1">{fullName || 'Seu Nome'}</h1>
                </div>
              </div>
              <div className="space-y-1">
                <ContactItem icon="fa-envelope" text={email} />
                <ContactItem icon="fa-phone" text={phone} />
                <ContactItem icon="fa-map-marker-alt" text={location} />
              </div>
            </header>
            <div className="p-12 -mt-6 flex-1 overflow-hidden">
              <div className="bg-white p-8 rounded shadow-sm space-y-8">
                {renderAllSections(false, false)}
              </div>
            </div>
          </div>
        );

      case 'swiss_minimal':
        return (
          <div className="p-16 flex flex-col h-full bg-white">
            <header className="grid grid-cols-12 gap-8 mb-16" onClick={() => onSectionClick?.('info')}>
              <div className="col-span-8">
                 {photoUrl && (
                    <div className="w-24 h-24 mb-6 grayscale overflow-hidden">
                        <img src={photoUrl} className="w-full h-full object-cover" alt="Perfil" />
                    </div>
                 )}
                <h1 className="text-[3.8em] font-black tracking-tighter leading-none mb-4 uppercase text-black">{fullName || 'Seu Nome'}</h1>
              </div>
              <div className="col-span-4 flex flex-col justify-end text-right space-y-1 text-[0.8em] font-bold uppercase text-black">
                <p>{email}</p>
                <p>{phone}</p>
                <p>{location}</p>
              </div>
            </header>
            <div className="flex-1 overflow-hidden space-y-8">
               {renderAllSections(false, false)}
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
                  <div className="flex gap-6 items-center">
                    {photoUrl && (
                         <img src={photoUrl} className="w-24 h-24 object-cover grayscale" alt="Perfil" />
                    )}
                    <h1 className="text-[3.5em] font-thin tracking-tight text-black mb-2">{fullName || 'Nome'}</h1>
                  </div>
                  <div className="text-right text-[0.8em] text-slate-900 font-bold space-y-1">
                      <p>{email}</p>
                      <p>{phone}</p>
                      <p>{location}</p>
                  </div>
                </div>
              </header>
              <div className="flex-1 space-y-8 overflow-hidden">
                {renderAllSections(false, false)}
              </div>
            </div>
          </div>
        );

      case 'modern_vitae':
        return (
          <div className="p-14 bg-[#fcfdfd] text-slate-900 flex flex-col h-full">
            <header className="flex items-center justify-between mb-12 border-b-2 border-slate-200 pb-10" onClick={() => onSectionClick?.('info')}>
              <div className="max-w-[70%] flex gap-6 items-center">
                {photoUrl && (
                    <img src={photoUrl} className="w-28 h-28 object-cover rounded-xl shadow-lg shadow-slate-200" alt="Perfil" />
                )}
                <div>
                    <h1 className="text-[2.2em] font-extrabold text-black leading-tight mb-2">{fullName || 'Nome'}</h1>
                    <div className="flex flex-wrap gap-4 mt-4 text-[0.85em] font-bold text-slate-900">
                    <span>{email}</span>
                    <span>{phone}</span>
                    <span>{location}</span>
                    </div>
                </div>
              </div>
            </header>
            <div className="flex-1 space-y-8 overflow-hidden">
               {renderAllSections(false, false)}
            </div>
          </div>
        );

      case 'classic_serif':
        return (
          <div className="p-16 text-center h-full bg-white flex flex-col overflow-hidden">
            <header className="mb-12 border-b-4 border-double border-slate-900 pb-8" onClick={() => onSectionClick?.('info')}>
              {photoUrl && (
                  <div className="w-32 h-32 mx-auto mb-6 border-4 border-double border-slate-200 rounded-full overflow-hidden">
                      <img src={photoUrl} className="w-full h-full object-cover grayscale" alt="Perfil" />
                  </div>
              )}
              <h1 className="text-[2.4em] font-bold uppercase tracking-widest mb-2 text-black">{fullName || 'Nome Completo'}</h1>
              <div className="mt-4 flex justify-center gap-6 text-[0.85em] uppercase font-sans font-bold text-slate-900">
                <span>{email}</span>
                <span>{phone}</span>
                <span>{location}</span>
              </div>
            </header>
            <div className="text-left flex-1 space-y-8 overflow-hidden">
               {renderAllSections(false, false)}
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
      style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily }}
    >
      {getTemplateLayout()}
    </div>
  );
};

export default React.memo(ResumePreview, (prev, next) => {
  return prev.template === next.template && 
         prev.fontSize === next.fontSize &&
         prev.fontFamily === next.fontFamily &&
         JSON.stringify(prev.data) === JSON.stringify(next.data);
});
