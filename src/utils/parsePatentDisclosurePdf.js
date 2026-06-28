import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.entry';
import {
  FUNDING_OPTION_PATTERNS,
  createEmptyPatentDisclosureParsed,
  validateParsed,
  normalizeLine,
  normalizeDateToDisplay,
  parseRoleType,
  isPatentPdfNoiseLine,
  isTemplateText,
} from './patentDisclosureParseShared';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const Y_TOLERANCE = 5;

// Maximum horizontal gap (in PDF units) between two fragments that still belong
// to the same word. Real spaces between words are typically ~3 units, while
// letters broken apart within a word start exactly where the previous ended.
const FRAGMENT_MERGE_GAP = 2;

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
        w: typeof item.width === 'number' ? item.width : text.length * 5,
        t: text,
        page: pageNum,
      });
    }
  }

  return items;
}

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
  return rows;
}

/**
 * Merge horizontally-adjacent fragments that were split mid-word by the PDF
 * encoder (e.g. "N" + "ew" → "New"), while keeping genuine spaces between words.
 */
function mergeFragments(items) {
  const sorted = items.slice().sort((a, b) => a.x - b.x);
  const tokens = [];

  for (const item of sorted) {
    const prev = tokens[tokens.length - 1];
    if (prev) {
      const prevEnd = prev.x + prev.w;
      const gap = item.x - prevEnd;
      if (gap <= FRAGMENT_MERGE_GAP) {
        prev.t += item.t;
        prev.w = item.x + item.w - prev.x;
        continue;
      }
    }
    tokens.push({ x: item.x, w: item.w, t: item.t });
  }

  return tokens;
}

function toStructuredRows(positionedRows) {
  return positionedRows.map((row) => {
    const tokens = mergeFragments(row.items);
    return {
      page: row.page,
      y: row.y,
      tokens,
      line: tokens
        .map((token) => token.t)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    };
  });
}

function findRowIndex(rows, pattern) {
  return rows.findIndex((row) => pattern.test(normalizeLine(row.line)));
}

function collectContentLines(rows, startIdx, stopPattern) {
  const parts = [];
  for (let i = startIdx; i < rows.length; i += 1) {
    const line = normalizeLine(rows[i].line);
    if (!line) continue;
    if (stopPattern && stopPattern.test(line)) break;
    if (isPatentPdfNoiseLine(line)) continue;
    parts.push(line);
  }
  return parts.join('\n').trim();
}

// A prompt/label line ends either with a colon or with the "(English)" hint
// (optionally followed by ":", "?" or "."). The user's answer follows it.
function isPromptEndLine(line) {
  return /:\s*$/.test(line) || /\(english\)\s*[?:.]?\s*$/i.test(line);
}

function getValueAfterLabel(rows, labelPattern, stopPattern) {
  const idx = findRowIndex(rows, labelPattern);
  if (idx === -1) return '';

  let endIdx = idx;
  let found = false;
  for (let i = idx; i < Math.min(idx + 6, rows.length); i += 1) {
    const line = normalizeLine(rows[i].line);
    if (i > idx && stopPattern && stopPattern.test(line)) break;
    if (isPromptEndLine(line)) {
      endIdx = i;
      found = true;
      break;
    }
  }

  if (!found) {
    const inlineMatch = normalizeLine(rows[idx].line).match(/:\s*(\S.*)$/);
    if (inlineMatch?.[1] && !/^[\s–-]+$/.test(inlineMatch[1])) {
      const inline = normalizeLine(inlineMatch[1]);
      if (inline && !isPatentPdfNoiseLine(inline)) return inline;
    }
    endIdx = idx;
  }

  return collectContentLines(rows, endIdx + 1, stopPattern);
}

function getSingleLineAfterLabel(rows, labelPattern, stopPattern) {
  const value = getValueAfterLabel(rows, labelPattern, stopPattern);
  return value.split('\n')[0]?.trim() || '';
}

// Some prompts span many rows and end with a fixed phrase rather than ":" or
// "(English)". Collect the user's answer after that phrase.
function getValueAfterPhrase(rows, labelPattern, phrasePattern, stopPattern) {
  const idx = findRowIndex(rows, labelPattern);
  if (idx === -1) return '';

  let endIdx = idx;
  for (let i = idx; i < Math.min(idx + 8, rows.length); i += 1) {
    const line = normalizeLine(rows[i].line);
    if (phrasePattern.test(line)) { endIdx = i; break; }
    if (i > idx && stopPattern && stopPattern.test(line)) { endIdx = i - 1; break; }
  }

  return collectContentLines(rows, endIdx + 1, stopPattern);
}

