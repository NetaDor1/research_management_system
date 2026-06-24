export const CONTENT_SECTIONS = [
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

export const GANTT_MONTHS = [6, 12, 18, 24, 30, 36];

export const BIO_SECTION_MARKERS = [
  { key: 'bibliographyPersonalStatement', prefix: /^A\.?\s*Personal Statement/i },
  { key: 'bibliographyPositionsAndHonors', prefix: /^B\.?\s*Positions and Honors/i },
  {
    key: 'bibliographySelectedPublications',
    prefix: /^C\.?\s*Selected Peer[\s-]*reviewed Publications/i,
  },
  { key: 'bibliographyResearchSupport', prefix: /^D\.?\s*Research Support/i },
];

export function normalizeHeader(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function extractAfterColon(text) {
  const idx = text.indexOf(':');
  if (idx === -1) return '';
  return text
    .slice(idx + 1)
    .replace(/_+/g, '')
    .trim();
}

export function createEmptyParsed() {
  return {
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
}

export function isKnownSectionHeader(line) {
  const normalized = normalizeHeader(line);
  if (CONTENT_SECTIONS.some((s) => normalizeHeader(s.header) === normalized)) return true;
  if (CONTENT_SECTIONS.some((s) => normalized.startsWith(normalizeHeader(s.header)))) return true;
  if (normalized === 'work plan and gantt' || normalized.startsWith('work plan and gantt')) return true;
  if (normalized === 'bibliography' || normalized.startsWith('bibliography')) return true;
  if (normalized === 'biographical summary') return true;
  if (BIO_SECTION_MARKERS.some((m) => m.prefix.test(line.trim()))) return true;
  if (/^principal investigator/i.test(line)) return true;
  if (/^education\/training/i.test(line)) return true;
  if (normalized.includes('institution and location')) return true;
  if (/^research proposal/i.test(line)) return true;
  if (/^title\s*:/i.test(line)) return true;
  if (/^project coordinator\s*:/i.test(line)) return true;
  if (/^name$/i.test(normalized) || normalized.includes('position title')) return true;
  return false;
}

export function isPdfNoiseLine(line) {
  const trimmed = (line || '').trim();
  if (!trimmed) return true;
  if (/^\.?\d{1,2}$/.test(trimmed)) return true;
  if (/^_+$/.test(trimmed)) return true;
  return false;
}

export function normalizePdfPunctuation(line) {
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

export function cleanPdfContentLine(line) {
  let s = normalizePdfPunctuation(line);
  s = s.replace(/^\.\s*-\s*/g, '');
  if (!/^\s*-/.test(s)) {
    s = s.replace(/\s*-\s*\.?\s*$/g, '');
  }
  s = s.replace(/\s+\.\d{1,2}\s*$/g, '');
  s = s.replace(/^\.\d{1,2}\s+/g, '');
  return s.trim();
}

const HEBREW_CHAR_RE = /[\u0590-\u05FF]/;
const LATIN_CHAR_RE = /[A-Za-z]/;
const PDF_ORPHAN_PROMPT_RE =
  /^(תאר את|להציג את|יש לתאר|סקור את|הגדר את|פרט את|נתח את|הסבר את|תאר|להציג|סקור)/;
const PDF_ORPHAN_X_GAP = 28;
const PDF_SHORT_PROMPT_RE = /^(תאר את|להציג את|הגדר את|פרט את|נתח את|הסבר את)$/;

export function countScriptCharsInItems(items) {
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

/** Join Hebrew fragments inside a single table cell (RTL order, merge split words). */
export function joinHebrewCellFragments(items) {
  const parts = (items || [])
    .map((item) => ({ x: item.x ?? 0, text: String(item.text || '').trim() }))
    .filter((item) => item.text && item.text !== ':' && !/^[_\s.:]+$/.test(item.text));

  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].text;

  const sorted = [...parts].sort((a, b) => b.x - a.x);
  let result = '';
  for (const { text } of sorted) {
    if (!result) {
      result = text;
      continue;
    }
    const continuesWord =
      HEBREW_CHAR_RE.test(result.slice(-1)) &&
      HEBREW_CHAR_RE.test(text[0]) &&
      !/\s$/.test(result) &&
      !/^\s/.test(text) &&
      /^[\u0590-\u05FF](\s|$)/.test(text);
    result += continuesWord ? text : `${result.endsWith(' ') ? '' : ' '}${text}`;
  }
  return cleanPdfContentLine(result);
}

export function extractPdfTitleFromItems(items) {
  const sorted = [...(items || [])].sort((a, b) => a.x - b.x);
  const titleIdx = sorted.findIndex((item) => /^title$/i.test(item.text.trim()));
  if (titleIdx === -1) return '';
  const valueItems = sorted.slice(titleIdx + 1).filter((item) => {
    const t = item.text.trim();
    return t && t !== ':' && !/^[_\s.:]+$/.test(t);
  });
  return joinHebrewCellFragments(valueItems);
}

function joinRtlPdfRowItems(items) {
  const prompts = [];
  const rest = [];

  for (const item of items) {
    if (PDF_SHORT_PROMPT_RE.test(item.text.trim())) {
      prompts.push(item);
    } else {
      rest.push(item);
    }
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
  const body = inlineItems
    .map((item) => item.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleanPdfContentLine(leading ? `${leading} ${body}` : body);
}

/** Join PDF text fragments in visual reading order (RTL for Hebrew rows). */
export function joinPdfRowItems(items) {
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
  if (rtl) {
    return joinRtlPdfRowItems(items);
  }

  return cleanPdfContentLine(ltrSorted.map((item) => item.text).join(' ').replace(/\s+/g, ' '));
}

/**
 * PDF forms sometimes place the next line's Hebrew prompt on the far left of the
 * previous row. Move that orphan cluster to the following row.
 */
export function extractLeftOrphanPrompt(row) {
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

  const orphanText = cluster
    .map((item) => item.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!PDF_ORPHAN_PROMPT_RE.test(orphanText) || orphanText.length > 48) return null;

  return {
    orphanItems: cluster,
    mainItems: byXAsc.slice(cluster.length),
  };
}

export function repositionOrphanPrompts(rows) {
  for (let i = 0; i < rows.length; i += 1) {
    const split = extractLeftOrphanPrompt(rows[i]);
    if (!split) continue;

    rows[i].items = split.mainItems;
    if (i + 1 >= rows.length || rows[i].page !== rows[i + 1].page) continue;

    rows[i + 1].items = [...split.orphanItems, ...rows[i + 1].items];
  }
  return rows;
}

export function findBioMarkerInLine(line) {
  const trimmed = (line || '').trim();
  for (const marker of BIO_SECTION_MARKERS) {
    const match = trimmed.match(marker.prefix);
    if (match) {
      return { marker, index: match.index ?? 0 };
    }
  }
  return null;
}

export const SECTION_NUMBER_TO_KEY = {
  1: 'abstract',
  2: 'scientificBackground',
  3: 'researchObjectives',
  4: 'detailedDescription',
  5: 'significanceInnovation',
  6: 'applicability',
};

export function stripLeadingSectionNumber(line) {
  return String(line || '')
    .replace(/^\d+\.\s*/, '')
    .trim();
}

export function fuzzyMatchContentSection(title) {
  const n = normalizeHeader(title).replace(/\s+/g, ' ');
  const compact = n.replace(/\s+/g, '');

  for (const section of CONTENT_SECTIONS) {
    const hn = normalizeHeader(section.header);
    const hc = hn.replace(/\s+/g, '');
    if (n === hn || compact === hc || compact.startsWith(hc) || hc.startsWith(compact)) {
      return section;
    }
    if (hc.includes('detailed') && compact.includes('detailed')) return section;
    if (hc.includes('significance') && compact.includes('significance')) return section;
    if (hc.includes('applicability') && compact.includes('applicability')) return section;
    if (hc.includes('abstract') && compact.includes('abstract')) return section;
  }
  return null;
}

export function findNumberedSectionBoundaries(lines) {
  const boundaries = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = (lines[i] || '').match(/^(\d+)\.\s*(.+)$/);
    if (!match) continue;
    boundaries.push({
      index: i,
      num: Number.parseInt(match[1], 10),
      title: match[2].trim(),
    });
  }
  return boundaries;
}

/** PDF export numbers sections as "1. Abstract", "2. Scientific background...", etc. */
export function parseNumberedContentSections(lines) {
  const boundaries = findNumberedSectionBoundaries(lines);
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

    if (parts.length) {
      result[key] = parts.join('\n').trim();
    }
  }

  return result;
}

export function matchContentSectionLine(line) {
  const numbered = (line || '').match(/^(\d+)\.\s*(.+)$/);
  if (numbered) {
    const section = fuzzyMatchContentSection(numbered[2].trim());
    if (section) {
      return { section, tail: '', isHeaderOnly: true };
    }
    return null;
  }

  const cleaned = cleanPdfContentLine(line);
  if (!cleaned) return null;
  const n = normalizeHeader(cleaned);

  for (const section of CONTENT_SECTIONS) {
    const hn = normalizeHeader(section.header);
    if (n === hn || n.replace(/\s*\.\d{1,2}$/, '') === hn) {
      return { section, tail: '', isHeaderOnly: true };
    }

    if (cleaned.includes(section.header)) {
      const idx = cleaned.indexOf(section.header);
      const tail = cleanPdfContentLine(cleaned.slice(idx + section.header.length).replace(/^[\s.:_\d]+/, ''));
      const headerOnly = !tail || /^[.:_\s\d]+$/.test(tail);
      if (headerOnly || cleaned.length <= section.header.length + 12) {
        return { section, tail: headerOnly ? '' : tail, isHeaderOnly: headerOnly };
      }
    }

    if (n.startsWith(hn)) {
      const idx = cleaned.toLowerCase().indexOf(section.header.toLowerCase());
      const tail = idx >= 0 ? cleaned.slice(idx + section.header.length) : '';
      const cleanedTail = cleanPdfContentLine(tail.replace(/^[\s.:_\d]+/, ''));
      return {
        section,
        tail: cleanedTail,
        isHeaderOnly: !cleanedTail,
      };
    }
  }
  return null;
}

export function isContentSectionHeaderOnly(line) {
  return Boolean(matchContentSectionLine(line)?.isHeaderOnly);
}

const BIO_INSTRUCTION_PHRASES = [
  /briefly describe/i,
  /list selected/i,
  /list in chronological/i,
  /mark the 5 most/i,
  /in order of relevance/i,
  /undertake the role assigned/i,
  /proposed in the current application/i,
  /relevant articles for the research proposal/i,
  /research proposed in the application/i,
  /peer[\s-]*reviewed publications/i,
  /manuscripts in pres/i,
  /ongoing and completed research projects/i,
  /concluding with the present position/i,
  /list any honors/i,
  /^etc\.\)/i,
  /^research proposed in the/i,
  /^relevant articles for the/i,
  /^in the project proposed/i,
  /^proposed in the current/i,
  /^current application/i,
  /^qualifi/i,
  /^es you to undertake/i,
  /^role assigned/i,
  /^if applicable\)/i,
];

export function isBioInstructionLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return true;

  if (HEBREW_CHAR_RE.test(trimmed)) return false;

  if (/^\(/.test(trimmed)) return true;
  if (/^etc\.\)/i.test(trimmed)) return true;
  if (/^\)\.?$/.test(trimmed)) return true;

  return BIO_INSTRUCTION_PHRASES.some((pattern) => pattern.test(trimmed));
}

