
import { ResumeData, Experience, Education, Skill } from "../types";

// Siglas de estados brasileiros para detecção de localização
const ESTADOS_BR = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export const parseResumeLocally = (text: string): Partial<ResumeData> => {
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 1 && !/Página \d+|Page \d+/i.test(l));
  
  const data: any = {
    personalInfo: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      jobTitle: ""
    },
    experiences: [],
    education: [],
    skills: [],
    summary: ""
  };

  if (lines.length === 0) return data;

  // --- 1. EXTRAÇÃO DE CONTATO E CABEÇALHO ---
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-.\s]?\d{4}/;
  const linkedinRegex = /linkedin\.com\/in\/[\w\-]+/;
  const locationRegex = new RegExp(`([^,.-]+)[,.-]\s*(${ESTADOS_BR.join('|')})`, 'i');

  let nameFound = false;
  
  lines.slice(0, 15).forEach((line) => {
    // Detectar E-mail
    if (!data.personalInfo.email && emailRegex.test(line)) {
      data.personalInfo.email = line.match(emailRegex)![0];
      return;
    }
    // Detectar Telefone
    if (!data.personalInfo.phone && phoneRegex.test(line)) {
      data.personalInfo.phone = line.match(phoneRegex)![0];
      return;
    }
    // Detectar LinkedIn
    if (!data.personalInfo.linkedin && linkedinRegex.test(line)) {
      data.personalInfo.linkedin = line.match(linkedinRegex)![0];
      return;
    }
    // Detectar Localização (Cidade - UF)
    if (!data.personalInfo.location && locationRegex.test(line)) {
      data.personalInfo.location = line.match(locationRegex)![0];
      return;
    }
    // Heurística de Nome: A primeira linha que não é contato e tem 2+ palavras
    if (!nameFound && line.split(' ').length >= 2 && line.length < 50 && !line.includes('/') && !line.includes('@')) {
      data.personalInfo.fullName = line.toUpperCase();
      nameFound = true;
    } else if (nameFound && !data.personalInfo.jobTitle && line.length < 40) {
      // Geralmente a linha após o nome é o cargo atual/pretendido
      data.personalInfo.jobTitle = line;
    }
  });

  // --- 2. DIVISÃO DE SEÇÕES ---
  const sectionKeywords: { [key: string]: string[] } = {
    summary: ["RESUMO", "PERFIL", "OBJETIVO", "SOBRE", "SUMMARY", "ABOUT"],
    experience: ["EXPERIÊNCIA", "HISTÓRICO", "TRAJETÓRIA", "PROFISSIONAL", "WORK EXPERIENCE", "EXPERIENCE"],
    education: ["FORMAÇÃO", "EDUCAÇÃO", "ACADÊMICO", "CURSOS", "EDUCATION", "ACADEMIC"],
    skills: ["HABILIDADES", "COMPETÊNCIAS", "SKILLS", "CONHECIMENTOS", "TECHNOLOGIES"]
  };

  let currentSection = "";
  const dateRegex = /(?:\d{2}\/)?\d{4}|Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez|Atualmente|Presente/i;

  lines.forEach((line) => {
    const upperLine = line.toUpperCase();
    let isHeader = false;

    // Verificar se a linha é um cabeçalho de seção
    for (const [section, keywords] of Object.entries(sectionKeywords)) {
      if (keywords.some(k => upperLine === k || (upperLine.includes(k) && upperLine.length < 25))) {
        currentSection = section;
        isHeader = true;
        break;
      }
    }

    if (isHeader) return;

    if (currentSection === 'summary') {
      data.summary += line + " ";
    } 
    else if (currentSection === 'experience') {
      // Se a linha tem uma data, provavelmente é um novo cargo/item
      if (dateRegex.test(line)) {
        const id = Math.random().toString(36).substr(2, 9);
        // Tenta extrair a data da linha
        const dates = line.match(new RegExp(dateRegex.source, 'gi'));
        const dateStr = dates ? dates.join(' - ') : "";
        
        data.experiences.push({
          id,
          position: line.replace(dateRegex, '').replace(/[-–|]/g, '').trim() || "Cargo",
          company: "Empresa",
          description: "",
          startDate: dates?.[0] || "",
          endDate: dates?.[1] || (line.toLowerCase().includes('atualmente') ? 'Atualmente' : ""),
          location: ""
        });
      } else if (data.experiences.length > 0) {
        const lastExp = data.experiences[data.experiences.length - 1];
        if (lastExp.description.length < 500) {
          lastExp.description += (lastExp.description ? "\n" : "") + line;
        }
      }
    } 
    else if (currentSection === 'education') {
      if (dateRegex.test(line)) {
        const id = Math.random().toString(36).substr(2, 9);
        data.education.push({
          id,
          institution: line.replace(dateRegex, '').replace(/[-–|]/g, '').trim() || "Instituição",
          degree: "Grau",
          field: "",
          startDate: "",
          endDate: line.match(dateRegex)?.[0] || ""
        });
      }
    } 
    else if (currentSection === 'skills') {
      // Habilidades costumam ser separadas por vírgula, pipe ou bullets
      const items = line.split(/[,;|•\t]| {2,}/);
      items.forEach(item => {
        const cleaned = item.trim().replace(/^[-•]\s*/, '');
        if (cleaned.length > 1 && cleaned.length < 30) {
          data.skills.push({
            id: Math.random().toString(36).substr(2, 9),
            name: cleaned,
            level: 'Intermediate'
          });
        }
      });
    }
  });

  // Limpezas finais
  data.summary = data.summary.trim();
  // Se não achou nome, usa o nome do arquivo ou placeholder
  if (!data.personalInfo.fullName) data.personalInfo.fullName = "SEU NOME COMPLETO";

  return data;
};