function parseYesNoFromRow(row) {
  const items = row.tokens.slice().sort((a, b) => a.x - b.x);
  const yesItem = items.find((item) => /^yes$/i.test(item.t));
  const noItem = items.find((item) => /^no$/i.test(item.t));
  const markItem = items.find((item) => /^[vVxX✓√]$/.test(item.t));
  if (!yesItem || !noItem) return '';
  if (!markItem) return '';
  const distYes = Math.abs(markItem.x - yesItem.x);
  const distNo = Math.abs(markItem.x - noItem.x);
  return distYes <= distNo ? 'yes' : 'no';
}

function findYesNoRow(rows, labelPattern) {
  const idx = findRowIndex(rows, labelPattern);
  if (idx === -1) return null;
  for (let i = idx; i < Math.min(idx + 4, rows.length); i += 1) {
    if (/^yes\b/i.test(rows[i].line) && /\bno\b/i.test(rows[i].line)) {
      return rows[i];
    }
  }
  return null;
}

function findItemX(items, pattern) {
  const match = items.find((item) => pattern.test(item.t));
  return match ? match.x : null;
}

// Table headers in this form often span several rows (e.g. "Source of / support
// (fund, / company)"). Gather tokens from the header row plus a few following
// rows so column anchors can be detected regardless of which row a label sits on.
function collectHeaderTokens(rows, headerIdx, extraRows) {
  let tokens = rows[headerIdx].tokens.slice();
  for (let k = 1; k <= extraRows && headerIdx + k < rows.length; k += 1) {
    tokens = tokens.concat(rows[headerIdx + k].tokens);
  }
  return tokens;
}

function assignItemsToColumns(items, anchors) {
  const sorted = anchors
    .filter((anchor) => anchor.x != null)
    .sort((a, b) => a.x - b.x);
  const result = {};
  for (const item of items) {
    let key = sorted[0]?.key;
    for (let i = sorted.length - 1; i >= 0; i -= 1) {
      if (item.x >= sorted[i].x - 15) {
        key = sorted[i].key;
        break;
      }
    }
    if (!key) continue;
    result[key] = result[key] ? `${result[key]} ${item.t}` : item.t;
  }
  Object.keys(result).forEach((key) => {
    result[key] = normalizeLine(result[key]);
  });
  return result;
}

function isInventorDataRow(row) {
  const line = normalizeLine(row.line);
  if (!line || isPatentPdfNoiseLine(line)) return false;
  if (/^1\.\s*inventor/i.test(line)) return false;
  if (/^2\.\s*contributor/i.test(line)) return false;
  if (/title,\s*name/i.test(line)) return false;
  if (/invention \(%\)/i.test(line)) return false;
  return row.tokens.some((item) => item.x >= 120 && item.x <= 520 && /\d/.test(item.t));
}

function parseInventors(rows) {
  const headerIdx = rows.findIndex(
    (row) => /title,\s*name/i.test(row.line) && /\bID\b/i.test(row.line)
  );
  if (headerIdx === -1) return [];

  const headerItems = rows[headerIdx].tokens;
  const anchors = [
    { key: 'name', x: findItemX(headerItems, /^title/i) },
    { key: 'nationalId', x: findItemX(headerItems, /^ID$/i) },
    { key: 'department', x: findItemX(headerItems, /department/i) },
    { key: 'partInInvention', x: findItemX(headerItems, /part in/i) },
    { key: 'roleType', x: findItemX(headerItems, /inventor|contributor/i) },
  ];

  const inventors = [];
  for (let i = headerIdx + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (/^1\.\s*inventor/i.test(row.line)) break;
    if (!isInventorDataRow(row)) continue;

    const cells = assignItemsToColumns(row.tokens, anchors);
    if (!cells.name && !cells.nationalId) continue;

    inventors.push({
      title: '',
      name: cells.name || '',
      nationalId: cells.nationalId || '',
      department: cells.department || '',
      partInInvention: cells.partInInvention || '',
      roleType: parseRoleType(cells.roleType),
    });
  }

  return inventors;
}

