import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import * as FileSaver from "file-saver";
import { ResumeData } from "../types";

export const exportToDocx = async (data: ResumeData) => {
  const saveAs = (FileSaver as any).saveAs || (FileSaver as any).default || FileSaver;

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
          size: 28,
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
          text: (data.fullName || "Sem Nome").toUpperCase(),
          bold: true,
          size: 40,
          font: "Calibri",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          // CORREÇÃO: Removi 'website' que não existe no seu ResumeData
          // Se quiser adicionar o link, use (data as any).website ou verifique o nome correto no types.ts
          text: [data.email, data.phone, data.location].filter(Boolean).join("  |  "),
          size: 20,
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
            size: 22,
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
            // CORREÇÃO: De 'italic' para 'italics'
            new TextRun({ text: exp.period, italics: true, size: 20, font: "Calibri", color: "666666" }),
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

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  try {
    const blob = await Packer.toBlob(doc);
    const fileName = `Curriculo_${data.fullName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Novo'}.docx`;
    saveAs(blob, fileName);
  } catch (error) {
    console.error("Erro ao gerar DOCX:", error);
  }
};