export function stripBioInstructions(text) {
  let s = String(text || '').trim();
  if (!s) return '';

  if (isBioInstructionLine(s)) return '';

  while (/^\([^)]*\)/.test(s)) {
    s = s.replace(/^\([^)]*\)\s*/, '').trim();
  }

  if (isBioInstructionLine(s)) return '';

  return cleanPdfContentLine(s.replace(/^[:\-.)\s]+/, ''));
}

export function mergeParsedFields(target, source) {
  if (!source || typeof source !== 'object') return target;

  for (const [key, value] of Object.entries(source)) {
    if (value == null) continue;

    if (Array.isArray(value)) {
      if (key === 'workPlanTasks' && value.length > 0 && !(target.workPlanTasks || []).length) {
        target.workPlanTasks = value;
      } else if (
        key === 'bibliographyEducationTraining' &&
        value.some((row) => Object.values(row || {}).some((v) => String(v).trim())) &&
        !(target.bibliographyEducationTraining || []).some((row) =>
          Object.values(row || {}).some((v) => String(v).trim())
        )
      ) {
        target.bibliographyEducationTraining = value;
      }
      continue;
    }

    const incoming = String(value).trim();
    const existing = String(target[key] || '').trim();
    if (incoming && (!existing || incoming.length > existing.length)) {
      target[key] = value;
    }
  }

  return target;
}

