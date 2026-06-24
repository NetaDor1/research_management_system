import JSZip from 'jszip';
import {
  applyMetadataFromLines,
  createEmptyParsed,
  isBiographyTable,
  isMainProposalTable,
  parseBiographyParagraphs,
  parseBiographyTable,
  parseMainContentTable,
  parseWorkPlanTasks,
  validateParsed,
} from './proposalFormParseShared';

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function cellText(cell) {
  const parts = [];
  for (const node of cell.getElementsByTagNameNS(W_NS, 't')) {
    if (node.textContent) parts.push(node.textContent);
  }
  return parts.join('').trim();
}

function paragraphText(paragraph) {
  const parts = [];
  for (const node of paragraph.getElementsByTagNameNS(W_NS, 't')) {
    if (node.textContent) parts.push(node.textContent);
  }
  return parts.join('').trim();
}

function tableRows(table) {
  const rows = [];
  for (const tr of table.getElementsByTagNameNS(W_NS, 'tr')) {
    const cells = [];
    for (const tc of tr.getElementsByTagNameNS(W_NS, 'tc')) {
      cells.push(cellText(tc));
    }
    rows.push(cells);
  }
  return rows;
}

/**
 * Parse a fixed-format research proposal .docx in the browser.
 * @param {ArrayBuffer} arrayBuffer
 */
export async function parseResearchProposalDocx(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) {
    throw new Error('קובץ Word לא תקין (חסר document.xml)');
  }

  const doc = new DOMParser().parseFromString(documentXml, 'application/xml');
  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0];
  if (!body) {
    throw new Error('קובץ Word לא תקין (חסר תוכן מסמך)');
  }

  const paragraphs = [];
  const tables = [];

  for (let i = 0; i < body.childNodes.length; i += 1) {
    const node = body.childNodes[i];
    if (!node.tagName) continue;
    const localName = node.localName || node.tagName.split(':').pop();
    if (localName === 'p') {
      const text = paragraphText(node);
      if (text) paragraphs.push(text);
    } else if (localName === 'tbl') {
      tables.push(tableRows(node));
    }
  }

  const parsed = createEmptyParsed();
  applyMetadataFromLines(paragraphs, parsed);

  const mainTable = tables.find(isMainProposalTable);
  if (mainTable) {
    Object.assign(parsed, parseMainContentTable(mainTable));
    parsed.workPlanTasks = parseWorkPlanTasks(mainTable);
  }

  const bioTable = tables.find(isBiographyTable);
  if (bioTable) {
    Object.assign(parsed, parseBiographyTable(bioTable));
  }

  Object.assign(parsed, parseBiographyParagraphs(paragraphs));

  if (!mainTable) {
    throw new Error(
      'הקובץ אינו תואם לפורמט הקבוע. הורידו את התבנית מהקישור "הורדת פורמט קבוע" ומלאו אותה.'
    );
  }

  validateParsed(parsed);
  return parsed;
}
