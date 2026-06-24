const fs = require('fs');
const path = require('path');

async function main() {
  const pdfPath = process.argv[2];
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  const pdfjsWorker = require('pdfjs-dist/legacy/build/pdf.worker.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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

  const Y_TOLERANCE = 5;
  const rows = [];
  for (const item of items) {
    const existing = rows.find((r) => r.page === item.page && Math.abs(r.y - item.y) <= Y_TOLERANCE);
    if (existing) existing.items.push(item);
    else rows.push({ y: item.y, page: item.page, items: [item] });
  }
  rows.forEach((r) => r.items.sort((a, b) => a.x - b.x));
  rows.sort((a, b) => a.page - b.page || b.y - a.y);

  console.log('=== FULL ROWS ===');
  for (let i = 0; i < rows.length; i++) {
    const line = rows[i].items.map((it) => it.text).join(' ').replace(/\s+/g, ' ').trim();
    if (line) console.log(`${String(i).padStart(3)} [p${rows[i].page}]: ${line.slice(0, 160)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
