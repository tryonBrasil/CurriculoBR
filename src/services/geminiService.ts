import { GoogleGenerativeAI } from "@google/generative-ai";

// Configuração centralizada para evitar repetição
const MODEL_NAME = "gemini-3-flash-preview";

const getModel = (systemInstruction: string) => {
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_KEY || "");
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction,
    generationConfig: {
      temperature: 0.7, // Um pouco de criatividade para currículos
      topP: 0.95,
    }
  });
};

export const enhanceTextStream = async (text: string, context: string, onUpdate: (text: string) => void): Promise<void> => {
  if (!text) return;
  
  try {
    const model = getModel(`Você é um redator de currículos focado em ${context}. Use verbos de ação fortes.`);
    const result = await model.generateContentStream(`Melhore este texto mantendo o foco profissional: "${text}"`);

    let accumulated = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      accumulated += chunkText;
      onUpdate(accumulated);
    }
  } catch (error) {
    console.error("Erro no Stream Gemini:", error);
    onUpdate(text); // Retorna o original em caso de erro
  }
};

export const parseResumeWithAI = async (text: string): Promise<any> => {
  try {
    const model = getModel("Você é um parser de currículos que extrai dados para JSON.");
    
    const prompt = `Extraia os dados deste currículo para o formato JSON solicitado: \n\n ${text}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const responseText = result.response.text();
    
    // Limpeza extra para garantir que o JSON seja lido corretamente
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Erro crítico no Parse:", error);
    throw new Error("Não foi possível processar o PDF. Tente preencher manualmente.");
  }
};
