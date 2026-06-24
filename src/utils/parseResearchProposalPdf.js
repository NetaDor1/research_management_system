import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.entry';
import {
  GANTT_MONTHS,
  applyMetadataFromLines,
  cleanPdfContentLine,
  createEmptyParsed,
  isContentSectionHeaderOnly,
  isPdfNoiseLine,
  matchContentSectionLine,
  mergeParsedFields,
  normalizeHeader,
  normalizeEducationMonthYear,
  parseBiographyParagraphs,
  parseNumberedContentSections,
  parseWorkPlanTasks,
  validateParsed,
  extractAfterColon,
  joinPdfRowItems,
  joinHebrewCellFragments,
  extractPdfTitleFromItems,
  repositionOrphanPrompts,
} from './proposalFormParseShared';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const Y_TOLERANCE = 5;

function clusterItemsIntoRows(items) {
  const rows = [];
  for (const item of items) {
    const existing = rows.find(
      (row) => row.page === item.page && Math.abs(row.y - item.y) <= Y_TOLERANCE
    );
    if (existing) {
      existing.items.push(item);
    } else {
      rows.push({ y: item.y, page: item.page, items: [item] });
    }
  }

  rows.sort((a, b) => a.page - b.page || b.y - a.y);
  return repositionOrphanPrompts(rows);
}

async function extractPdfTextItems(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const items = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const text = item.str.trim();
      if (!text) continue;
      items.push({
        x: item.transform[4],
        y: item.transform[5],
        text,
        page: pageNum,
      });
    }
  }

  return items;
}

function getFullRowText(row) {
  if (!row?.items?.length) return '';
  return joinPdfRowItems(row.items);
}

function rowsToLineStrings(positionedRows) {
  return positionedRows
    .map((row) => getFullRowText(row))
    .filter((line) => line && !isPdfNoiseLine(line));
}

