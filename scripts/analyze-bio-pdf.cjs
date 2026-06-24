const fs = require('fs');

const HEBREW_CHAR_RE = /[\u0590-\u05FF]/;
const LATIN_CHAR_RE = /[A-Za-z]/;

function cleanPdfContentLine(line) {
  return String(line || '').replace(/\s{2,}/g, ' ').trim();
}

function countScriptCharsInItems(items) {
  let hebrew = 0, latin = 0;
  for (const item of items || []) {
    for (const ch of item.text || '') {
      if (HEBREW_CHAR_RE.test(ch)) hebrew++;
      else if (LATIN_CHAR_RE.test(ch)) latin++;
    }
  }
  return { hebrew, latin };
}

function joinPdfRowItems(items) {
  if (!items?.length) return '';
  const ltrSorted = [...items].sort((a, b) => a.x - b.x);
  const ltrJoined = ltrSorted.map((i) => i.text).join(' ');
  const useLtr = /^BIOGRAPHICAL|^NAME|^EDUCATION|^[A-D]\./i.test(ltrJoined);
  if (useLtr) return cleanPdfContentLine(ltrJoined);
  const { hebrew, latin } = countScriptCharsInItems(items);
  const rtl = hebrew > 0 && hebrew >= latin;
  const sorted = rtl ? [...items].sort((a, b) => b.x - a.x) : ltrSorted;
  return cleanPdfContentLine(sorted.map((i) => i.text).join(' '));
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

  let inBio = false;
  for (let i = 0; i < rows.length; i++) {
    const line = joinPdfRowItems(rows[i].items);
    if (/biographical summary/i.test(line)) inBio = true;
    if (!inBio) continue;
    if (/^a\.?\s*personal statement/i.test(line) && i > 0) {
      // show a few more lines after A
    }
    const cells = rows[i].items.sort((a, b) => a.x - b.x).map((it) => `${it.x.toFixed(0)}:${it.text}`);
    console.log(`ROW ${i} [p${rows[i].page}] line="${line.slice(0, 80)}"`);
    if (rows[i].items.length >= 2) console.log('  cells:', cells.join(' | '));
    if (/^D\.?\s*Research Support/i.test(line)) break;
  }
}

main().catch(console.error);
