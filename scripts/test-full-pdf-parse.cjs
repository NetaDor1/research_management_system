const fs = require('fs');

const HEBREW_CHAR_RE = /[\u0590-\u05FF]/;
const LATIN_CHAR_RE = /[A-Za-z]/;

function countScriptCharsInItems(items) {
  let hebrew = 0;
  let latin = 0;
  for (const item of items || []) {
    for (const ch of item.text || '') {
      if (HEBREW_CHAR_RE.test(ch)) hebrew += 1;
      else if (LATIN_CHAR_RE.test(ch)) latin += 1;
    }
  }
  return { hebrew, latin };
}

function repositionOrphanPrompts(rows) {
  for (let i = 0; i < rows.length; i += 1) {
    const split = extractLeftOrphanPrompt(rows[i]);
    if (!split) continue;
    rows[i].items = split.mainItems;
    if (i + 1 >= rows.length || rows[i].page !== rows[i + 1].page) continue;
    rows[i + 1].items = [...split.orphanItems, ...rows[i + 1].items];
  }
  return rows;
}

function normalizePdfPunctuation(line) {
  return String(line || '')
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+:/g, ':')
    .replace(/\s+-\s*\.\s*$/g, '. -')
    .replace(/\s+\.\s+-\s*$/g, '. -')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanPdfContentLine(line) {
  let s = normalizePdfPunctuation(line);
  s = s.replace(/^\.\s*-\s*/g, '');
  if (!/^\s*-/.test(s)) {
    s = s.replace(/\s*-\s*\.?\s*$/g, '');
  }
  s = s.replace(/\s+\.\d{1,2}\s*$/g, '');
  s = s.replace(/^\.\d{1,2}\s+/g, '');
  return s.trim();
}

const PDF_ORPHAN_PROMPT_RE =
  /^(תאר את|להציג את|יש לתאר|סקור את|הגדר את|פרט את|נתח את|הסבר את|תאר|להציג|סקור)/;
const PDF_ORPHAN_X_GAP = 28;

function extractLeftOrphanPrompt(row) {
  if (!row?.items?.length || row.items.length < 2) return null;
  const { hebrew, latin } = countScriptCharsInItems(row.items);
  if (hebrew === 0 || latin > hebrew) return null;
  const byXAsc = [...row.items].sort((a, b) => a.x - b.x);
  const cluster = [byXAsc[0]];
  for (let i = 1; i < byXAsc.length; i += 1) {
    const gap = byXAsc[i].x - byXAsc[i - 1].x;
    if (gap > PDF_ORPHAN_X_GAP) break;
    cluster.push(byXAsc[i]);
  }
  if (cluster.length === byXAsc.length) return null;
  const orphanText = cluster.map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim();
  if (!PDF_ORPHAN_PROMPT_RE.test(orphanText) || orphanText.length > 48) return null;
  return { orphanItems: cluster, mainItems: byXAsc.slice(cluster.length) };
}

function joinRtlPdfRowItems(items) {
  const PDF_SHORT_PROMPT_RE = /^(תאר את|להציג את|הגדר את|פרט את|נתח את|הסבר את)$/;
  const prompts = [];
  const rest = [];
  for (const item of items) {
    if (PDF_SHORT_PROMPT_RE.test(item.text.trim())) prompts.push(item);
    else rest.push(item);
  }
  const sortedRest = [...rest].sort((a, b) => b.x - a.x);
  const maxRestX = sortedRest.length ? Math.max(...sortedRest.map((i) => i.x)) : 0;
  const leadingPrompts = [...prompts]
    .filter((p) => p.x < maxRestX - 15)
    .sort((a, b) => b.x - a.x);
  const inlineItems = [
    ...prompts.filter((p) => !leadingPrompts.includes(p)),
    ...sortedRest,
  ].sort((a, b) => b.x - a.x);
  const leading = leadingPrompts.map((item) => item.text).join(' ').trim();
  const body = inlineItems.map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim();
  return cleanPdfContentLine(leading ? `${leading} ${body}` : body);
}

