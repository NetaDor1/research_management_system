import JSZip from 'jszip';
import {
  FUNDING_OPTION_PATTERNS,
  createEmptyPatentDisclosureParsed,
  validateParsed,
  normalizeLine,
  normalizeDateToDisplay,
  parseRoleType,
  isTemplateText,
} from './patentDisclosureParseShared';

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

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

function sdtTextInNode(node) {
  const parts = [];
  for (const sdt of node.getElementsByTagNameNS(W_NS, 'sdt')) {
    for (const t of sdt.getElementsByTagNameNS(W_NS, 't')) {
      if (t.textContent) parts.push(t.textContent);
    }
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

function readBooleanVal(element) {
  const val =
    element.getAttributeNS?.(W_NS, 'val')
    ?? element.getAttribute('w:val')
    ?? element.getAttribute('val');
  // A boolean OOXML element with no explicit value defaults to "true"
  // (e.g. Word writes <w:checked/> for a ticked legacy form-field checkbox).
  if (val == null || val === '') return true;
  return val === '1' || val === 'true' || val === 'on';
}

function isCellCheckboxChecked(cell) {
  for (const box of cell.getElementsByTagNameNS(W_NS, 'checkBox')) {
    const checked = box.getElementsByTagNameNS(W_NS, 'checked')[0];
    if (checked) return readBooleanVal(checked);

    // When <w:checked> is absent the current state equals <w:default>.
    const def = box.getElementsByTagNameNS(W_NS, 'default')[0];
    if (def) return readBooleanVal(def);
  }
  return false;
}

function isFundingOptionRow(row) {
  const joined = row.join(' ');
  return FUNDING_OPTION_PATTERNS.some((opt) => opt.pattern.test(joined));
}

function extractUserTableText(rows) {
  const contentRows = rows.filter((row) => {
    const joined = normalizeLine(row.join(' '));
    if (!joined) return false;
    return !isTemplateText(joined);
  });

  if (contentRows.length === 0) return '';

  return contentRows
    .map((row) => row.map((cell) => cell.trim()).filter(Boolean).join(' ').trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function extractBlocks(body) {
  const blocks = [];
  for (let i = 0; i < body.childNodes.length; i += 1) {
    const node = body.childNodes[i];
    if (!node.tagName) continue;
    const localName = node.localName || node.tagName.split(':').pop();
    if (localName === 'p') {
      const text = paragraphText(node);
      blocks.push({ type: 'p', text, node });
    } else if (localName === 'tbl') {
      blocks.push({ type: 'tbl', rows: tableRows(node), node });
    }
  }
  return blocks;
}

function findParagraphIndex(blocks, pattern) {
  return blocks.findIndex((block) => block.type === 'p' && pattern.test(block.text));
}

function getTextAfterLabel(blocks, labelPattern) {
  const idx = findParagraphIndex(blocks, labelPattern);
  if (idx === -1) return '';

  for (let i = idx + 1; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (block.type === 'tbl') {
      return extractUserTableText(block.rows);
    }
    if (block.type === 'p' && block.text) {
      if (/^date:/i.test(block.text)) {
        const sdt = sdtTextInNode(block.node);
        const inline = block.text.replace(/^date:\s*/i, '').trim();
        const candidate = sdt || inline;
        if (candidate && !/click here/i.test(candidate)) return candidate;
        continue;
      }
      if (/^english:|^hebrew:|^name of invention:|^2[abc]\.|^4[ab]\.|^inventors/i.test(block.text)) {
        break;
      }
    }
  }
  return '';
}

function parseInventionDate(blocks) {
  const idx = findParagraphIndex(blocks, /4a\.\s*First date when invention was made/i);
  if (idx === -1) return '';

  for (let i = idx + 1; i < Math.min(idx + 6, blocks.length); i += 1) {
    const block = blocks[i];
    if (block.type !== 'p') continue;

    const sdt = sdtTextInNode(block.node);
    if (sdt && !/click here/i.test(sdt)) {
      return normalizeDateToDisplay(sdt);
    }

    if (/^date:/i.test(block.text)) {
      const inline = block.text.replace(/^date:\s*/i, '').trim();
      if (inline && !/click here/i.test(inline)) {
        return normalizeDateToDisplay(inline);
      }
    }
  }
  return '';
}

function parseInventors(blocks) {
  const tableBlock = blocks.find(
    (block) =>
      block.type === 'tbl'
      && block.rows.some((row) => row.some((cell) => /title,\s*name/i.test(cell)))
  );
  if (!tableBlock) return [];

  const headerIdx = tableBlock.rows.findIndex((row) =>
    row.some((cell) => /title,\s*name/i.test(cell))
  );
  if (headerIdx === -1) return [];

  return tableBlock.rows
    .slice(headerIdx + 1)
    .filter((row) => row.some((cell) => normalizeLine(cell)))
    .filter((row) => !row.some((cell) => /^inventor:/i.test(cell) || /^contributor:/i.test(cell)))
    .map((row) => ({
      title: '',
      name: row[0] || '',
      nationalId: row[1] || '',
      department: row[2] || '',
      partInInvention: row[3] || '',
      roleType: parseRoleType(row[4]),
    }))
    .filter((inv) => inv.name || inv.nationalId || inv.department || inv.partInInvention);
}

function parseFundingSupportType(tblNode) {
  const trs = tblNode.getElementsByTagNameNS(W_NS, 'tr');
  for (let i = 0; i < trs.length; i += 1) {
    const tcs = Array.from(trs[i].getElementsByTagNameNS(W_NS, 'tc'));
    const rowText = tcs.map(cellText).join(' ');
    for (const opt of FUNDING_OPTION_PATTERNS) {
      if (!opt.pattern.test(rowText)) continue;
      for (const tc of tcs) {
        if (isCellCheckboxChecked(tc)) return opt.value;
      }
    }
  }
  return '';
}

function parseFundingSources(rows) {
  const headerIdx = rows.findIndex((row) => row.some((cell) => /source of support/i.test(cell)));
  if (headerIdx === -1) return [];

  return rows
    .slice(headerIdx + 1)
    .filter((row) => row.some((cell) => normalizeLine(cell)))
    .filter((row) => !isFundingOptionRow(row))
    .map((row) => ({
      source: row[0] || '',
      supportPeriod: row[1] || '',
      grantNumber: row[2] || '',
      subjectComments: row[3] || '',
    }))
    .filter((row) => row.source || row.grantNumber || row.supportPeriod || row.subjectComments);
}

// A hand-typed tick mark used to select an option (the form uses a literal "V").
function isMarkText(text) {
  return /^[vx✓✔√]$/i.test(normalizeLine(text));
}

// An option is selected if its label cell holds a checked checkbox, or the
// adjacent cell contains a tick mark (the layout is: "Yes" | [mark] | "No" | [mark]).
function isOptionAnswered(tcs, labelIdx) {
  for (const idx of [labelIdx, labelIdx + 1]) {
    const tc = tcs[idx];
    if (!tc) continue;
    if (isCellCheckboxChecked(tc)) return true;
    if (isMarkText(cellText(tc))) return true;
  }
  return false;
}

function parseYesNoFromTable(tblNode) {
  const trs = tblNode.getElementsByTagNameNS(W_NS, 'tr');
  for (let i = 0; i < trs.length; i += 1) {
    const tcs = Array.from(trs[i].getElementsByTagNameNS(W_NS, 'tc'));
    const texts = tcs.map(cellText);
    const yesIdx = texts.findIndex((text) => /^yes$/i.test(text));
    const noIdx = texts.findIndex((text) => /^no$/i.test(text));
    if (yesIdx === -1 || noIdx === -1) continue;

    const yesMarked = isOptionAnswered(tcs, yesIdx);
    const noMarked = isOptionAnswered(tcs, noIdx);
    if (yesMarked && !noMarked) return 'yes';
    if (noMarked && !yesMarked) return 'no';
    if (yesMarked && noMarked) return 'yes';
    return '';
  }
  return '';
}

function parseBinaryChoiceTable(tblNode, nonePattern, yesPattern) {
  const trs = tblNode.getElementsByTagNameNS(W_NS, 'tr');
  let noneChecked = false;
  let yesChecked = false;

  for (let i = 0; i < trs.length; i += 1) {
    const tcs = Array.from(trs[i].getElementsByTagNameNS(W_NS, 'tc'));
    const rowText = tcs.map(cellText).join(' ');
    if (nonePattern.test(rowText)) {
      noneChecked = tcs.some((tc) => isCellCheckboxChecked(tc));
    }
    if (yesPattern.test(rowText)) {
      yesChecked = tcs.some((tc) => isCellCheckboxChecked(tc));
    }
  }

  if (yesChecked) return 'yes';
  if (noneChecked) return 'no';
  return '';
}

// The materials instruction sentence is embedded in the "Yes, Materials..."
// label cell; the user's actual answer goes in a following row. Filter the
// instruction out so it is never mistaken for the answer.
function isMaterialsInstruction(text) {
  return (
    /please specify whether they are classified/i.test(text)
    || /protected by a patent or a trade mark/i.test(text)
    || /property of others or obtained from colleagues/i.test(text)
    || /commercial entity\)/i.test(text)
  );
}

function parseNonJceMaterials(tblNode) {
  const choice = parseBinaryChoiceTable(tblNode, /none used/i, /yes,\s*materials or processes used/i);
  if (choice === 'yes') {
    const rows = tableRows(tblNode);
    const yesRowIdx = rows.findIndex((row) =>
      row.some((cell) => /yes,\s*materials or processes used/i.test(cell))
    );
    let details = '';
    if (yesRowIdx !== -1) {
      for (let i = yesRowIdx + 1; i < rows.length; i += 1) {
        const text = rows[i].map((c) => c.trim()).filter(Boolean).join(' ').trim();
        if (!text || isMaterialsInstruction(text) || /none used/i.test(text)) continue;
        details = text;
        break;
      }
      if (!details) {
        const cell = rows[yesRowIdx].find((c) => /yes,\s*materials or processes used/i.test(c));
        if (cell) {
          const stripped = cell.replace(/yes,\s*materials or processes used:\s*/i, '').trim();
          if (stripped && !isMaterialsInstruction(stripped)) details = stripped;
        }
      }
    }
    return { used: 'yes', details };
  }
  if (choice === 'no') return { used: 'no', details: '' };
  return { used: '', details: '' };
}

function findTableAfterLabel(blocks, labelPattern) {
  const idx = findParagraphIndex(blocks, labelPattern);
  if (idx === -1) return null;
  for (let i = idx + 1; i < blocks.length; i += 1) {
    if (blocks[i].type === 'tbl') return blocks[i];
  }
  return null;
}

function parsePriorArtPatents(blocks) {
  const sectionTable = findTableAfterLabel(blocks, /^patents:\s*$/i);
  if (!sectionTable) return [];

  const choice = parseBinaryChoiceTable(sectionTable.node, /none known/i, /yes,\s*prior references/i);
  if (choice !== 'yes') return [];

  const dataTable = blocks.find(
    (block) =>
      block.type === 'tbl'
      && block !== sectionTable
      && block.rows.some((row) => row.some((cell) => /^country$/i.test(normalizeLine(cell))))
      && block.rows.some((row) => row.some((cell) => /patent/i.test(cell) && /publication number/i.test(cell)))
  );
  if (!dataTable) return [];

  const headerIdx = dataTable.rows.findIndex((row) =>
    row.some((cell) => /^country$/i.test(normalizeLine(cell)))
  );
  if (headerIdx === -1) return [];

  return dataTable.rows
    .slice(headerIdx + 1)
    .filter((row) => row.some((cell) => normalizeLine(cell)))
    .map((row) => ({
      country: row[0] || '',
      publicationNumber: row[1] || '',
      title: row[2] || '',
      filingPublicationDate: row[3] || '',
      relevance: row[4] || '',
    }))
    .filter((row) => row.country || row.publicationNumber || row.title);
}

function parsePriorArtPublications(blocks) {
  const sectionTable = findTableAfterLabel(blocks, /^other publications:\s*$/i);
  if (!sectionTable) return [];

  const choice = parseBinaryChoiceTable(sectionTable.node, /none known/i, /yes,\s*prior references/i);
  if (choice !== 'yes') return [];

  const headerIdx = sectionTable.rows.findIndex((row) =>
    row.some((cell) => /^title$/i.test(normalizeLine(cell)) && row.some((c) => /authors/i.test(c)))
  );

  const dataTable =
    headerIdx >= 0
      ? sectionTable
      : blocks.find(
          (block) =>
            block.type === 'tbl'
            && block.rows.some((row) =>
              row.some((cell) => /^title$/i.test(normalizeLine(cell)))
              && row.some((cell) => /authors/i.test(cell))
            )
        );

  if (!dataTable) return [];

  const startIdx =
    headerIdx >= 0
      ? headerIdx
      : dataTable.rows.findIndex((row) =>
          row.some((cell) => /^title$/i.test(normalizeLine(cell)))
          && row.some((cell) => /authors/i.test(cell))
        );
  if (startIdx === -1) return [];

  return dataTable.rows
    .slice(startIdx + 1)
    .filter((row) => row.some((cell) => normalizeLine(cell)))
    .map((row) => ({
      title: row[0] || '',
      authors: row[1] || '',
      placeOfPublication: row[2] || '',
      publicationDate: row[3] || '',
      publishedByInventor: /^yes$/i.test(normalizeLine(row[4]))
        ? 'yes'
        : /^no$/i.test(normalizeLine(row[4]))
          ? 'no'
          : row[4] || '',
    }))
    .filter((row) => row.title || row.authors);
}

function isDisclosureForm(blocks) {
  return blocks.some(
    (block) =>
      block.text && /disclosure of invention form/i.test(block.text)
  ) || blocks.some(
    (block) =>
      block.type === 'tbl'
      && block.rows.some((row) => row.some((cell) => /disclosure of invention form/i.test(cell)))
  );
}

/**
 * Parse a fixed-format patent disclosure (DOI) .docx in the browser.
 * @param {ArrayBuffer} arrayBuffer
 */
export async function parsePatentDisclosureDocx(arrayBuffer) {
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

  const blocks = extractBlocks(body);
  if (!isDisclosureForm(blocks)) {
    throw new Error(
      'הקובץ אינו תואם לטופס גילוי המצאה (DOI). הורידו את התבנית מהקישור "הורדת פורמט קבוע" ומלאו אותה.'
    );
  }

  const parsed = createEmptyPatentDisclosureParsed();

  parsed.inventionTitleEnglish = getTextAfterLabel(blocks, /^english:\s*$/i);
  parsed.inventionTitleHebrew = getTextAfterLabel(blocks, /^hebrew:\s*$/i);
  parsed.shortDescription = getTextAfterLabel(blocks, /short description of the invention/i);
  parsed.inventionTypeElaboration = getTextAfterLabel(blocks, /^2a\./i);
  parsed.potentialCustomers = getTextAfterLabel(blocks, /^2b\./i);
  parsed.commercialEntityContacts = getTextAfterLabel(blocks, /^2c\./i);
  parsed.inventionFirstDate = parseInventionDate(blocks);
  parsed.inventionTimeFrame = getTextAfterLabel(blocks, /if an accurate date is not available/i);
  parsed.inventionWorkType = getTextAfterLabel(blocks, /^4b\./i);
  parsed.priorPatentDetails = getTextAfterLabel(
    blocks,
    /if yes, please specify \(number, title, inventors, date and country of filing\)/i
  );

  parsed.inventors = parseInventors(blocks);

  const fundingTable = findTableAfterLabel(blocks, /funding, support & materials/i);
  if (fundingTable) {
    parsed.fundingSupportType = parseFundingSupportType(fundingTable.node);
    parsed.fundingSources = parseFundingSources(fundingTable.rows);
  }

  // If the selected funding option couldn't be detected (e.g. the checkbox
  // state didn't survive the file) but the funding-sources table has data,
  // infer a grant so the dependent detail fields become visible in the form.
  if (!parsed.fundingSupportType && parsed.fundingSources.length > 0) {
    parsed.fundingSupportType = 'grant';
  }

  const materialsTable = findTableAfterLabel(
    blocks,
    /please list any materials or processes used during the work on the invention/i
  );
  if (materialsTable) {
    const materials = parseNonJceMaterials(materialsTable.node);
    parsed.nonJceMaterialsUsed = materials.used;
    parsed.nonJceMaterialsDetails = materials.details;
    if (materials.used === 'yes' && !materials.details) {
      const extra = extractUserTableText(materialsTable.rows);
      if (extra && !/none used/i.test(extra)) {
        parsed.nonJceMaterialsDetails = extra;
      }
    }
  }

  const publicationTable = findTableAfterLabel(
    blocks,
    /has the invention or part of it been published/i
  );
  if (publicationTable) {
    parsed.hasBeenPublished = parseYesNoFromTable(publicationTable.node);
  }

  // The "If Yes" and "If No" prompts share a single text box, so route its
  // content to the field that matches the selected answer.
  const sharedPublicationText = getTextAfterLabel(
    blocks,
    /if yes, specify including all available details/i
  );
  if (parsed.hasBeenPublished === 'no') {
    parsed.futurePublicationPlans = sharedPublicationText;
  } else if (parsed.hasBeenPublished === 'yes') {
    parsed.publicationDetails = sharedPublicationText;
  } else {
    parsed.publicationDetails = sharedPublicationText;
  }

  const priorPatentTable = findTableAfterLabel(
    blocks,
    /has a patent application been filed for the invention/i
  );
  if (priorPatentTable) {
    parsed.priorPatentFiled = parseYesNoFromTable(priorPatentTable.node);
  }

  const literatureTable = findTableAfterLabel(
    blocks,
    /did you perform an extended literature survey/i
  );
  if (literatureTable) {
    parsed.literatureSurveyPerformed = parseYesNoFromTable(literatureTable.node);
  }

  const literatureNotesIdx = findParagraphIndex(
    blocks,
    /if yes, list all known relevant prior art references/i
  );
  if (literatureNotesIdx !== -1) {
    for (let i = literatureNotesIdx + 1; i < blocks.length; i += 1) {
      if (blocks[i].type === 'p' && /^patents:/i.test(blocks[i].text)) break;
      if (blocks[i].type === 'tbl') {
        const text = extractUserTableText(blocks[i].rows);
        if (text) parsed.literatureSurveyNotes = text;
        break;
      }
    }
  }

  parsed.priorArtPatents = parsePriorArtPatents(blocks);
  parsed.priorArtPublications = parsePriorArtPublications(blocks);

  validateParsed(parsed);
  return parsed;
}
