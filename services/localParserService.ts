
import { ResumeData, Experience, Education, Skill } from "../types";

// Siglas de estados brasileiros para detecção de localização
const ESTADOS_BR = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

// Utilitário para limpar marcadores (bullets) do início de strings
const cleanBullet = (text: string): string => {
  return text.replace(/^[\s•\-\*·>]+/, '').trim();
};

export const parseResumeLocally = (text: string): Partial<ResumeData> => {
  // 1. Pré-processamento: Limpar linhas vazias e espaços excessivos
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

  // --- REGEX PATTERNS ---
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  // Suporta: (11) 99999-9999, 11 999999999, +55...
  const phoneRegex = /(?:(?:\+|00)?(55)\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})\-?(\d{4}))/;
  const linkedinRegex = /(?:linkedin\.com\/in\/|www\.linkedin\.com\/in\/)([\w\-]+)/i;
  // Captura Cidade - UF ou Cidade, UF
  const locationRegex = new RegExp(`([a-zA-ZÀ-ÿ\\s]+)[\\s,/-]+(${ESTADOS_BR.join('|')})`, 'i');
  
  // Regex poderosa para detectar intervalos de datas em linhas de experiência/educação
  // Ex: "Jan 2020 - Atual", "01/2019 a 12/2020", "2018 – 2019"
  const dateRangeRegex = /((?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2})[\/\s,.]*(?:\d{4}|\d{2}))\s*(?:-|–|a|to|at[ée])\s*((?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2})[\/\s,.]*(?:\d{4}|\d{2})|atual|presente|current|present|hoje|now)/i;
  
  // Fallback para apenas um ano isolado (Ex: "2020")
  const yearRegex = /^(19|20)\d{2}$/;

  // --- 2. EXTRAÇÃO DE CONTATO E CABEÇALHO (Topo do arquivo) ---
  let headerEndIndex = 0;
  
  // Analisa as primeiras 20 linhas buscando contatos
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i];

    if (!data.personalInfo.email && emailRegex.test(line)) {
      data.personalInfo.email = line.match(emailRegex)![0];
    }
    if (!data.personalInfo.phone && phoneRegex.test(line)) {
      data.personalInfo.phone = line.match(phoneRegex)![0];
    }
    if (!data.personalInfo.linkedin && linkedinRegex.test(line)) {
      // Tenta pegar a URL completa ou monta
      const match = line.match(linkedinRegex);
      if (match) data.personalInfo.linkedin = match[0];
    }
    if (!data.personalInfo.location && locationRegex.test(line)) {
      data.personalInfo.location = line.match(locationRegex)![0];
    }
  }

  // Heurística de Nome e Cargo:
  // O nome geralmente é a primeira linha com texto substancial que NÃO é um contato
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    if (
      !emailRegex.test(line) && 
      !phoneRegex.test(line) && 
      !linkedinRegex.test(line) &&
      line.length > 3 && 
      line.length < 50 &&
      !line.includes('Curriculum') && 
      !line.includes('CV')
    ) {
      if (!data.personalInfo.fullName) {
        data.personalInfo.fullName = cleanBullet(line).toUpperCase();
        // Assume que a próxima linha válida pode ser o cargo
        const nextLine = lines[i + 1];
        if (nextLine && !emailRegex.test(nextLine) && !phoneRegex.test(nextLine) && nextLine.length < 50) {
          data.personalInfo.jobTitle = cleanBullet(nextLine);
        }
        headerEndIndex = i + 2; // Começa a procurar seções após o cabeçalho
        break;
      }
    }
  }

  // --- 3. DETECÇÃO DE SEÇÕES ---
  
  // Padrões Regex para identificar cabeçalhos de seção (Case insensitive)
  const patterns = {
    experience: /^(?:experi[êe]ncia|profission|hist[óo]rico|work|employment|career|trajet[óo]ria)/i,
    education: /^(?:educa[çc][ãa]o|forma[çc][ãa]o|acad[êe]mic|escolaridade|education|academic|formation)/i,
    skills: /^(?:habilidade|compet[êe]ncia|skill|conhecimento|aptid|tech|ferramenta)/i,
    languages: /^(?:idioma|língua|language)/i,
    courses: /^(?:curso|certifica|extens|workshop)/i,
    summary: /^(?:resumo|perfil|sobre|objetivo|summary|about|profile|objective)/i
  };

  let currentSection: 'summary' | 'experience' | 'education' | 'skills' | 'languages' | 'courses' | null = null;

  for (let i = headerEndIndex; i < lines.length; i++) {
    const line = lines[i];
    
    // Verifica se a linha é um Cabeçalho de Seção
    // Critérios: Curta (< 40 chars), sem números (geralmente), bate com regex
    if (line.length < 40) {
      let isHeader = false;
      
      // Checa cada padrão
      for (const [key, regex] of Object.entries(patterns)) {
        if (regex.test(line)) {
          currentSection = key as any;
          isHeader = true;
          break;
        }
      }
      
      if (isHeader) continue; // Pula a linha do cabeçalho
    }

    // Processamento baseado na Seção Atual
    if (!currentSection) {
      // Se ainda não achou seção, mas a linha parece um resumo (longa), adiciona ao resumo
      if (line.length > 100 && !data.summary) {
        currentSection = 'summary';
        data.summary += line + " ";
      }
      continue;
    }

    switch (currentSection) {
      case 'summary':
        // Adiciona ao resumo, evitando adicionar linhas que parecem datas ou contatos soltos
        if (!dateRangeRegex.test(line)) {
          data.summary += line + " ";
        }
        break;

      case 'experience':
        // Nova Experiência detectada se:
        // 1. Contém intervalo de datas (Ex: 2020 - 2021)
        // 2. OU é uma linha curta em caixa alta (possível empresa/cargo) seguida de data na prox linha
        const dateMatch = line.match(dateRangeRegex);
        
        if (dateMatch) {
          // Nova entrada baseada em data encontrada
          const dates = dateMatch;
          const textWithoutDate = line.replace(dateRangeRegex, '').trim();
          
          data.experiences.push({
            id: Math.random().toString(36).substr(2, 9),
            position: textWithoutDate ? cleanBullet(textWithoutDate) : "Cargo / Empresa",
            company: "", // Difícil distinguir sem IA, usuário edita depois
            startDate: dates[1] || "",
            endDate: dates[2] || "",
            current: dates[2]?.toLowerCase().includes('atual') || dates[2]?.toLowerCase().includes('present') || false,
            description: "",
            location: ""
          });
        } else if (data.experiences.length > 0) {
          // Adiciona texto à descrição da última experiência
          const lastExp = data.experiences[data.experiences.length - 1];
          
          // Heurística: Se a linha é muito curta e parece um local ou nome de empresa
          if (line.length < 50 && !lastExp.company && !lastExp.description) {
            lastExp.company = cleanBullet(line);
          } else {
            // Adiciona como descrição (bullet point)
            lastExp.description += (lastExp.description ? "\n" : "") + cleanBullet(line);
          }
        } else {
           // Caso encontre texto antes da primeira data, cria uma entrada genérica
           if (line.length > 3) {
             data.experiences.push({
               id: Math.random().toString(36).substr(2, 9),
               position: cleanBullet(line),
               company: "",
               startDate: "",
               endDate: "",
               current: false,
               description: "",
               location: ""
             });
           }
        }
        break;

      case 'education':
        // Similar a experiência, foca em datas ou nomes de instituições
        const eduDateMatch = line.match(dateRangeRegex) || line.match(yearRegex);
        
        if (eduDateMatch) {
            let start = "", end = "";
            if (line.match(dateRangeRegex)) {
                 const m = line.match(dateRangeRegex)!;
                 start = m[1]; 
                 end = m[2];
            } else {
                 end = line.match(yearRegex)![0];
            }
            
            const textWithoutDate = line.replace(dateRangeRegex, '').replace(yearRegex, '').trim();

            data.education.push({
              id: Math.random().toString(36).substr(2, 9),
              institution: textWithoutDate ? cleanBullet(textWithoutDate) : "Instituição de Ensino",
              degree: "",
              field: "",
              startDate: start,
              endDate: end,
              location: ""
            });
        } else if (data.education.length > 0) {
           const lastEdu = data.education[data.education.length - 1];
           if (!lastEdu.degree) {
             lastEdu.degree = cleanBullet(line);
           } else if (!lastEdu.field) {
             lastEdu.field = cleanBullet(line);
           }
        } else {
           // Texto solto antes da data
           if (line.length > 4) {
             data.education.push({
                id: Math.random().toString(36).substr(2, 9),
                institution: cleanBullet(line),
                degree: "",
                field: "",
                startDate: "",
                endDate: "",
                location: ""
             });
           }
        }
        break;

      case 'skills':
        // Quebra por delimitadores comuns: vírgula, pipe, bullet, tab
        const skillItems = line.split(/[,;|•·\t]| {2,}/);
        skillItems.forEach(item => {
          const cleaned = cleanBullet(item);
          // Filtra ruídos e frases muito longas
          if (cleaned.length > 1 && cleaned.length < 40) {
            data.skills.push({
              id: Math.random().toString(36).substr(2, 9),
              name: cleaned,
              level: 'Intermediate'
            });
          }
        });
        break;
        
      case 'languages':
        // Tenta detectar idioma e nível
        const parts = line.split(/[-–:]/);
        if (parts.length > 0) {
            data.languages.push({
                id: Math.random().toString(36).substr(2, 9),
                name: cleanBullet(parts[0]),
                level: parts[1] ? parts[1].trim() : "Intermediário",
                percentage: 60
            });
        }
        break;
        
      case 'courses':
        // Extrai cursos livres
        data.courses.push({
             id: Math.random().toString(36).substr(2, 9),
             name: cleanBullet(line),
             institution: "",
             year: ""
        });
        break;
    }
  }

  // Limpezas finais
  data.summary = data.summary.trim();
  if (!data.personalInfo.fullName) data.personalInfo.fullName = "SEU NOME";

  return data;
};
