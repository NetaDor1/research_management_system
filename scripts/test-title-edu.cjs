const fs = require('fs');
const shared = require('../src/utils/proposalFormParseShared.js');

async function main() {
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');
  const data = new Uint8Array(fs.readFileSync(process.argv[2]));
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

  const titleRow = rows.find((r) => r.items.some((i) => /^title$/i.test(i.text)));
  console.log('TITLE:', shared.extractPdfTitleFromItems(titleRow.items));

  const eduHeader = rows.find((r) => /institution and location/i.test(shared.joinPdfRowItems(r.items)));
  const eduIdx = rows.indexOf(eduHeader);
  const defs = [];
  for (const item of eduHeader.items) {
    const t = item.text.trim();
    if (/institution and location/i.test(t)) defs.push({ key: 'institution', x: item.x });
    else if (/^degree$/i.test(t)) defs.push({ key: 'degree', x: item.x });
    else if (/mm\/yy/i.test(t)) defs.push({ key: 'monthYear', x: item.x });
    else if (/field of study/i.test(t)) defs.push({ key: 'fieldOfStudy', x: item.x });
  }
  defs.sort((a, b) => a.x - b.x);

  for (let j = eduIdx + 1; j < rows.length; j++) {
    const row = rows[j];
    const line = shared.joinPdfRowItems(row.items);
    if (/^a\.?\s*personal statement/i.test(line)) break;
    if (row.items.length < 2) continue;
    const groups = defs.map(() => []);
    for (const item of row.items) {
      let best = 0;
      let bestDist = Infinity;
      defs.forEach((d, i) => {
        const dist = Math.abs(item.x - d.x);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      groups[best].push(item);
    }
    const cells = groups.map((g, i) =>
      defs[i].key === 'monthYear'
        ? shared.normalizeEducationMonthYear(
            [...g]
              .sort((a, b) => a.x - b.x)
              .map((x) => x.text)
              .join(' ')
          )
        : shared.joinHebrewCellFragments(g)
    );
    if (cells.some((c) => c)) console.log('EDU:', cells);
  }
}

main().catch(console.error);
