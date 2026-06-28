import { parsePatentDisclosureDocx } from '../utils/parsePatentDisclosureDocx';
import { parsePatentDisclosurePdf } from '../utils/parsePatentDisclosurePdf';

/**
 * Parse a fixed-format patent disclosure (DOI) file (.docx or .pdf) locally in the browser.
 * @param {File} file
 * @returns {Promise<{ parsed: Record<string, unknown> }>}
 */
export async function parsePatentDisclosureFile(file) {
  const name = (file.name || '').toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  if (name.endsWith('.docx')) {
    return { parsed: await parsePatentDisclosureDocx(arrayBuffer) };
  }

  if (name.endsWith('.pdf')) {
    return { parsed: await parsePatentDisclosurePdf(arrayBuffer) };
  }

  throw new Error('יש להעלות קובץ Word (.docx) או PDF (.pdf) בלבד');
}
