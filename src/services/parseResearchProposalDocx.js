import { parseResearchProposalDocx } from '../utils/parseResearchProposalDocx';
import { parseResearchProposalPdf } from '../utils/parseResearchProposalPdf';

/**
 * Parse a fixed-format research proposal file (.docx or .pdf) locally in the browser.
 * @param {File} file
 * @returns {Promise<{ parsed: Record<string, unknown> }>}
 */
export async function parseResearchProposalFile(file) {
  const name = (file.name || '').toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  if (name.endsWith('.docx')) {
    return { parsed: await parseResearchProposalDocx(arrayBuffer) };
  }

  if (name.endsWith('.pdf')) {
    return { parsed: await parseResearchProposalPdf(arrayBuffer) };
  }

  throw new Error('יש להעלות קובץ Word (.docx) או PDF (.pdf) בלבד');
}

/** @deprecated Use parseResearchProposalFile */
export async function parseResearchProposalDocxFile(file) {
  return parseResearchProposalFile(file);
}
