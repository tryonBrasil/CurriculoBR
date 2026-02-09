const html2pdf = (window as any).html2pdf || (() => ({
  set: (opts: any) => ({
    from: (el: HTMLElement) => ({
      save: () => Promise.resolve(),
    }),
  }),
}));

export const pdfExportService = {
  exportResume: async (element: HTMLElement, filename: string) => {
    if (!element) return;

    const options = {
      margin: 5,
      filename: `${filename || 'curriculo'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    try {
      if ((window as any).html2pdf) {
        await (window as any).html2pdf().set(options).from(element).save();
      } else {
        window.print();
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      window.print();
    }
  },

  printResume: () => {
    window.print();
  },
};
