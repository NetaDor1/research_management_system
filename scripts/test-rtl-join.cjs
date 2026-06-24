const fs = require('fs');
const path = require('path');

const HEBREW_CHAR_RE = /[\u0590-\u05FF]/;
const LATIN_CHAR_RE = /[A-Za-z]/;

function cleanPdfContentLine(line) {
  return String(line || '')
    .replace(/^\.\s*-\s*/g, '')
    .replace(/\s*-\s*\.?\s*$/g, '')
    .replace(/\s+\.\d{1,2}\s*$/g, '')
    .replace(/^\.\d{1,2}\s+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

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

  if (useLtr) {
    return cleanPdfContentLine(ltrJoined);
  }

  const { hebrew, latin } = countScriptCharsInItems(items);
  const rtl = hebrew > 0 && hebrew >= latin;
  const sorted = rtl ? [...items].sort((a, b) => b.x - a.x) : ltrSorted;

  return cleanPdfContentLine(sorted.map((item) => item.text).join(' ').replace(/\s+/g, ' '));
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

  console.log('=== ROW COMPARISON (LTR vs RTL join) ===');
  for (let i = 0; i < rows.length; i++) {
    const ltr = rows[i].items
      .sort((a, b) => a.x - b.x)
      .map((it) => it.text)
      .join(' | ');
    const rtl = joinPdfRowItems(rows[i].items);
    if (/abstract|יש לתאר|להציג|SSRF|חולשות/i.test(rtl) || /^\d+\./.test(rtl)) {
      console.log(`\nROW ${i} [p${rows[i].page}]:`);
      console.log('  fragments (LTR x):', ltr);
      console.log('  joined:', rtl);
    }
  }
}

main().catch(console.error);
