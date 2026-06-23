import JSZip from 'jszip';

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

const CONTENT_SECTIONS = [
  { key: 'abstract', header: 'Abstract' },
  { key: 'scientificBackground', header: 'Scientific background and state of the art' },
  { key: 'researchObjectives', header: 'Research objectives and specific aims' },
  { key: 'detailedDescription', header: 'Detailed description of the proposed research' },
  {
    key: 'significanceInnovation',
    header: 'Significance, innovation and potential benefits of the proposed research',
  },
  { key: 'applicability', header: 'Applicability' },
];

const GANTT_MONTHS = [6, 12, 18, 24, 30, 36];

const BIO_SECTION_MARKERS = [
  { key: 'bibliographyPersonalStatement', prefix: /^A\.?\s*Personal Statement/i },
  { key: 'bibliographyPositionsAndHonors', prefix: /^B\.?\s*Positions and Honors/i },
  {
    key: 'bibliographySelectedPublications',
    prefix: /^C\.?\s*Selected Peer-reviewed Publications/i,
  },
  { key: 'bibliographyResearchSupport', prefix: /^D\.?\s*Research Support/i },
];

function normalizeHeader(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

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

function extractAfterColon(text) {
  const idx = text.indexOf(':');
  if (idx === -1) return '';
  return text
    .slice(idx + 1)
    .replace(/_+/g, '')
    .trim();
}

function parseMainContentTable(rows) {
  const result = {};
  for (let i = 0; i < rows.length; i += 1) {
    const header = rows[i][0] || '';
    const section = CONTENT_SECTIONS.find(
      (item) => normalizeHeader(item.header) === normalizeHeader(header)
    );
    if (section && i + 1 < rows.length) {
      result[section.key] = rows[i + 1][0] || '';
      i += 1;
    }
  }
  return result;
}

function parseGanttMonthsFromRow(row) {
  const monthValues = [];

  for (let col = 2; col <= 7; col += 1) {
    const raw = (row[col] || '').trim();
    if (!raw) continue;

    const asNumber = Number.parseInt(raw, 10);
    if (Number.isFinite(asNumber) && asNumber >= 1 && asNumber <= 36) {
      monthValues.push(asNumber);
      continue;
    }

    // Fallback: non-numeric mark (e.g. X) → use the column header month.
    monthValues.push(GANTT_MONTHS[col - 2]);
  }

  if (monthValues.length === 0) {
    return { startMonth: 1, endMonth: 1 };
  }

  return {
    startMonth: Math.min(...monthValues),
    endMonth: Math.max(...monthValues),
  };
}

function parseWorkPlanTasks(rows) {
  const headerIdx = rows.findIndex(
    (row) =>
      row.length >= 8 &&
      row[0] === '#' &&
      normalizeHeader(row[1]) === 'task' &&
      row[2] === '6'
  );
  if (headerIdx === -1) return [];

  const tasks = [];
  for (let i = headerIdx + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.length < 2) continue;

    const first = (row[0] || '').trim();
    if (normalizeHeader(first) === 'bibliography') break;
    if (!/^\d+$/.test(first)) continue;

    const title = (row[1] || '').trim();
    if (!title) continue;

    const { startMonth, endMonth } = parseGanttMonthsFromRow(row);

    tasks.push({
      id: `task-imported-${first}-${Date.now()}-${i}`,
      title,
      startMonth,
      endMonth,
    });
  }

  return tasks;
}

function parseBiographyTable(rows) {
  const result = {
    biographicalSummaryName: '',
    biographicalSummaryPositionTitle: '',
    bibliographyEducationTraining: [],
  };

  const nameRowIdx = rows.findIndex(
    (row) =>
      row.length >= 2 &&
      normalizeHeader(row[0]) === 'name' &&
      normalizeHeader(row[1]).includes('position title')
  );

  if (nameRowIdx !== -1) {
    const nameRow = rows[nameRowIdx];
    const nameValue = (nameRow[0] || '').trim();
    const positionValue = (nameRow[1] || '').trim();
    if (nameValue && normalizeHeader(nameValue) !== 'name') {
      result.biographicalSummaryName = nameValue;
    }
    if (positionValue && !normalizeHeader(positionValue).includes('position title')) {
      result.biographicalSummaryPositionTitle = positionValue;
    }

    if (!result.biographicalSummaryName && nameRowIdx > 0) {
      const prev = rows[nameRowIdx - 1];
      if (prev.length === 1 && prev[0]) {
        const lines = prev[0].split(/\n+/).map((line) => line.trim()).filter(Boolean);
        if (lines[0]) result.biographicalSummaryName = lines[0];
        if (lines[1]) result.biographicalSummaryPositionTitle = lines[1];
      }
    }
  }

  const educationHeaderIdx = rows.findIndex((row) =>
    (row[0] || '').toLowerCase().includes('education/training')
  );
  const columnHeaderIdx = rows.findIndex(
    (row, idx) =>
      idx > educationHeaderIdx &&
      row.length >= 4 &&
      normalizeHeader(row[0]).includes('institution and location')
  );

  const startIdx = columnHeaderIdx === -1 ? educationHeaderIdx + 1 : columnHeaderIdx + 1;
  for (let i = startIdx; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.length < 4) continue;
    const [institutionLocation, degree, monthYear, fieldOfStudy] = row;
    const hasContent = [institutionLocation, degree, monthYear, fieldOfStudy].some((v) =>
      String(v || '').trim()
    );
    if (!hasContent) continue;
    result.bibliographyEducationTraining.push({
      institutionLocation: institutionLocation || '',
      degree: degree || '',
      monthYear: monthYear || '',
      fieldOfStudy: fieldOfStudy || '',
    });
  }

  if (result.bibliographyEducationTraining.length === 0) {
    result.bibliographyEducationTraining = [
      { institutionLocation: '', degree: '', monthYear: '', fieldOfStudy: '' },
    ];
  }

  return result;
}

