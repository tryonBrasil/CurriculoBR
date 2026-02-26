
import { GoogleGenAI } from "@google/genai";

/* Updated to follow SDK initialization guidelines exactly */
const getAI = () => {
  // The API key must be obtained exclusively from the environment variable process.env.API_KEY
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Streaming version for real-time feedback
export const enhanceTextStream = async (text: string, context: string, onUpdate: (text: string) => void): Promise<void> => {
  if (!text) return;
  const ai = getAI();
  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [{ 
          text: `Melhore este texto: "${text}"` 
        }] 
      },
      config: {
        /* Added systemInstruction to provide better persona context */
        systemInstruction: `Você é um assistente profissional especializado em redação de currículos. Melhore profissionalmente o texto para a seção de ${context}. Seja direto, use verbos de ação e mantenha um tom executivo.`,
        thinkingConfig: { thinkingBudget: 0 }, // Speed optimization
      },
    });

    let accumulated = '';
    for await (const chunk of response) {
      if (chunk.text) {
        accumulated += chunk.text;
        onUpdate(accumulated);
      }
    }
  } catch (error) {
    console.error("Erro Gemini (Enhance Stream):", error);
    onUpdate(text); // Fallback logic
  }
};

export const enhanceText = async (text: string, context: string): Promise<string> => {
  if (!text) return text;
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [{ 
          text: `Melhore este texto: "${text}"` 
        }] 
      },
      config: {
        systemInstruction: `Você é um assistente profissional especializado em redação de currículos. Melhore profissionalmente o texto para a seção de ${context}. Seja direto, use verbos de ação e mantenha um tom executivo.`,
        thinkingConfig: { thinkingBudget: 0 }, // Speed optimization
      },
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Erro Gemini (Enhance):", error);
    return text;
  }
};

// Streaming version for real-time feedback
export const generateSummaryStream = async (jobTitle: string, skills: string[], experiences: string[], onUpdate: (text: string) => void): Promise<void> => {
  const ai = getAI();
  try {
    const prompt = `Escreva um resumo para um ${jobTitle}. Habilidades: ${skills.join(', ')}. Experiências: ${experiences.join('; ')}.`;
    
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction: "Escreva um resumo profissional atraente de 2 a 3 frases. Use um tom profissional, focado em resultados e competências.",
        thinkingConfig: { thinkingBudget: 0 }, // Speed optimization
      },
    });

    let accumulated = '';
    for await (const chunk of response) {
      if (chunk.text) {
        accumulated += chunk.text;
        onUpdate(accumulated);
      }
    }
  } catch (error) {
    console.error("Erro Gemini (Summary Stream):", error);
  }
};

