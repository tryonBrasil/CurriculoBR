
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
