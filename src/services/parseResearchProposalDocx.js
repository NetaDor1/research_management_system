import { parseResearchProposalDocx } from '../utils/parseResearchProposalDocx';

/**
 * Parse a fixed-format research proposal .docx locally in the browser.
 * @param {File} file
 * @returns {Promise<{ parsed: Record<string, unknown> }>}
 */
export async function parseResearchProposalDocxFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const parsed = await parseResearchProposalDocx(arrayBuffer);
  return { parsed };
}
