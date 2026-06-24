// Inline test mirroring parseBiographyFromPositionedRows
const fs = require('fs');
const shared = require('../src/utils/proposalFormParseShared.js');

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
    const ex = rows.find((r) => r.page === item.page && Math.abs(r.y - item.y) <= 5);
    if (ex) ex.items.push(item);
    else rows.push({ y: item.y, page: item.page, items: [item] });
  }
  rows.sort((a, b) => a.page - b.page || b.y - a.y);
  shared.repositionOrphanPrompts(rows);

  const getFullRowText = (row) => shared.joinPdfRowItems(row.items);
  const normalizeHeader = shared.normalizeHeader;
  const normalizeEducationMonthYear = shared.normalizeEducationMonthYear;
  const cleanPdfContentLine = shared.cleanPdfContentLine;

  function assignItemsToColumnGroups(items, columnDefs) {
    const groups = columnDefs.map(() => []);
    for (const item of items) {
      let bestIdx = 0, bestDist = Infinity;
      columnDefs.forEach((col, idx) => {
        const dist = Math.abs(item.x - col.x);
        if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
      });
      groups[bestIdx].push(item);
    }
    return groups;
  }

  function joinColumnItems(items, { ltr = false } = {}) {
    if (!items?.length) return '';
    if (ltr) {
      return cleanPdfContentLine([...items].sort((a, b) => a.x - b.x).map((i) => i.text).join(' '));
    }
    return shared.joinPdfRowItems(items);
  }

  const bioStart = rows.findIndex((r) => normalizeHeader(getFullRowText(r)) === 'biographical summary');
  const nameHeader = rows.find((r) => /^name\b/i.test(getFullRowText(r)) && /position title/i.test(getFullRowText(r)));
  const eduHeader = rows.find((r) => /institution and location/i.test(getFullRowText(r)) && /field of study/i.test(getFullRowText(r)));

  const nameIdx = rows.indexOf(nameHeader);
  const nameDefs = [];
  for (const item of nameHeader.items) {
    const t = item.text.trim();
    if (/^name$/i.test(t)) nameDefs.push({ key: 'name', x: item.x });
    if (/position title/i.test(t)) nameDefs.push({ key: 'position', x: item.x });
  }
  nameDefs.sort((a, b) => a.x - b.x);
  const nameData = rows[nameIdx + 1];
  const nameGroups = assignItemsToColumnGroups(nameData.items, nameDefs);

  const eduIdx = rows.indexOf(eduHeader);
  const eduDefs = [];
  for (const item of eduHeader.items) {
    const t = item.text.trim();
    if (/institution and location/i.test(t)) eduDefs.push({ key: 'institution', x: item.x });
    else if (/^degree$/i.test(t)) eduDefs.push({ key: 'degree', x: item.x });
    else if (/mm\/yy/i.test(t)) eduDefs.push({ key: 'monthYear', x: item.x });
    else if (/field of study/i.test(t)) eduDefs.push({ key: 'fieldOfStudy', x: item.x });
  }
  eduDefs.sort((a, b) => a.x - b.x);
  const eduData = rows[eduIdx + 1];
  const eduGroups = assignItemsToColumnGroups(eduData.items, eduDefs);
  const eduCells = eduGroups.map((g, idx) => joinColumnItems(g, { ltr: eduDefs[idx]?.key === 'monthYear' }));

  console.log('NAME:', joinColumnItems(nameGroups[0]), '| POSITION:', joinColumnItems(nameGroups[1]));
  console.log('EDU:', eduCells);
  console.log('EDU normalized month:', normalizeEducationMonthYear(eduCells[2]));
}

main().catch(console.error);
