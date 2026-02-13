
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import * as FileSaver from "file-saver";
import { ResumeData } from "../types";

export const exportToDocx = async (data: ResumeData) => {
  // Fix for "does not provide an export named 'saveAs'" error.
  // Handles environments where file-saver is exported as default (e.g. esm.sh) or named.
  const saveAs = (FileSaver as any).saveAs || (FileSaver as any).default || FileSaver;

  // Helper para criar títulos de seção consistentes
  const createSectionHeading = (text: string) => {
    return new Paragraph({
      text: text.toUpperCase(),
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 120 },
      border: {
        bottom: {
          color: "2563eb", // Cor azul do tema (Tailwind blue-600 approx)
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
    });
  };

  const children = [];

  // --- 1. CABEÇALHO ---
  children.push(
    new Paragraph({
      text: data.fullName.toUpperCase(),
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: [data.email, data.phone, data.location].filter(Boolean).join(" | "),
          size: 20, // 10pt
        }),
      ],
      spacing: { after: 400 }, // Espaço após o cabeçalho
    })
  );

  // --- 2. RESUMO ---
  if (data.summary) {
    children.push(createSectionHeading("Resumo Profissional"));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: data.summary, size: 22 })], // 11pt
        alignment: AlignmentType.JUSTIFIED,
      })
    );
  }

  // --- 3. EXPERIÊNCIA ---
  if (data.experiences && data.experiences.length > 0) {
    children.push(createSectionHeading("Experiência Profissional"));
    
    data.experiences.forEach((exp) => {
      // Linha: Empresa - Cargo (Data na direita seria ideal, mas no docx simples faremos inline ou linha separada)
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.company, bold: true, size: 24 }), // 12pt Bold
            new TextRun({ text: " — " }),
            new TextRun({ text: exp.position, italics: true, size: 22 }), // 11pt Italic
          ],
          spacing: { before: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: exp.period, color: "666666", size: 20 })],
          spacing: { after: 100 },
        })
      );

      // Descrição (tratando quebras de linha)
      if (exp.description) {
        const descLines = exp.description.split('\n');
        descLines.forEach((line) => {
           children.push(
             new Paragraph({
               text: line,
               size: 22,
               bullet: line.trim().startsWith('•') ? undefined : { level: 0 }, // Se já tiver bullet no texto, não adiciona nativo
               spacing: { after: 50 }
             })
           );
        });
      }
    });
  }

  // --- 4. EDUCAÇÃO ---
  if (data.education && data.education.length > 0) {
    children.push(createSectionHeading("Formação Acadêmica"));
    
    data.education.forEach((edu) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: edu.school, bold: true, size: 24 }),
            new TextRun({ text: " — " }),
            new TextRun({ text: edu.degree, size: 22 }),
          ],
          spacing: { before: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: edu.year, color: "666666", size: 20 })],
        })
      );
    });
  }

  // --- 5. HABILIDADES ---
  if (data.skills) {
    children.push(createSectionHeading("Habilidades"));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: data.skills, size: 22 })],
      })
    );
  }

  // --- 6. IDIOMAS ---
  if (data.languages && data.languages.length > 0) {
    children.push(createSectionHeading("Idiomas"));
    data.languages.forEach(lang => {
      children.push(new Paragraph({
        children: [
            new TextRun({ text: lang.name, bold: true, size: 22 }),
            new TextRun({ text: `: ${lang.level}`, size: 22 })
        ],
        bullet: { level: 0 }
      }));
    });
  }

  // --- 7. CERTIFICAÇÕES ---
  if (data.certifications && data.certifications.length > 0) {
    children.push(createSectionHeading("Cursos e Certificações"));
    data.certifications.forEach(cert => {
      children.push(new Paragraph({
        children: [
            new TextRun({ text: cert.name, bold: true, size: 22 }),
            new TextRun({ text: ` — ${cert.issuer}`, size: 22 }),
            new TextRun({ text: cert.year ? ` (${cert.year})` : "", size: 22 })
        ],
        bullet: { level: 0 }
      }));
    });
  }

  // --- CRIAÇÃO DO DOCUMENTO ---
  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
    styles: {
        paragraphStyles: [
            {
                id: "Heading1",
                name: "Heading 1",
                basedOn: "Normal",
                next: "Normal",
                quickFormat: true,
                run: {
                    size: 28,
                    bold: true,
                    color: "2563eb",
                    font: "Calibri"
                },
                paragraph: {
                    spacing: { after: 120 },
                },
            },
            {
                id: "Normal",
                name: "Normal",
                quickFormat: true,
                run: {
                    font: "Calibri",
                    size: 22, // 11pt
                }
            }
        ]
    }
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `Curriculo_${data.fullName.replace(/[^a-zA-Z0-9]/g, '_') || 'Novo'}.docx`;
  
  if (typeof saveAs === 'function') {
      saveAs(blob, fileName);
  } else {
      console.error("FileSaver saveAs is not a function", saveAs);
      // Fallback manual se tudo falhar
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
  }
};
