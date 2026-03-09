
import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  // process.env.API_KEY é injetado pelo vite.config.ts via `define` a partir de VITE_GEMINI_API_KEY.
  // Se estiver vazio/ausente, lança erro claro ao invés de falhar silenciosamente com HTTP 400/401.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error(
      'Chave da API Gemini não configurada. ' +
      'Adicione VITE_GEMINI_API_KEY nas variáveis de ambiente do Vercel ' +
      '(Project Settings → Environment Variables) ou no arquivo .env.local para desenvolvimento local. ' +
      'Obtenha sua chave em: https://aistudio.google.com/app/apikey'
    );
  }
  return new GoogleGenAI({ apiKey });
};

// ---------------------------------------------------------------------------
// BUGS CORRIGIDOS:
//
// BUG 1 — thinkingConfig: { thinkingBudget: 0 } ← CAUSA RAIZ DE TUDO
//   O gemini-2.0-flash NÃO suporta thinkingConfig. Esse campo existe apenas
//   nos modelos gemini-2.5-flash e gemini-2.5-pro.
//   Resultado: HTTP 400 Bad Request em TODAS as chamadas → catch silencioso → IA "não funciona".
//   CORREÇÃO: thinkingConfig removido de todas as chamadas.
//
// BUG 2 — contents sem role: 'user'
//   O SDK v1.x espera { role: 'user', parts: [...] }.
//   Passar { parts: [...] } sem role é ambíguo e pode falhar em alguns endpoints.
//   CORREÇÃO: role: 'user' adicionado em todos os contents.
//
// BUG 3 — enhanceTextStream: onUpdate(text) no catch devolvia o texto original sem aviso
//   Ao falhar, a função sobreescrevia o campo com o texto original sem nenhum toast de erro.
//   CORREÇÃO: erro relançado para o App.tsx tratar via showToast.
//
// BUG 4 — parseResumeWithAI e analyzeResumeATS: JSON.parse sem sanitização
//   O modelo pode retornar ```json ... ``` com markdown fences mesmo com
//   responseMimeType: 'application/json', causando SyntaxError no JSON.parse.
//   CORREÇÃO: fences removidas antes do parse.
// ---------------------------------------------------------------------------

export const enhanceTextStream = async (
  text: string,
  context: string,
  onUpdate: (text: string) => void
): Promise<void> => {
  if (!text) return;
  const ai = getAI();

  // BUG 1 FIX: thinkingConfig removido (não suportado pelo gemini-2.0-flash)
  // BUG 3 FIX: sem try/catch — relança o erro para o App.tsx exibir showToast
  const response = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: `Melhore este texto: "${text}"` }] }], // BUG 2 FIX
    config: {
      systemInstruction: `Você é um assistente profissional especializado em redação de currículos. Melhore profissionalmente o texto para a seção de ${context}. Seja direto, use verbos de ação e mantenha um tom executivo.`,
    },
  });

  let accumulated = '';
  for await (const chunk of response) {
    if (chunk.text) {
      accumulated += chunk.text;
      onUpdate(accumulated);
    }
  }
};

export const enhanceText = async (text: string, context: string): Promise<string> => {
  if (!text) return text;
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Melhore este texto: "${text}"` }] }],
      config: {
        systemInstruction: `Você é um assistente profissional especializado em redação de currículos. Melhore profissionalmente o texto para a seção de ${context}. Seja direto, use verbos de ação e mantenha um tom executivo.`,
      },
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Erro Gemini (Enhance):", error);
    return text;
  }
};

export const generateSummaryStream = async (
  jobTitle: string,
  skills: string[],
  experiences: string[],
  onUpdate: (text: string) => void
): Promise<void> => {
  const ai = getAI();
  const prompt = `Escreva um resumo para um ${jobTitle}. Habilidades: ${skills.join(', ')}. Experiências: ${experiences.join('; ')}.`;

  // BUG 1 FIX + BUG 2 FIX
  const response = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "Escreva um resumo profissional atraente de 2 a 3 frases. Use um tom profissional, focado em resultados e competências.",
    },
  });

  let accumulated = '';
  for await (const chunk of response) {
    if (chunk.text) {
      accumulated += chunk.text;
      onUpdate(accumulated);
    }
  }
};

export const generateSummary = async (jobTitle: string, skills: string[], experiences: string[]): Promise<string> => {
  const ai = getAI();
  try {
    const prompt = `Escreva um resumo para um ${jobTitle}. Habilidades: ${skills.join(', ')}. Experiências: ${experiences.join('; ')}.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
      contents: [{ role: 'user', parts: [{ text: `Sugira competências para ${jobTitle}.` }] }],
      config: {
        systemInstruction: "Sugira exatamente 10 habilidades (técnicas e interpessoais) fundamentais. Retorne apenas os nomes das habilidades separados por vírgula, sem explicações ou numeração.",
        // BUG 1 FIX: thinkingConfig removido
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
    // BUG 1 FIX + BUG 2 FIX
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: `Você é um especialista em redação de cartas de apresentação profissionais para o mercado brasileiro. Escreva uma carta completa com: saudação, parágrafo de abertura impactante, 2 parágrafos de experiências e valor, encerramento com call-to-action. Use o nome do candidato. Sem títulos ou cabeçalhos — apenas o corpo da carta. Máximo de 4 parágrafos, 250-350 palavras.`,
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
          fullName: string; email: string; phone: string; location: string;
          website: string; linkedin: string; jobTitle: string; 
        };
        summary: string;
        experiences: { 
          id: string; company: string; position: string; location: string;
          startDate: string; endDate: string; current: boolean; description: string; 
        }[];
        education: { 
          id: string; institution: string; degree: string; field: string;
          location: string; startDate: string; endDate: string; 
        }[];
        skills: { 
          id: string; name: string;
          level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
        }[];
        languages: { 
          id: string; name: string; level: string; percentage: number;
        }[];
        courses: { 
          id: string; name: string; institution: string; year: string; 
        }[];
      }

      Texto do Currículo:
      "${text.slice(0, 12000)}"
    `;

    // BUG 1 FIX + BUG 2 FIX
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    if (response.text) {
      // BUG 4 FIX: remove markdown fences que o modelo pode incluir mesmo com responseMimeType json
      const cleaned = response.text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      return JSON.parse(cleaned);
    }
    return {};
  } catch (error) {
    console.error("Erro Gemini (Parse):", error);
    throw error;
  }
};

export interface ATSAnalysis {
  score: number;
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
  "keywords": ["<palavra-chave 1>", "<palavra-chave 2>", "<palavra-chave 3>", "<palavra-chave 4>", "<palavra-chave 5>"],
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

    // BUG 1 FIX + BUG 2 FIX
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    if (response.text) {
      // BUG 4 FIX: sanitiza possíveis markdown fences
      const cleaned = response.text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      return JSON.parse(cleaned);
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
      contents: [{ role: 'user', parts: [{ text: `Gere 5 perguntas de entrevista para o cargo "${position}" com habilidades: ${skills.join(', ')}` }] }],
      config: {
        systemInstruction: 'Retorne exatamente 5 perguntas de entrevista relevantes para o cargo e habilidades mencionados, focadas no mercado brasileiro. Retorne apenas as perguntas, uma por linha, sem numeração ou marcadores.',
        // BUG 1 FIX: thinkingConfig removido
      },
    });
    const text = response.text || '';
    return text.split('\n').filter(q => q.trim().length > 0).slice(0, 5);
  } catch (error) {
    console.error('Erro Gemini (Interview):', error);
    return [];
  }
};
