
import { ResumeData } from "../types";

// Siglas de estados brasileiros para detecção de localização
const ESTADOS_BR = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

// Utilitário para limpar marcadores (bullets) do início de strings
const cleanBullet = (text: string): string => {
  return text.replace(/^[\s•\-\*·>]+/, '').trim();
};

export const parseResumeLocally = (text: string): Partial<ResumeData> => {
  // 1. Pré-processamento
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 1 && !/Página \d+|Page \d+/i.test(l));
  
  const data: any = {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
    experiences: [],
    education: [],
    skills: ""
  };

  if (lines.length === 0) return data;

  // --- REGEX PATTERNS ---
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(?:(?:\+|00)?(55)\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})\-?(\d{4}))/;
  const locationRegex = new RegExp(`([a-zA-ZÀ-ÿ\\s]+)[\\s,/-]+(${ESTADOS_BR.join('|')})`, 'i');
  
  const dateRangeRegex = /((?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2})[\/\s,.]*(?:\d{4}|\d{2}))\s*(?:-|–|a|to|at[ée])\s*((?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2})[\/\s,.]*(?:\d{4}|\d{2})|atual|presente|current|present|hoje|now)/i;
  const yearRegex = /^(19|20)\d{2}$/;

  // --- 2. EXTRAÇÃO DE CONTATO E CABEÇALHO ---
  let headerEndIndex = 0;
  
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i];

    if (!data.email && emailRegex.test(line)) {
      data.email = line.match(emailRegex)![0];
    }
    if (!data.phone && phoneRegex.test(line)) {
      data.phone = line.match(phoneRegex)![0];
    }
    if (!data.location && locationRegex.test(line)) {
      data.location = line.match(locationRegex)![0];
    }
  }

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    if (
      !emailRegex.test(line) && 
      !phoneRegex.test(line) && 
      line.length > 3 && 
      line.length < 50 &&
      !line.includes('Curriculum') && 
      !line.includes('CV')
    ) {
      if (!data.fullName) {
        data.fullName = cleanBullet(line).toUpperCase();
        headerEndIndex = i + 1;
        break;
      }
    }
  }

  // --- 3. DETECÇÃO DE SEÇÕES ---
  const patterns = {
    experience: /^(?:experi[êe]ncia|profission|hist[óo]rico|work|employment|career|trajet[óo]ria)/i,
    education: /^(?:educa[çc][ãa]o|forma[çc][ãa]o|acad[êe]mic|escolaridade|education|academic|formation)/i,
    skills: /^(?:habilidade|compet[êe]ncia|skill|conhecimento|aptid|tech|ferramenta)/i,
    summary: /^(?:resumo|perfil|sobre|objetivo|summary|about|profile|objective)/i
  };

  let currentSection: 'summary' | 'experience' | 'education' | 'skills' | null = null;
  let accumulatedSkills: string[] = [];

  for (let i = headerEndIndex; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.length < 40) {
      let isHeader = false;
      for (const [key, regex] of Object.entries(patterns)) {
        if (regex.test(line)) {
          currentSection = key as any;
          isHeader = true;
          break;
        }
      }
      if (isHeader) continue;
    }

    if (!currentSection) {
      if (line.length > 100 && !data.summary) {
        currentSection = 'summary';
        data.summary += line + " ";
      }
      continue;
    }

    switch (currentSection) {
      case 'summary':
        if (!dateRangeRegex.test(line)) {
          data.summary += line + " ";
        }
        break;

      case 'experience':
        const dateMatch = line.match(dateRangeRegex);
        
        if (dateMatch) {
          const dates = dateMatch;
          const textWithoutDate = line.replace(dateRangeRegex, '').trim();
          
          data.experiences.push({
            id: Math.random().toString(36).substr(2, 9),
            position: textWithoutDate ? cleanBullet(textWithoutDate) : "Cargo",
            company: "Empresa", 
            period: `${dates[1]} - ${dates[2]}`,
            description: ""
          });
        } else if (data.experiences.length > 0) {
          const lastExp = data.experiences[data.experiences.length - 1];
          if (line.length < 50 && lastExp.company === "Empresa") {
             lastExp.company = cleanBullet(line);
          } else {
             lastExp.description += (lastExp.description ? "\n" : "") + cleanBullet(line);
          }
        } else {
           if (line.length > 3) {
             data.experiences.push({
               id: Math.random().toString(36).substr(2, 9),
               position: cleanBullet(line),
               company: "Empresa",
               period: "",
               description: ""
             });
           }
        }
        break;

      case 'education':
        const eduDateMatch = line.match(dateRangeRegex) || line.match(yearRegex);
        
        if (eduDateMatch) {
            let period = "";
            if (line.match(dateRangeRegex)) {
                 const m = line.match(dateRangeRegex)!;
                 period = `${m[1]} - ${m[2]}`;
            } else {
                 period = line.match(yearRegex)![0];
            }
            
            const textWithoutDate = line.replace(dateRangeRegex, '').replace(yearRegex, '').trim();

            data.education.push({
              id: Math.random().toString(36).substr(2, 9),
              school: textWithoutDate ? cleanBullet(textWithoutDate) : "Instituição",
              degree: "",
              year: period
            });
        } else if (data.education.length > 0) {
           const lastEdu = data.education[data.education.length - 1];
           if (!lastEdu.degree) {
             lastEdu.degree = cleanBullet(line);
           }
        } else {
           if (line.length > 4) {
             data.education.push({
                id: Math.random().toString(36).substr(2, 9),
                school: cleanBullet(line),
                degree: "",
                year: ""
             });
           }
        }
        break;

      case 'skills':
        const skillItems = line.split(/[,;|•·\t]| {2,}/);
        skillItems.forEach(item => {
          const cleaned = cleanBullet(item);
          if (cleaned.length > 1 && cleaned.length < 60) {
            accumulatedSkills.push(cleaned);
          }
        });
        break;
    }
  }

  if (accumulatedSkills.length > 0) {
    data.skills = accumulatedSkills.join(', ');
  }

  data.summary = data.summary.trim();
  if (!data.fullName) data.fullName = "SEU NOME";

  return data;
};
