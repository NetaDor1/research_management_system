const fs = require('fs');

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

  for (let i = 6; i <= 11; i++) {
    const line = rows[i].items.map((it) => it.text).join(' | ');
    console.log(`ROW ${i} y=${rows[i].y.toFixed(2)}: ${line.slice(0, 120)}`);
  }
}

main().catch(console.error);
