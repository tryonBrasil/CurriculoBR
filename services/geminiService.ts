import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const enhanceTextStream = async (text: string, context: string, onUpdate: (text: string) => void): Promise<void> => {
  if (!text) return;
  const ai = getAI();
  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: `Melhore profissionalmente este texto para a seção de ${context} de um currículo: "${text}"`,
      config: {
        systemInstruction: "Você é um assistente sênior de RH. Melhore o texto para ser impactante, usando verbos de ação e mantendo o tom executivo. Retorne apenas o texto melhorado.",
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
    throw error;
  }
};

export const generateSummaryStream = async (jobTitle: string, skills: string, experiences: string[], onUpdate: (text: string) => void): Promise<void> => {
  const ai = getAI();
  try {
    const prompt = `Escreva um resumo profissional para um ${jobTitle}. Habilidades: ${skills}. Experiências principais: ${experiences.join('; ')}.`;
    
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Escreva um resumo atraente de 2 a 3 frases. Tom profissional, focado em conquistas.",
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
    throw error;
  }
};

export const suggestSkills = async (jobTitle: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Sugira as 8 principais habilidades técnicas e comportamentais para o cargo de ${jobTitle}.`,
      config: {
        systemInstruction: "Retorne apenas os nomes das habilidades separados por vírgula.",
      },
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Erro Gemini (Skills):", error);
    return '';
  }
};

export const parseResumeWithAI = async (text: string): Promise<any> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extraia as informações deste currículo: "${text}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            location: { type: Type.STRING },
            summary: { type: Type.STRING },
            skills: { type: Type.STRING },
            experiences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  company: { type: Type.STRING },
                  position: { type: Type.STRING },
                  period: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ["id", "company", "position", "period", "description"]
              }
            },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  school: { type: Type.STRING },
                  degree: { type: Type.STRING },
                  year: { type: Type.STRING },
                },
                required: ["id", "school", "degree", "year"]
              }
            },
            languages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  level: { type: Type.STRING },
                },
                required: ["id", "name", "level"]
              }
            },
            certifications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  issuer: { type: Type.STRING },
                  year: { type: Type.STRING },
                },
                required: ["id", "name", "issuer", "year"]
              }
            }
          },
          required: ["fullName", "email", "phone", "location", "summary", "experiences", "education", "skills"]
        }
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Erro Gemini (Parse):", error);
    throw error;
  }
};

export const analyzeJobMatch = async (resumeData: any, jobDescription: string): Promise<any> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise este currículo: ${JSON.stringify(resumeData)} para esta vaga: ${jobDescription}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            missingKeywords: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            feedback: { type: Type.STRING },
            suggestedChanges: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["score", "missingKeywords", "feedback", "suggestedChanges"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Erro Gemini (Job Match):", error);
    throw error;
  }
};

export const generateCoverLetterStream = async (resumeData: any, targetRole: string, companyName: string, onUpdate: (text: string) => void): Promise<void> => {
  const ai = getAI();
  try {
    const prompt = `Escreva uma carta de apresentação para a vaga de "${targetRole}" na empresa "${companyName || 'Empresa'}". Baseie-se nestes dados: ${resumeData.fullName}, ${resumeData.skills}, Experiências: ${resumeData.experiences?.map((e: any) => e.position).join(', ')}.`;

    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Você é um especialista em Marketing Pessoal. Escreva uma carta profissional, persuasiva e cordial. Não use placeholders como [Data]. Vá direto ao texto.",
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
    console.error("Erro Gemini (Cover Letter):", error);
    throw error;
  }
};