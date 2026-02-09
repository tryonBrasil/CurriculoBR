
// @ts-ignore
import * as pdfjsModule from 'pdfjs-dist';

// Lógica para lidar com diferentes formatos de exportação (ESM vs CJS/UMD)
const pdfjsLib = (pdfjsModule as any).default || pdfjsModule;

// Configuração CRÍTICA do Worker
// Define o caminho do worker para um arquivo hospedado em CDN que seja compatível com navegadores (formato clássico/UMD)
// Isso evita o erro "Failed to execute 'importScripts'" e "Setting up fake worker failed"
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // @ts-ignore
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // @ts-ignore
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        // @ts-ignore
        .map((item: any) => item.str)
        .join(' ');
        
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    console.error("Erro detalhado ao extrair PDF:", error);
    throw new Error("Não foi possível ler o arquivo PDF. Verifique se ele não está protegido por senha ou corrompido.");
  }
};