function parseBiographyParagraphs(paragraphs) {
  const result = {};
  const markers = paragraphs
    .map((text, index) => {
      const match = BIO_SECTION_MARKERS.find((item) => item.prefix.test(text));
      return match ? { index, key: match.key } : null;
    })
    .filter(Boolean);

  for (let i = 0; i < markers.length; i += 1) {
    const current = markers[i];
    const nextIndex = markers[i + 1]?.index ?? paragraphs.length;
    const parts = [];
    for (let p = current.index + 1; p < nextIndex; p += 1) {
      if (paragraphs[p]) parts.push(paragraphs[p]);
    }
    result[current.key] = parts.join('\n\n').trim();
  }

  return result;
}

function countFilledFields(parsed) {
  const contentKeys = [
    'projectTitle',
    'principalInvestigatorName',
    'abstract',
    'scientificBackground',
    'researchObjectives',
    'detailedDescription',
    'significanceInnovation',
    'applicability',
    'bibliographyPersonalStatement',
    'bibliographyPositionsAndHonors',
    'bibliographySelectedPublications',
    'bibliographyResearchSupport',
    'biographicalSummaryName',
    'biographicalSummaryPositionTitle',
  ];

  let count = 0;
  for (const key of contentKeys) {
    if (String(parsed[key] || '').trim()) count += 1;
  }
  if (Array.isArray(parsed.workPlanTasks) && parsed.workPlanTasks.length > 0) count += 1;
  if (
    Array.isArray(parsed.bibliographyEducationTraining) &&
    parsed.bibliographyEducationTraining.some((row) =>
      Object.values(row).some((v) => String(v).trim())
    )
  ) {
    count += 1;
  }
  return count;
}

function isMainProposalTable(rows) {
  return rows.some((row) => normalizeHeader(row[0]) === 'abstract');
}

function isBiographyTable(rows) {
  return rows.some((row) => normalizeHeader(row[0]) === 'biographical summary');
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

  const parsed = {
    projectTitle: '',
    principalInvestigatorName: '',
    abstract: '',
    scientificBackground: '',
    researchObjectives: '',
    detailedDescription: '',
    significanceInnovation: '',
    applicability: '',
    workPlanTasks: [],
    biographicalSummaryName: '',
    biographicalSummaryPositionTitle: '',
    bibliographyEducationTraining: [
      { institutionLocation: '', degree: '', monthYear: '', fieldOfStudy: '' },
    ],
    bibliographyPersonalStatement: '',
    bibliographyPositionsAndHonors: '',
    bibliographySelectedPublications: '',
    bibliographyResearchSupport: '',
  };

  for (let i = 0; i < paragraphs.length; i += 1) {
    const text = paragraphs[i];
    if (/^Title\s*:/i.test(text)) {
      const title = extractAfterColon(text);
      if (title) parsed.projectTitle = title;
    }
    if (/^Principal Investigator/i.test(text)) {
      const pi = extractAfterColon(text);
      if (pi) {
        parsed.principalInvestigatorName = pi;
      } else {
        const next = paragraphs[i + 1] || '';
        if (next && !/^BIOGRAPHICAL SUMMARY/i.test(next) && !/^A\.?\s*Personal Statement/i.test(next)) {
          parsed.principalInvestigatorName = next.trim();
        }
      }
    }
  }

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

  if (countFilledFields(parsed) === 0) {
    throw new Error(
      'לא נמצא תוכן בטופס. ודאו שהעליתם קובץ Word מלא (לא תבנית ריקה) לפי הפורמט הקבוע.'
    );
  }

  if (!mainTable) {
    throw new Error(
      'הקובץ אינו תואם לפורמט הקבוע. הורידו את התבנית מהקישור "הורדת פורמט קבוע" ומלאו אותה.'
    );
  }

  return parsed;
}