function joinPdfRowItems(items) {
  if (!items?.length) return '';
  if (items.length === 1) return cleanPdfContentLine(items[0].text);

  const ltrSorted = [...items].sort((a, b) => a.x - b.x);
  const ltrJoined = ltrSorted.map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim();

  const useLtr =
    /^\d+\.\s/.test(ltrJoined) ||
    /^#\s*Task/i.test(ltrJoined) ||
    /^Principal Investigator/i.test(ltrJoined) ||
    /^Title\s*:/i.test(ltrJoined) ||
    /^Project coordinator/i.test(ltrJoined) ||
    /^NAME/i.test(ltrJoined) ||
    /^[A-D]\.\s/i.test(ltrJoined) ||
    /^BIOGRAPHICAL SUMMARY/i.test(ltrJoined) ||
    /^EDUCATION\/TRAINING/i.test(ltrJoined) ||
    /^INSTITUTION AND LOCATION/i.test(ltrJoined) ||
    /^\d+\s+\d+\s/.test(ltrJoined);

  if (useLtr) return cleanPdfContentLine(ltrJoined);

  const { hebrew, latin } = countScriptCharsInItems(items);
  const rtl = hebrew > 0 && hebrew >= latin;
  if (rtl) return joinRtlPdfRowItems(items);
  return cleanPdfContentLine(ltrSorted.map((item) => item.text).join(' ').replace(/\s+/g, ' '));
}

const SECTION_NUMBER_TO_KEY = {
  1: 'abstract',
  2: 'scientificBackground',
  3: 'researchObjectives',
  4: 'detailedDescription',
  5: 'significanceInnovation',
  6: 'applicability',
};

function isPdfNoiseLine(line) {
  const trimmed = (line || '').trim();
  if (!trimmed) return true;
  if (/^\.?\d{1,2}$/.test(trimmed)) return true;
  if (/^_+$/.test(trimmed)) return true;
  return false;
}

function parseNumberedContentSections(lines) {
  const boundaries = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = (lines[i] || '').match(/^(\d+)\.\s*(.+)$/);
    if (!match) continue;
    boundaries.push({ index: i, num: Number.parseInt(match[1], 10), title: match[2].trim() });
  }
  const result = {};
  const seenNumbers = new Set();
  for (let b = 0; b < boundaries.length; b += 1) {
    const current = boundaries[b];
    if (seenNumbers.has(current.num)) continue;
    const key = SECTION_NUMBER_TO_KEY[current.num];
    if (!key) continue;
    seenNumbers.add(current.num);
    let endIdx = lines.length;
    for (let n = b + 1; n < boundaries.length; n += 1) {
      if (boundaries[n].index > current.index) {
        endIdx = boundaries[n].index;
        break;
      }
    }
    const parts = [];
    for (let i = current.index + 1; i < endIdx; i += 1) {
      const line = lines[i];
      if (!line?.trim() || isPdfNoiseLine(line)) continue;
      if (/^\d+\.\s*/.test(line)) break;
      parts.push(cleanPdfContentLine(line));
    }
    if (parts.length) result[key] = parts.join('\n').trim();
  }
  return result;
}

async function main() {
  const pdfPath = process.argv[2];
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const items = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const text = item.str.trim();
      if (!text) continue;
      items.push({ x: item.transform[4], y: item.transform[5], text, page: p });
    }
  }

  const rows = [];
  for (const item of items) {
    const existing = rows.find((r) => r.page === item.page && Math.abs(r.y - item.y) <= 5);
    if (existing) existing.items.push(item);
    else rows.push({ y: item.y, page: item.page, items: [item] });
  }
  rows.sort((a, b) => a.page - b.page || b.y - a.y);
  repositionOrphanPrompts(rows);

  const lines = rows.map((r) => joinPdfRowItems(r.items)).filter((l) => l && !isPdfNoiseLine(l));
  const sections = parseNumberedContentSections(lines);
  console.log('ABSTRACT:\n', sections.abstract);
  console.log('\n---\nSCIENTIFIC BG:\n', sections.scientificBackground);
}

main().catch(console.error);
