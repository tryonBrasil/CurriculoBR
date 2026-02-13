import * as pdfjsModule from 'pdfjs-dist';

// Define the PDFJS library object correctly handling different module formats
const pdfjsLib = (pdfjsModule as any).default || pdfjsModule;

const PDFJS_VERSION = '3.11.174';

if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  // Garantir que a versão do worker é IDÊNTICA à versão da biblioteca instalada
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
}

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent: any = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  } catch (error: any) {
    console.error("PDF Extraction Error:", error);
    throw new Error("Não foi possível ler o arquivo PDF. Verifique se ele não está protegido por senha ou corrompido.");
  }
};