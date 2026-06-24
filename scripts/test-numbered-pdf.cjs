const { parseNumberedContentSections } = require('../src/utils/proposalFormParseShared.js');

// Can't require ES module easily - test inline
const fs = require('fs');
const path = require('path');

async function main() {
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');

  const pdfPath = process.argv[2];
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
  rows.forEach((r) => r.items.sort((a, b) => a.x - b.x));
  rows.sort((a, b) => a.page - b.page || b.y - a.y);
  const lines = rows.map((r) => r.items.map((it) => it.text).join(' ').replace(/\s+/g, ' ').trim()).filter(Boolean);

  // duplicate parseNumberedContentSections logic inline for CJS test
  const SECTION_NUMBER_TO_KEY = { 1: 'abstract', 2: 'scientificBackground', 3: 'researchObjectives', 4: 'detailedDescription', 5: 'significanceInnovation', 6: 'applicability' };
  const boundaries = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\d+)\.\s*(.+)$/);
    if (m) boundaries.push({ index: i, num: +m[1], title: m[2] });
  }
  const seen = new Set();
  const result = {};
  for (let b = 0; b < boundaries.length; b++) {
    const cur = boundaries[b];
    if (seen.has(cur.num)) continue;
    const key = SECTION_NUMBER_TO_KEY[cur.num];
    if (!key) continue;
    seen.add(cur.num);
    let end = lines.length;
    for (let n = b + 1; n < boundaries.length; n++) {
      if (boundaries[n].index > cur.index) { end = boundaries[n].index; break; }
    }
    const parts = [];
    for (let i = cur.index + 1; i < end; i++) parts.push(lines[i]);
    result[key] = parts.join('\n').slice(0, 120);
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