export const generateSummary = async (jobTitle: string, skills: string[], experiences: string[]): Promise<string> => {
  const ai = getAI();
  try {
    const prompt = `Escreva um resumo para um ${jobTitle}. Habilidades: ${skills.join(', ')}. Experiências: ${experiences.join('; ')}.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction: "Escreva um resumo profissional atraente de 2 a 3 frases. Use um tom profissional, focado em resultados e competências.",
        thinkingConfig: { thinkingBudget: 0 }, // Speed optimization
      },
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Erro Gemini (Summary):", error);
    return '';
  }
};

export const suggestSkills = async (jobTitle: string): Promise<string[]> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [{ 
          text: `Sugira competências para ${jobTitle}.` 
        }] 
      },
      config: {
        systemInstruction: "Sugira exatamente 10 habilidades (técnicas e interpessoais) fundamentais. Retorne apenas os nomes das habilidades separados por vírgula, sem explicações ou numeração.",
        thinkingConfig: { thinkingBudget: 0 }, // Speed optimization
      },
    });
    const skillsText = response.text || '';
    return skillsText.split(',').map(s => s.trim()).filter(Boolean);
  } catch (error) {
    console.error("Erro Gemini (Skills):", error);
    return [];
  }
};

export const generateCoverLetterStream = async (
  params: {
    candidateName: string;
    jobTitle: string;
    company: string;
    tone: 'formal' | 'dinamico' | 'criativo';
    highlights: string;
    experiences: string;
    skills: string;
  },
  onUpdate: (text: string) => void
): Promise<void> => {
  const ai = getAI();
  const toneMap = {
    formal: 'formal e profissional, com linguagem executiva',
    dinamico: 'dinâmico e confiante, com energia e proatividade',
    criativo: 'criativo e autêntico, mostrando personalidade e diferencial',
  };
  const prompt = `
    Candidato: ${params.candidateName}
    Vaga: ${params.jobTitle} na empresa ${params.company}
    Tom desejado: ${toneMap[params.tone]}
    Experiências relevantes: ${params.experiences}
    Habilidades: ${params.skills}
    Destaques adicionais: ${params.highlights || 'Nenhum'}
  `;
  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction: `Você é um especialista em redação de cartas de apresentação profissionais para o mercado brasileiro. Escreva uma carta completa com: saudação, parágrafo de abertura impactante, 2 parágrafos de experiências e valor, encerramento com call-to-action. Use o nome do candidato. Sem títulos ou cabeçalhos — apenas o corpo da carta. Máximo de 4 parágrafos, 250-350 palavras.`,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    let accumulated = '';
    for await (const chunk of response) {
      if (chunk.text) { accumulated += chunk.text; onUpdate(accumulated); }
    }
  } catch (error) {
    console.error('Erro Gemini (Cover Letter):', error);
    onUpdate('Erro ao gerar carta. Verifique sua chave de API e tente novamente.');
  }
};

export const parseResumeWithAI = async (text: string): Promise<any> => {
  const ai = getAI();
  try {
    const prompt = `
      Você é um especialista em análise de currículos (parser). 
      Extraia as informações do texto abaixo e retorne APENAS um objeto JSON válido seguindo estritamente esta estrutura TypeScript:

      interface ResumeData {
        personalInfo: { 
          fullName: string; 
          email: string; 
          phone: string; 
          location: string; 
          website: string; 
          linkedin: string; 
          jobTitle: string; 
        };
        summary: string;
        experiences: { 
          id: string; // Gere um ID aleatório
          company: string; 
          position: string; 
          location: string; 
          startDate: string; 
          endDate: string; 
          current: boolean; 
          description: string; 
        }[];
        education: { 
          id: string; // Gere um ID aleatório
          institution: string; 
          degree: string; 
          field: string; 
          location: string; 
          startDate: string; 
          endDate: string; 
        }[];
        skills: { 
          id: string; // Gere um ID aleatório
          name: string; 
          level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'; // Use 'Intermediate' como padrão se não souber
        }[];
        languages: { 
          id: string; // Gere um ID aleatório
          name: string; 
          level: string; 
          percentage: number; // Estime de 0 a 100
        }[];
        courses: { 
          id: string; // Gere um ID aleatório
          name: string; 
          institution: string; 
          year: string; 
        }[];
      }

      Texto do Currículo:
      "${text}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 }, // Speed optimization
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return {};
  } catch (error) {
    console.error("Erro Gemini (Parse):", error);
    throw error;
  }
};

export interface ATSAnalysis {
  score: number; // 0-100
  summary: string;
  strengths: string[];
  improvements: string[];
  keywords: string[];
  verdict: 'fraco' | 'regular' | 'bom' | 'excelente';
}

export const analyzeResumeATS = async (resumeText: string): Promise<ATSAnalysis> => {
  const ai = getAI();
  try {
    const prompt = `Analise este currículo do ponto de vista de um sistema ATS (Applicant Tracking System) e de um recrutador brasileiro. 
    
Currículo:
"""
${resumeText}
"""

Retorne APENAS um JSON válido com esta estrutura:
{
  "score": <número de 0 a 100>,
  "summary": "<resumo da análise em 1-2 frases>",
  "strengths": ["<ponto forte 1>", "<ponto forte 2>", "<ponto forte 3>"],
  "improvements": ["<melhoria prioritária 1>", "<melhoria 2>", "<melhoria 3>"],
  "keywords": ["<palavra-chave detectada 1>", "<palavra-chave 2>", "<palavra-chave 3>", "<palavra-chave 4>", "<palavra-chave 5>"],
  "verdict": "<'fraco' | 'regular' | 'bom' | 'excelente'>"
}

Critérios de pontuação ATS:
- Informações de contato completas: +15pts
- Resumo/objetivo profissional: +15pts
- Experiência profissional com descrições detalhadas: +25pts
- Educação: +15pts
- Habilidades técnicas relevantes: +15pts
- Idiomas: +10pts
- Cursos/certificações: +5pts
Penalize: falta de palavras-chave, texto vago, ausência de datas, seções incompletas.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error('No response');
  } catch (error) {
    console.error('Erro Gemini (ATS):', error);
    throw error;
  }
};

export const generateInterviewQuestions = async (position: string, skills: string[]): Promise<string[]> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: `Gere 5 perguntas de entrevista para o cargo "${position}" com habilidades: ${skills.join(', ')}` }] },
      config: {
        systemInstruction: 'Retorne exatamente 5 perguntas de entrevista relevantes para o cargo e habilidades mencionados, focadas no mercado brasileiro. Retorne apenas as perguntas, uma por linha, sem numeração ou marcadores.',
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const text = response.text || '';
    return text.split('\n').filter(q => q.trim().length > 0).slice(0, 5);
  } catch (error) {
    console.error('Erro Gemini (Interview):', error);
    return [];
  }
};