function shouldStopContentCollection(line) {
  if (!line?.trim()) return true;
  if (isContentSectionHeaderOnly(line)) return true;
  if (/^work plan and gantt/i.test(line.trim())) return true;
  if (/^bibliography$/i.test(line.trim())) return true;
  if (/^#?\s*task\b/i.test(line)) return true;
  if (/^a\.?\s*personal statement/i.test(line.trim())) return true;
  if (/^b\.?\s*positions and honors/i.test(line.trim())) return true;
  return false;
}

function parseMainContentFromPositionedRows(positionedRows) {
  const result = {};
  const fullLines = positionedRows.map(getFullRowText);

  for (let i = 0; i < positionedRows.length; i += 1) {
    const line = fullLines[i];
    if (!line || isPdfNoiseLine(line)) continue;

    const match = matchContentSectionLine(line);
    if (!match) continue;

    const parts = [];
    if (match.tail) parts.push(match.tail);

    for (let j = i + 1; j < positionedRows.length; j += 1) {
      const nextLine = fullLines[j];
      if (!nextLine || isPdfNoiseLine(nextLine)) continue;
      if (shouldStopContentCollection(nextLine)) break;
      parts.push(cleanPdfContentLine(nextLine));
    }

    if (parts.length) {
      result[match.section.key] = parts.join('\n').trim();
    }
  }

  return result;
}

function assignItemsToColumns(items, columnDefs) {
  const cells = columnDefs.map(() => '');
  for (const item of items) {
    let bestIdx = 0;
    let bestDist = Infinity;
    columnDefs.forEach((col, idx) => {
      const dist = Math.abs(item.x - col.x);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });
    cells[bestIdx] = cells[bestIdx] ? `${cells[bestIdx]} ${item.text}`.trim() : item.text;
  }
  return cells;
}

function findColumnDefs(headerRow) {
  const defs = [
    { key: '#', x: null },
    { key: 'task', x: null },
    ...GANTT_MONTHS.map((month) => ({ key: String(month), x: null })),
  ];

  for (const item of headerRow.items) {
    const text = item.text.trim();
    if (text === '#') defs[0].x = item.x;
    else if (/^task$/i.test(text)) defs[1].x = item.x;
    else {
      const monthIdx = GANTT_MONTHS.indexOf(Number.parseInt(text, 10));
      if (monthIdx !== -1) defs[monthIdx + 2].x = item.x;
    }
  }

  if (defs[0].x == null && headerRow.items[0]) defs[0].x = headerRow.items[0].x;
  if (defs[1].x == null && headerRow.items[1]) defs[1].x = headerRow.items[1].x;

  return defs.filter((def) => def.x != null);
}

function isGanttHeaderRow(row) {
  const texts = row.items.map((item) => item.text.trim());
  return texts.includes('#') && texts.some((t) => /^task$/i.test(t)) && texts.includes('6');
}

function parseGanttTablesFromPositionedRows(positionedRows) {
  const allRows = [];
  const headerIndices = positionedRows
    .map((row, idx) => (isGanttHeaderRow(row) ? idx : -1))
    .filter((idx) => idx !== -1);

  for (const headerIdx of headerIndices) {
    const headerRow = positionedRows[headerIdx];
    const columnDefs = findColumnDefs(headerRow);
    if (columnDefs.length < 4) continue;

    const tableRows = [['#', 'Task', ...GANTT_MONTHS.map(String)]];

    for (let i = headerIdx + 1; i < positionedRows.length; i += 1) {
      const row = positionedRows[i];
      if (row.page !== headerRow.page && tableRows.length > 1) break;

      const cells = assignItemsToColumns(row.items, columnDefs);
      const first = (cells[0] || '').trim();
      if (normalizeHeader(first) === 'bibliography') break;
      if (!/^\d+$/.test(first)) {
        if (tableRows.length > 1) break;
        continue;
      }
      const title = (cells[1] || '').trim();
      if (!title) continue;

      const ganttRow = [first, title, ...GANTT_MONTHS.map((_, idx) => cells[idx + 2] || '')];
      tableRows.push(ganttRow);
    }

    if (tableRows.length > 1) {
      allRows.push(...tableRows);
    }
  }

  return allRows;
}

function assignItemsToColumnGroups(items, columnDefs) {
  const groups = columnDefs.map(() => []);
  for (const item of items) {
    let bestIdx = 0;
    let bestDist = Infinity;
    columnDefs.forEach((col, idx) => {
      const dist = Math.abs(item.x - col.x);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });
    groups[bestIdx].push(item);
  }
  return groups;
}

function joinColumnItems(items, { ltr = false } = {}) {
  if (!items?.length) return '';
  if (ltr) {
    return cleanPdfContentLine(
      [...items]
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(' ')
    );
  }
  return joinHebrewCellFragments(items);
}

function parseTitleFromPositionedRows(positionedRows) {
  for (const row of positionedRows) {
    const hasTitleLabel = row.items.some((item) => /^title$/i.test(item.text.trim()));
    if (!hasTitleLabel) continue;
    const title = extractPdfTitleFromItems(row.items);
    if (title) return title;
  }
  return '';
}

function findBioNameColumnDefs(headerRow) {
  const defs = [];
  for (const item of headerRow.items) {
    const text = item.text.trim();
    if (/^name$/i.test(text)) defs.push({ key: 'name', x: item.x });
    if (/position title/i.test(text)) defs.push({ key: 'position', x: item.x });
  }
  return defs.sort((a, b) => a.x - b.x);
}

function findBioEducationColumnDefs(headerRow) {
  const defs = [];
  for (const item of headerRow.items) {
    const text = item.text.trim();
    if (/institution and location/i.test(text)) defs.push({ key: 'institution', x: item.x });
    else if (/^degree$/i.test(text)) defs.push({ key: 'degree', x: item.x });
    else if (/mm\/yy/i.test(text)) defs.push({ key: 'monthYear', x: item.x });
    else if (/field of study/i.test(text)) defs.push({ key: 'fieldOfStudy', x: item.x });
  }
  return defs.sort((a, b) => a.x - b.x);
}

function isBioNameHeaderRow(row) {
  const line = getFullRowText(row);
  return /^name\b/i.test(line) && /position title/i.test(line);
}

function isBioEducationHeaderRow(row) {
  const line = getFullRowText(row);
  return /institution and location/i.test(line) && /field of study/i.test(line);
}

function isBioEducationDataRow(row) {
  if (!row?.items?.length || row.items.length < 2) return false;
  const line = getFullRowText(row);
  if (/^a\.?\s*personal statement/i.test(line)) return false;
  if (/^(name|education\/training|biographical summary)/i.test(line)) return false;
  if (/institution and location/i.test(line)) return false;
  return true;
}

function parseBiographyFromPositionedRows(positionedRows) {
  const result = {
    biographicalSummaryName: '',
    biographicalSummaryPositionTitle: '',
    bibliographyEducationTraining: [],
  };

  const bioStart = positionedRows.findIndex(
    (row) => normalizeHeader(getFullRowText(row)) === 'biographical summary'
  );
  if (bioStart === -1) return result;

  for (let i = bioStart; i < positionedRows.length; i += 1) {
    const row = positionedRows[i];
    const line = getFullRowText(row);
    if (/^a\.?\s*personal statement/i.test(line)) break;

    if (isBioNameHeaderRow(row)) {
      const columnDefs = findBioNameColumnDefs(row);
      const dataRow = positionedRows[i + 1];
      if (dataRow && columnDefs.length >= 2) {
        const groups = assignItemsToColumnGroups(dataRow.items, columnDefs);
        result.biographicalSummaryName = joinColumnItems(groups[0]);
        result.biographicalSummaryPositionTitle = joinColumnItems(groups[1]);
      }
      continue;
    }

    if (isBioEducationHeaderRow(row)) {
      const columnDefs = findBioEducationColumnDefs(row);
      if (columnDefs.length < 4) continue;

      for (let j = i + 1; j < positionedRows.length; j += 1) {
        const eduRow = positionedRows[j];
        if (!isBioEducationDataRow(eduRow)) break;

        const groups = assignItemsToColumnGroups(eduRow.items, columnDefs);
        const cells = groups.map((group, idx) =>
          joinColumnItems(group, { ltr: columnDefs[idx]?.key === 'monthYear' })
        );
        if (!cells.some((cell) => cell.trim())) continue;

        result.bibliographyEducationTraining.push({
          institutionLocation: cells[0] || '',
          degree: cells[1] || '',
          monthYear: normalizeEducationMonthYear(cells[2]),
          fieldOfStudy: cells[3] || '',
        });
      }
    }
  }

  if (result.bibliographyEducationTraining.length === 0) {
    result.bibliographyEducationTraining = [
      { institutionLocation: '', degree: '', monthYear: '', fieldOfStudy: '' },
    ];
  }

  return result;
}

function parsePdfBiographyExtras(lines, parsed) {
  const piLine = lines.find((l) => /^Principal Investigator/i.test(l));
  if (piLine && !parsed.principalInvestigatorName) {
    const pi = extractAfterColon(piLine);
    if (pi) parsed.principalInvestigatorName = pi;
  }
}

/**
 * Parse a fixed-format research proposal PDF in the browser.
 * @param {ArrayBuffer} arrayBuffer
 */
export async function parseResearchProposalPdf(arrayBuffer) {
  const textItems = await extractPdfTextItems(arrayBuffer);
  if (!textItems.length) {
    throw new Error('קובץ PDF לא תקין או ללא טקסט (ייתכן שמדובר בסריקת תמונה בלבד)');
  }

  const positionedRows = clusterItemsIntoRows(textItems);
  const lines = rowsToLineStrings(positionedRows);
  const parsed = createEmptyParsed();

  applyMetadataFromLines(lines, parsed);

  const pdfTitle = parseTitleFromPositionedRows(positionedRows);
  if (pdfTitle) parsed.projectTitle = pdfTitle;

  mergeParsedFields(parsed, parseNumberedContentSections(lines));

  const ganttTableRows = parseGanttTablesFromPositionedRows(positionedRows);
  if (ganttTableRows.length > 0) {
    parsed.workPlanTasks = parseWorkPlanTasks(ganttTableRows);
  }

  mergeParsedFields(parsed, parseBiographyFromPositionedRows(positionedRows));

  mergeParsedFields(parsed, parseBiographyParagraphs(lines));
  parsePdfBiographyExtras(lines, parsed);

  validateParsed(parsed);
  return parsed;
}