function parseFundingSupportType(rows) {
  const idx = findRowIndex(rows, /funding,\s*support/i);
  if (idx === -1) return '';

  for (let i = idx; i < Math.min(idx + 12, rows.length); i += 1) {
    const line = normalizeLine(rows[i].line);
    for (const opt of FUNDING_OPTION_PATTERNS) {
      if (!opt.pattern.test(line)) continue;
      const mark = rows[i].tokens.find((item) => /^[vVxX✓√]$/.test(item.t));
      if (mark) return opt.value;
    }
  }
  return '';
}

function parseFundingSources(rows) {
  const headerIdx = rows.findIndex((row) => /source of support/i.test(row.line) && /grant/i.test(row.line));
  if (headerIdx === -1) return [];

  const headerItems = collectHeaderTokens(rows, headerIdx, 2);
  const anchors = [
    { key: 'source', x: findItemX(headerItems, /source of/i) ?? findItemX(headerItems, /support \(fund/i) },
    { key: 'supportPeriod', x: findItemX(headerItems, /period/i) },
    { key: 'grantNumber', x: findItemX(headerItems, /^grant$/i) ?? findItemX(headerItems, /grant/i) },
    { key: 'subjectComments', x: findItemX(headerItems, /subject/i) },
  ];

  const sources = [];
  for (let i = headerIdx + 1; i < rows.length; i += 1) {
    const line = normalizeLine(rows[i].line);
    if (/^5a\./i.test(line) || /^use of non/i.test(line)) break;
    if (!line || isTemplateText(line)) continue;
    if (/^support \(fund/i.test(line) || /^company\)/i.test(line) || /^\(including/i.test(line)) continue;

    const cells = assignItemsToColumns(rows[i].tokens, anchors);
    if (!cells.source && !cells.grantNumber && !cells.supportPeriod && !cells.subjectComments) continue;

    sources.push({
      source: cells.source || '',
      supportPeriod: cells.supportPeriod || '',
      grantNumber: cells.grantNumber || '',
      subjectComments: cells.subjectComments || '',
    });
  }

  return sources;
}

function parseInventionDate(rows) {
  const idx = findRowIndex(rows, /4a\.\s*first date when invention was made/i);
  if (idx === -1) return '';

  for (let i = idx; i < Math.min(idx + 6, rows.length); i += 1) {
    const line = normalizeLine(rows[i].line);
    const dateMatch = line.match(/^date:\s*(.+)$/i);
    if (dateMatch?.[1]) {
      const value = normalizeDateToDisplay(dateMatch[1]);
      if (value) return value;
    }
  }
  return '';
}

function parsePriorArtPatents(rows) {
  const sectionIdx = findRowIndex(rows, /^patents:\s*$/i);
  if (sectionIdx === -1) return [];

  const headerIdx = rows.findIndex(
    (row, index) =>
      index > sectionIdx
      && /country/i.test(row.line)
      && /patent/i.test(row.line)
      && /title/i.test(row.line)
  );
  if (headerIdx === -1) return [];

  const headerItems = collectHeaderTokens(rows, headerIdx, 2);
  const anchors = [
    { key: 'country', x: findItemX(headerItems, /country/i) },
    { key: 'publicationNumber', x: findItemX(headerItems, /patent/i) ?? findItemX(headerItems, /^number$/i) },
    { key: 'title', x: findItemX(headerItems, /^title$/i) ?? findItemX(headerItems, /title/i) },
    { key: 'filingPublicationDate', x: findItemX(headerItems, /filing/i) ?? findItemX(headerItems, /^date$/i) },
    { key: 'relevance', x: findItemX(headerItems, /relevance/i) },
  ];

  const patents = [];
  for (let i = headerIdx + 1; i < rows.length; i += 1) {
    const line = normalizeLine(rows[i].line);
    if (/^other publications/i.test(line)) break;
    if (!line || isTemplateText(line)) continue;
    const patentHeaderWord = /^(publication|number|date|country|patent\/?|title|filing\/?|relevance)$/i;
    if (rows[i].tokens.every((tk) => patentHeaderWord.test(tk.t))) continue;

    const cells = assignItemsToColumns(rows[i].tokens, anchors);
    if (!cells.country && !cells.publicationNumber && !cells.title) continue;

    patents.push({
      country: cells.country || '',
      publicationNumber: cells.publicationNumber || '',
      title: cells.title || '',
      filingPublicationDate: cells.filingPublicationDate || '',
      relevance: cells.relevance || '',
    });
  }

  return patents;
}

function parsePriorArtPublications(rows) {
  const sectionIdx = findRowIndex(rows, /^other publications/i);
  if (sectionIdx === -1) return [];

  const headerIdx = rows.findIndex(
    (row, index) =>
      index > sectionIdx
      && /title/i.test(row.line)
      && /authors/i.test(row.line)
  );
  if (headerIdx === -1) return [];

  const headerItems = collectHeaderTokens(rows, headerIdx, 2);
  const anchors = [
    { key: 'title', x: findItemX(headerItems, /^title$/i) ?? findItemX(headerItems, /title/i) },
    { key: 'authors', x: findItemX(headerItems, /authors/i) },
    { key: 'placeOfPublication', x: findItemX(headerItems, /place of publication/i) },
    { key: 'publicationDate', x: findItemX(headerItems, /^date$/i) ?? findItemX(headerItems, /date/i) },
    { key: 'publishedByInventor', x: findItemX(headerItems, /published by/i) },
  ];

  const publications = [];
  for (let i = headerIdx + 1; i < rows.length; i += 1) {
    const line = normalizeLine(rows[i].line);
    if (/^9\.\s/i.test(line) || /^the inventors are hereby obligated/i.test(line)) break;
    if (!line || isTemplateText(line)) continue;
    if (/^\(journal/i.test(line) || /^include complete/i.test(line) || /^bibliographic/i.test(line)) continue;
    const pubHeaderWord = /^(title|authors|place|of|publication|date|published|by|inventor\??)$/i;
    if (rows[i].tokens.every((tk) => pubHeaderWord.test(tk.t))) continue;

    const cells = assignItemsToColumns(rows[i].tokens, anchors);
    if (!cells.title && !cells.authors) continue;

    const publishedRaw = (cells.publishedByInventor || '').toLowerCase();
    let publishedByInventor = cells.publishedByInventor || '';
    if (/^yes$/i.test(publishedRaw) || publishedRaw.includes('published')) publishedByInventor = 'yes';
    else if (/^no$/i.test(publishedRaw)) publishedByInventor = 'no';

    publications.push({
      title: cells.title || '',
      authors: cells.authors || '',
      placeOfPublication: cells.placeOfPublication || '',
      publicationDate: cells.publicationDate || '',
      publishedByInventor,
    });
  }

  return publications;
}

function parseMaterialsUsed(rows) {
  const idx = findRowIndex(rows, /^5a\.\s*use of non/i);
  if (idx === -1) return { used: '', details: '' };

  for (let i = idx; i < Math.min(idx + 10, rows.length); i += 1) {
    const line = normalizeLine(rows[i].line);
    if (/^6\.\s*has the invention/i.test(line)) break;

    if (/none used/i.test(line)) {
      const mark = rows[i].tokens.find((item) => /^[vVxX✓√]$/.test(item.t));
      if (mark) return { used: 'no', details: '' };
    }

    if (/yes,\s*materials/i.test(line)) {
      const mark = rows[i].tokens.find((item) => /^[vVxX✓√]$/.test(item.t));
      const details = getValueAfterPhrase(
        rows,
        /yes,\s*materials/i,
        /commercial entity\)/i,
        /^6\.\s/i
      );
      if (mark) {
        return { used: 'yes', details };
      }
      if (details) {
        return { used: 'yes', details };
      }
    }
  }

  return { used: '', details: '' };
}

function parsePublicationFields(rows, hasBeenPublished) {
  // The form has a single text box shared by the "If Yes" and "If No" prompts.
  // Its content sits after the whole prompt block ("...Presentation and etc..)").
  const value = getValueAfterPhrase(
    rows,
    /if\s*yes,\s*specify including all available details/i,
    /presentation and etc/i,
    /^7\.\s/i
  );

  if (hasBeenPublished === 'yes') {
    return { publicationDetails: value, futurePublicationPlans: '' };
  }
  if (hasBeenPublished === 'no') {
    return { publicationDetails: '', futurePublicationPlans: value };
  }
  return { publicationDetails: '', futurePublicationPlans: '' };
}

function isDisclosureForm(lines) {
  return lines.some((line) => /disclosure of invention form/i.test(line));
}

/**
 * Parse already-extracted PDF text items (each with x, y, w, t, page) into the
 * patent disclosure form fields. Separated from extraction so it can be tested.
 */
export function parsePatentDisclosureFromItems(textItems) {
  if (!textItems.length) {
    throw new Error('קובץ PDF לא תקין או ללא טקסט (ייתכן שמדובר בסריקת תמונה בלבד)');
  }

  const rows = toStructuredRows(clusterItemsIntoRows(textItems));
  const lines = rows.map((row) => row.line).filter(Boolean);

  if (!isDisclosureForm(lines)) {
    throw new Error(
      'הקובץ אינו תואם לטופס גילוי המצאה (DOI). הורידו את התבנית מהקישור "הורדת פורמט קבוע" ומלאו אותה.'
    );
  }

  const parsed = createEmptyPatentDisclosureParsed();

  parsed.inventionTitleEnglish = getSingleLineAfterLabel(rows, /^english:\s*$/i, /^hebrew:/i);
  parsed.inventionTitleHebrew = getSingleLineAfterLabel(
    rows,
    /^hebrew:\s*$/i,
    /^2\.\s*short description/i
  );
  parsed.shortDescription = getValueAfterLabel(
    rows,
    /short description of the invention/i,
    /^2a\./i
  );
  parsed.inventionTypeElaboration = getValueAfterLabel(rows, /^2a\./i, /^2b\./i);
  parsed.potentialCustomers = getValueAfterLabel(rows, /^2b\./i, /^2c\./i);
  parsed.commercialEntityContacts = getValueAfterLabel(rows, /^2c\./i, /^3\.\s*inventors/i);
  parsed.inventionFirstDate = parseInventionDate(rows);
  parsed.inventionTimeFrame = getValueAfterLabel(
    rows,
    /if an accurate date is not available/i,
    /^4\s*b\./i
  );
  parsed.inventionWorkType = getValueAfterLabel(rows, /^4\s*b\./i, /^5\.\s*funding/i);
  parsed.inventors = parseInventors(rows);
  parsed.fundingSupportType = parseFundingSupportType(rows);
  parsed.fundingSources = parseFundingSources(rows);

  // The selected funding option is often a Word checkbox that doesn't survive
  // PDF export as extractable text. When the funding-sources table has data but
  // no option was detected, infer a grant (the table is grant-oriented) so the
  // dependent detail fields become visible in the form.
  if (!parsed.fundingSupportType && parsed.fundingSources.length > 0) {
    parsed.fundingSupportType = 'grant';
  }

  const materials = parseMaterialsUsed(rows);
  parsed.nonJceMaterialsUsed = materials.used;
  parsed.nonJceMaterialsDetails = materials.details;

  const publicationRow = findYesNoRow(rows, /has the invention or part of it been published/i);
  parsed.hasBeenPublished = publicationRow ? parseYesNoFromRow(publicationRow) : '';
  Object.assign(parsed, parsePublicationFields(rows, parsed.hasBeenPublished));

  const priorPatentRow = findYesNoRow(rows, /has a patent application been filed for the invention/i);
  parsed.priorPatentFiled = priorPatentRow ? parseYesNoFromRow(priorPatentRow) : '';
  if (parsed.priorPatentFiled === 'yes') {
    parsed.priorPatentDetails = getValueAfterLabel(
      rows,
      /if yes,?\s*please specify \(number/i,
      /^8\.\s/i
    );
  }

  const literatureRow = findYesNoRow(rows, /did you perform an extended literature survey/i);
  parsed.literatureSurveyPerformed = literatureRow ? parseYesNoFromRow(literatureRow) : '';
  if (parsed.literatureSurveyPerformed === 'yes') {
    parsed.literatureSurveyNotes = getValueAfterPhrase(
      rows,
      /if yes, list all known relevant prior art references/i,
      /to the current invention/i,
      /^patents:\s*$/i
    );
  }

  parsed.priorArtPatents = parsePriorArtPatents(rows);
  parsed.priorArtPublications = parsePriorArtPublications(rows);

  validateParsed(parsed);
  return parsed;
}

/**
 * Parse a fixed-format patent disclosure (DOI) PDF in the browser.
 * @param {ArrayBuffer} arrayBuffer
 */
export async function parsePatentDisclosurePdf(arrayBuffer) {
  const textItems = await extractPdfTextItems(arrayBuffer);
  return parsePatentDisclosureFromItems(textItems);
}
