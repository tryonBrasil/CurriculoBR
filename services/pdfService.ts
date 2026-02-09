
// @ts-ignore
import * as pdfjsModule from 'pdfjs-dist';

// Lógica robusta para obter a biblioteca, lidando com ESM default export vs Named exports
// O esm.sh às vezes coloca tudo dentro de 'default'
const pdfjsLib = (pdfjsModule as any).default || pdfjsModule;

// Configurando o worker com uma URL segura (CDNJS)
// O worker precisa ser um script clássico (não-módulo) para funcionar com importScripts no navegador
if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // @ts-ignore
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Itera sobre todas as páginas
    // @ts-ignore
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Concatena os itens de texto da página com espaço
      const pageText = textContent.items
        // @ts-ignore
        .map((item: any) => item.str)
        .join(' ');
        
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    console.error("Erro ao extrair texto do PDF:", error);
    throw new Error("Não foi possível ler o arquivo PDF. O arquivo pode estar corrompido ou protegido por senha.");
  }
};
