
import { GoogleGenAI } from "@google/genai";

/* Updated to follow SDK initialization guidelines exactly */
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
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
        /* Added systemInstruction to provide better persona context */
        systemInstruction: `Você é um assistente profissional especializado em redação de currículos. Melhore profissionalmente o texto para a seção de ${context}. Seja direto, use verbos de ação e mantenha um tom executivo.`,
      },
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Erro Gemini (Enhance):", error);
    return text;
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
      },
    });
    const skillsText = response.text || '';
    return skillsText.split(',').map(s => s.trim()).filter(Boolean);
  } catch (error) {
    console.error("Erro Gemini (Skills):", error);
    return [];
  }
};