export function parseMainContentTable(rows) {
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

export function parseContentSectionsFromLines(lines) {
  const result = {};
  for (let i = 0; i < lines.length; i += 1) {
    const match = matchContentSectionLine(lines[i]);
    if (!match) continue;

    const parts = [];
    if (match.tail) parts.push(match.tail);

    for (let j = i + 1; j < lines.length; j += 1) {
      const nextLine = lines[j];
      if (!nextLine?.trim() || isPdfNoiseLine(nextLine)) continue;
      if (isContentSectionHeaderOnly(nextLine)) break;
      if (/^work plan and gantt/i.test(nextLine.trim())) break;
      if (/^bibliography$/i.test(nextLine.trim())) break;
      if (BIO_SECTION_MARKERS.some((m) => m.prefix.test(nextLine.trim()))) break;
      parts.push(cleanPdfContentLine(nextLine));
    }

    if (parts.length) {
      result[match.section.key] = parts.join('\n').trim();
    }
  }
  return result;
}

export function parseGanttMonthsFromRow(row) {
  const monthValues = [];

  for (let col = 2; col <= 7; col += 1) {
    const raw = (row[col] || '').trim();
    if (!raw) continue;

    const asNumber = Number.parseInt(raw, 10);
    if (Number.isFinite(asNumber) && asNumber >= 1 && asNumber <= 36) {
      monthValues.push(asNumber);
      continue;
    }

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

export function parseWorkPlanTasks(rows) {
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

export function normalizeEducationMonthYear(value) {
  return String(value || '')
    .replace(/\b2\s+025\b/g, '2025')
    .replace(/\b025\s+2\b/g, '2025')
    .replace(/\b2\s+023\b/g, '2023')
    .replace(/\b023\s+2\b/g, '2023')
    .replace(/\b2\s+024\b/g, '2024')
    .replace(/\b024\s+2\b/g, '2024')
    .replace(/\b2\s+026\b/g, '2026')
    .replace(/\b026\s+2\b/g, '2026')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseBiographyTable(rows) {
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

  if (nameRowIdx !== -1 && nameRowIdx + 1 < rows.length) {
    const dataRow = rows[nameRowIdx + 1];
    if (dataRow.length >= 2) {
      const nameValue = (dataRow[0] || '').trim();
      const positionValue = (dataRow[1] || '').trim();
      if (nameValue && normalizeHeader(nameValue) !== 'name') {
        result.biographicalSummaryName = nameValue;
      }
      if (positionValue && !normalizeHeader(positionValue).includes('position title')) {
        result.biographicalSummaryPositionTitle = positionValue;
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
      monthYear: normalizeEducationMonthYear(monthYear),
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

export function parseBiographyParagraphs(paragraphs) {
  const result = {};
  const occurrences = [];

  for (let i = 0; i < paragraphs.length; i += 1) {
    const line = paragraphs[i] || '';
    for (const marker of BIO_SECTION_MARKERS) {
      const match = line.match(marker.prefix);
      if (match) {
        occurrences.push({
          index: i,
          key: marker.key,
          matchIndex: match.index ?? 0,
          matchText: match[0],
        });
        break;
      }
    }
  }

  occurrences.sort((a, b) => a.index - b.index);

  for (let o = 0; o < occurrences.length; o += 1) {
    const current = occurrences[o];
    const nextIndex = occurrences[o + 1]?.index ?? paragraphs.length;
    const parts = [];

    const sameLineTail = stripBioInstructions(
      (paragraphs[current.index] || '').slice(current.matchIndex + current.matchText.length)
    );
    if (sameLineTail && !isBioInstructionLine(sameLineTail)) parts.push(sameLineTail);

    for (let p = current.index + 1; p < nextIndex; p += 1) {
      const rawLine = paragraphs[p];
      if (!rawLine?.trim() || isPdfNoiseLine(rawLine)) continue;
      if (isBioInstructionLine(rawLine)) continue;
      parts.push(cleanPdfContentLine(rawLine));
    }

    result[current.key] = parts.join('\n\n').trim();
  }

  return result;
}

export function applyMetadataFromLines(lines, parsed) {
  for (let i = 0; i < lines.length; i += 1) {
    const text = lines[i];
    if (/^Title\s*:/i.test(text)) {
      const title = extractAfterColon(text);
      if (title) parsed.projectTitle = title;
    }
    if (/^Principal Investigator/i.test(text)) {
      const pi = extractAfterColon(text);
      if (pi) {
        parsed.principalInvestigatorName = pi;
      } else {
        const next = lines[i + 1] || '';
        if (next && !/^BIOGRAPHICAL SUMMARY/i.test(next) && !/^A\.?\s*Personal Statement/i.test(next)) {
          parsed.principalInvestigatorName = next.trim();
        }
      }
    }
  }
}

export function countFilledFields(parsed) {
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

export function validateParsed(parsed, { requireMainContent = true } = {}) {
  if (countFilledFields(parsed) === 0) {
    throw new Error(
      'לא נמצא תוכן בטופס. ודאו שהעליתם קובץ מלא (לא תבנית ריקה) לפי הפורמט הקבוע.'
    );
  }

  if (requireMainContent) {
    const hasMainContent = CONTENT_SECTIONS.some((s) => String(parsed[s.key] || '').trim());
    if (!hasMainContent && !(Array.isArray(parsed.workPlanTasks) && parsed.workPlanTasks.length)) {
      throw new Error(
        'הקובץ אינו תואם לפורמט הקבוע. הורידו את התבנית מהקישור "הורדת פורמט קבוע" ומלאו אותה.'
      );
    }
  }
}

export function isMainProposalTable(rows) {
  return rows.some((row) => normalizeHeader(row[0]) === 'abstract');
}

export function isBiographyTable(rows) {
  return rows.some((row) => normalizeHeader(row[0]) === 'biographical summary');
}
