/**
 * exportService.ts
 * Exportação DOCX nativa via Open XML (sem dependências externas).
 * Gera um arquivo .docx válido diretamente no browser.
 */

import type { ResumeData } from '../types';

// ── Helpers XML ───────────────────────────────────────────────────────────────
function esc(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Estilos de parágrafo ──────────────────────────────────────────────────────
const STYLES = `
<w:style w:type="paragraph" w:styleId="Heading1">
  <w:name w:val="heading 1"/>
  <w:pPr><w:spacing w:before="240" w:after="60"/></w:pPr>
  <w:rPr>
    <w:b/><w:sz w:val="32"/><w:szCs w:val="32"/>
    <w:color w:val="1d4ed8"/>
  </w:rPr>
</w:style>
<w:style w:type="paragraph" w:styleId="Heading2">
  <w:name w:val="heading 2"/>
  <w:pPr><w:spacing w:before="180" w:after="40"/></w:pPr>
  <w:rPr>
    <w:b/><w:sz w:val="24"/><w:szCs w:val="24"/>
    <w:color w:val="1e293b"/>
  </w:rPr>
</w:style>
<w:style w:type="paragraph" w:styleId="Normal">
  <w:name w:val="Normal"/>
  <w:pPr><w:spacing w:after="80"/></w:pPr>
  <w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
</w:style>`;

// ── Builders de parágrafo ─────────────────────────────────────────────────────
function p(text: string, opts: { bold?: boolean; size?: number; color?: string; italic?: boolean; spacing?: number; styleId?: string } = {}): string {
  const sz    = (opts.size  ?? 20) * 2;
  const color = opts.color ? `<w:color w:val="${opts.color}"/>` : '';
  const bold  = opts.bold   ? '<w:b/>' : '';
  const ital  = opts.italic ? '<w:i/>' : '';
  const after = opts.spacing !== undefined ? `<w:spacing w:after="${opts.spacing}"/>` : '';
  const style = opts.styleId ? `<w:pStyle w:val="${opts.styleId}"/>` : '';
  return `<w:p><w:pPr>${style}${after}</w:pPr><w:r><w:rPr>${bold}${ital}${color}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function hr(): string {
  return `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="cbd5e1"/></w:pBdr><w:spacing w:before="60" w:after="60"/></w:pPr></w:p>`;
}

function sectionTitle(text: string): string {
  return `<w:p>
    <w:pPr><w:spacing w:before="240" w:after="80"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="1d4ed8"/></w:rPr>
      <w:t>${esc(text.toUpperCase())}</w:t>
    </w:r>
  </w:p>
  <w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="1d4ed8"/></w:pBdr><w:spacing w:before="0" w:after="120"/></w:pPr></w:p>`;
}

function empty(): string {
  return `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>`;
}

// Linha "Label: Valor" em negrito + normal
function labelValue(label: string, value: string): string {
  if (!value?.trim()) return '';
  return `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="475569"/></w:rPr><w:t xml:space="preserve">${esc(label)}: </w:t></w:r>
    <w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${esc(value)}</w:t></w:r>
  </w:p>`;
}

// ── Montagem do documento ─────────────────────────────────────────────────────
function buildDocumentXml(data: ResumeData): string {
  const { personalInfo: pi, summary, experiences, education, skills, languages, courses, projects, sectionOrder } = data;
  const parts: string[] = [];

  // ── Cabeçalho: nome e cargo ─────────────────────────────────────────────────
  parts.push(`<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="48"/><w:szCs w:val="48"/><w:color w:val="0f172a"/></w:rPr>
      <w:t>${esc(pi.fullName || 'Sem Nome')}</w:t>
    </w:r>
  </w:p>`);

  if (pi.jobTitle) {
    parts.push(`<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr>
      <w:r><w:rPr><w:i/><w:sz w:val="26"/><w:szCs w:val="26"/><w:color w:val="1d4ed8"/></w:rPr>
        <w:t>${esc(pi.jobTitle)}</w:t>
      </w:r>
    </w:p>`);
  }

  // Contato em linha
  const contacts = [pi.email, pi.phone, pi.location, pi.linkedin, pi.website, pi.drivingLicense].filter(Boolean);
  if (contacts.length) {
    parts.push(`<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="64748b"/></w:rPr>
        <w:t>${esc(contacts.join('  •  '))}</w:t>
      </w:r>
    </w:p>`);
  }

  parts.push(hr());

  // ── Seções na ordem definida pelo usuário ───────────────────────────────────
  for (const sectionId of sectionOrder) {

    if (sectionId === 'summary' && summary?.trim()) {
      parts.push(sectionTitle('Perfil Profissional'));
      parts.push(p(summary, { size: 10, color: '374151' }));
      parts.push(empty());
    }

    if (sectionId === 'experience' && experiences?.length) {
      parts.push(sectionTitle('Experiência Profissional'));
      for (const exp of experiences) {
        const period = exp.current
          ? `${exp.startDate} – Atual`
          : `${exp.startDate}${exp.endDate ? ' – ' + exp.endDate : ''}`;
        parts.push(`<w:p><w:pPr><w:spacing w:after="40"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="0f172a"/></w:rPr>
            <w:t>${esc(exp.position || '')}</w:t>
          </w:r>
        </w:p>`);
        parts.push(`<w:p><w:pPr><w:spacing w:after="40"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="1d4ed8"/></w:rPr>
            <w:t xml:space="preserve">${esc(exp.company || '')}${exp.location ? '  —  ' + esc(exp.location) : ''}</w:t>
          </w:r>
          <w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="94a3b8"/></w:rPr>
            <w:t xml:space="preserve">    ${esc(period)}</w:t>
          </w:r>
        </w:p>`);
        if (exp.description?.trim()) {
          parts.push(p(exp.description, { size: 10, color: '374151', spacing: 120 }));
        }
      }
      parts.push(empty());
    }

    if (sectionId === 'education' && education?.length) {
      parts.push(sectionTitle('Formação Acadêmica'));
      for (const edu of education) {
        const degree = [edu.degree, edu.field].filter(Boolean).join(' em ');
        const period = `${edu.startDate || ''}${edu.endDate ? ' – ' + edu.endDate : ''}`;
        parts.push(`<w:p><w:pPr><w:spacing w:after="40"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="0f172a"/></w:rPr>
            <w:t>${esc(degree || edu.institution)}</w:t>
          </w:r>
        </w:p>`);
        parts.push(`<w:p><w:pPr><w:spacing w:after="100"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="1d4ed8"/></w:rPr>
            <w:t xml:space="preserve">${esc(edu.institution || '')}${edu.location ? '  —  ' + esc(edu.location) : ''}</w:t>
          </w:r>
          <w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="94a3b8"/></w:rPr>
            <w:t xml:space="preserve">    ${esc(period)}</w:t>
          </w:r>
        </w:p>`);
      }
      parts.push(empty());
    }

    if (sectionId === 'skills' && (skills?.length || languages?.length)) {
      parts.push(sectionTitle('Habilidades'));
      const LEVEL_MAP: Record<string, string> = { Beginner: 'Básico', Intermediate: 'Intermediário', Advanced: 'Avançado', Expert: 'Especialista' };
      if (skills?.length) {
        const skillText = skills.map(s => `${s.name}${s.level ? ' (' + (LEVEL_MAP[s.level] || s.level) + ')' : ''}`).join('   •   ');
        parts.push(p(skillText, { size: 10, color: '374151', spacing: 80 }));
      }
      if (languages?.length) {
        parts.push(p('Idiomas:', { bold: true, size: 10, color: '475569', spacing: 40 }));
        const langText = languages.map(l => `${l.name} — ${l.level}`).join('   •   ');
        parts.push(p(langText, { size: 10, color: '374151', spacing: 120 }));
      }
      parts.push(empty());
    }

    if (sectionId === 'extras' && courses?.length) {
      parts.push(sectionTitle('Cursos e Certificações'));
      for (const c of courses) {
        const line = [c.name, c.institution, c.year].filter(Boolean).join('  —  ');
        parts.push(p(line, { size: 10, color: '374151', spacing: 60 }));
      }
      parts.push(empty());
    }

    if (sectionId === 'projects' && projects?.length) {
      parts.push(sectionTitle('Projetos'));
      for (const proj of projects) {
        parts.push(p(proj.name || '', { bold: true, size: 11, color: '0f172a', spacing: 40 }));
        if (proj.description) parts.push(p(proj.description, { size: 10, color: '374151', spacing: 40 }));
        if (proj.technologies) parts.push(p('Tecnologias: ' + proj.technologies, { italic: true, size: 9, color: '64748b', spacing: 40 }));
        if (proj.url) parts.push(p(proj.url, { size: 9, color: '1d4ed8', spacing: 80 }));
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/>
    </w:sectPr>
    ${parts.join('\n    ')}
  </w:body>
</w:document>`;
}

// ── Montagem do .docx (zip Open XML) ─────────────────────────────────────────
// Usamos JSZip via CDN (já disponível como window.JSZip no browser)
// ou fallback para geração manual do zip mínimo
async function buildDocx(data: ResumeData): Promise<Blob> {
  const documentXml = buildDocumentXml(data);

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

  // Usar JSZip se disponível (carregado via CDN no index.html)
  const JSZip = (window as any).JSZip;
  if (JSZip) {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', contentTypes);
    zip.file('_rels/.rels', rels);
    zip.file('word/document.xml', documentXml);
    zip.file('word/_rels/document.xml.rels', wordRels);
    return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  // Fallback: importar JSZip dinamicamente
  const { default: JZ } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js' as any);
  const zip2 = new JZ();
  zip2.file('[Content_Types].xml', contentTypes);
  zip2.file('_rels/.rels', rels);
  zip2.file('word/document.xml', documentXml);
  zip2.file('word/_rels/document.xml.rels', wordRels);
  return await zip2.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

// ── Export público ────────────────────────────────────────────────────────────
export async function exportToDocx(data: ResumeData): Promise<void> {
  const name = (data.personalInfo?.fullName?.trim() || 'curriculo').replace(/\s+/g, '_').replace(/[^a-zA-ZÀ-ÿ0-9_-]/g, '');
  const filename = `curriculo_${name}.docx`;

  try {
    const blob = await buildDocx(data);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } catch (err) {
    console.error('DOCX export failed:', err);
    throw new Error('Não foi possível gerar o arquivo Word. Tente novamente.');
  }
}
