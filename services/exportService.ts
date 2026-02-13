import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import * as FileSaver from "file-saver";
import { ResumeData } from "../types";

export const exportToDocx = async (data: ResumeData) => {
  const saveAs = (FileSaver as any).saveAs || (FileSaver as any).default || FileSaver;

  // Helper para criar títulos de seção consistentes
  const createSectionHeading = (text: string) => {
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 120 },
      border: {
        bottom: {
          color: "2563eb",
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      children: [
        new TextRun({
          text: text.toUpperCase(),
          bold: true,
          size: 28, // 14pt
          font: "Calibri",
        }),
      ],
    });
  };

  const children: Paragraph[] = [];

  // --- 1. CABEÇALHO ---
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: data.fullName.toUpperCase(),
          bold: true,
          size: 40, // 20pt
          font: "Calibri",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: [data.email, data.phone, data.location, data.website].filter(Boolean).join("  |  "),
          size: 20, // 10pt
          font: "Calibri",
        }),
      ],
    })
  );

  // --- 2. RESUMO ---
  if (data.summary) {
    children.push(createSectionHeading("Resumo Profissional"));
    children.push(
      new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({
            text: data.summary,
            size: 22, // 11pt
            font: "Calibri",
          }),
        ],
      })
    );
  }

  // --- 3. EXPERIÊNCIA ---
  if (data.experiences && data.experiences.length > 0) {
    children.push(createSectionHeading("Experiência Profissional"));
    data.experiences.forEach((exp) => {
      children.push(
        new Paragraph({
          spacing: { before: 200 },
          children: [
            new TextRun({ text: exp.position, bold: true, size: 24, font: "Calibri" }),
            new TextRun({ text: `  |  ${exp.company}`, size: 24, font: "Calibri" }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: exp.period, italic: true, size: 20, font: "Calibri", color: "666666" }),
          ],
        }),
        new Paragraph({
          spacing: { before: 100, after: 100 },
          children: [
            new TextRun({ text: exp.description, size: 22, font: "Calibri" }),
          ],
        })
      );
    });
  }

  // --- 4. EDUCAÇÃO ---
  if (data.education && data.education.length > 0) {
    children.push(createSectionHeading("Formação Acadêmica"));
    data.education.forEach((edu) => {
      children.push(
        new Paragraph({
          spacing: { before: 120 },
          children: [
            new TextRun({ text: edu.degree, bold: true, size: 22, font: "Calibri" }),
            new TextRun({ text: ` - ${edu.school} (${edu.year})`, size: 22, font: "Calibri" }),
          ],
        })
      );
    });
  }

  // --- 5. HABILIDADES ---
  if (data.skills) {
    children.push(createSectionHeading("Habilidades"));
    children.push(
      new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({ text: data.skills, size: 22, font: "Calibri" }),
        ],
      })
    );
  }

  // --- CRIAÇÃO DO DOCUMENTO ---
  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  try {
    const blob = await Packer.toBlob(doc);
    const fileName = `Curriculo_${data.fullName.replace(/[^a-zA-Z0-9]/g, '_') || 'Novo'}.docx`;
    
    if (typeof saveAs === 'function') {
        saveAs(blob, fileName);
    } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error("Erro ao gerar DOCX:", error);
  }
};
