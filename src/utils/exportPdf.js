export const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/** Light blue label band — matches the reference Word template (fill B8CCE4). */
export const FORM_LABEL_BG = '#B8CCE4';

const buildPrintStyles = () => `
  @page {
    size: A4;
    margin: 12mm 14mm;
  }
  * {
    box-sizing: border-box;
  }
  html,
  body {
    width: 100%;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: Arial, Helvetica, 'Segoe UI', sans-serif;
    font-size: 11pt;
    color: #000;
    line-height: 1.35;
    background: #fff;
  }
  .document {
    width: 100%;
    max-width: none;
    margin: 0;
    padding: 0;
  }

  /* Document header (תכנית מחקר - הצעה מלאה / RESEARCH PROPOSAL) */
  .doc-header {
    text-align: center;
    margin-bottom: 18pt;
  }
  .doc-title-he,
  .doc-title-en {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14pt;
    font-weight: 700;
    margin: 0;
    line-height: 1.3;
    color: #000;
  }
  .doc-title-en {
    margin-top: 4pt;
    margin-bottom: 14pt;
  }
  .doc-meta-line {
    text-align: start;
    margin: 8pt 0;
    font-size: 11pt;
    line-height: 1.4;
  }
  .doc-meta-label {
    font-weight: 700;
  }
  .doc-meta-value {
    font-weight: 400;
    border-bottom: 1pt solid #000;
    padding-bottom: 1pt;
    min-width: 120pt;
    display: inline;
  }

  /* Section titles (Subtitle style in template) */
  .document > h1 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14pt;
    font-weight: 700;
    text-align: center;
    margin: 0 0 16pt;
    padding: 0;
    border: none;
    color: #000;
  }
  h2,
  .section-heading {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12pt;
    font-weight: 700;
    margin: 16pt 0 8pt;
    padding: 0;
    color: #000;
    border: none;
    background: transparent;
  }
  .section {
    margin-bottom: 12pt;
  }

  /* Label + value blocks (template table rows) */
  .form-field-block {
    margin: 0 0 0;
  }
  .form-field-label,
  .k {
    background: ${FORM_LABEL_BG};
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    font-weight: 400;
    padding: 5pt 8pt;
    border: 1pt solid #7f7f7f;
    border-bottom: none;
    color: #000;
    margin: 0;
    display: block;
    width: 100%;
  }
  .form-field-value,
  .v {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    font-weight: 400;
    padding: 8pt;
    min-height: 22pt;
    border: 1pt solid #7f7f7f;
    background: #fff;
    color: #000;
    white-space: pre-wrap;
    word-break: break-word;
    display: block;
    width: 100%;
    margin: 0 0 0;
  }
  .form-field-block + .form-field-block .form-field-label,
  .kv + .kv .k {
    border-top: none;
  }

  /* Compact two-column metadata table */
  .meta-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 10pt;
    font-size: 11pt;
  }
  .meta-table td {
    border: 1pt solid #7f7f7f;
    padding: 5pt 8pt;
    vertical-align: top;
  }
  .meta-table .meta-label {
    background: ${FORM_LABEL_BG};
    width: 34%;
    font-weight: 700;
  }
  .meta-table .meta-value {
    background: #fff;
    width: 66%;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .grid {
    display: block;
  }
  .kv {
    display: block;
    margin: 0;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0;
  }

  /* Data tables (budget, work plan, partners grid) */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0 12pt;
    font-size: 11pt;
  }
  th,
  td {
    border: 1pt solid #7f7f7f;
    padding: 5pt 8pt;
    text-align: start;
    vertical-align: top;
  }
  th {
    background: ${FORM_LABEL_BG};
    color: #000;
    font-weight: 700;
  }
  tr:nth-child(even) td {
    background: #fafafa;
  }

  .partner-block {
    margin-bottom: 10pt;
  }
  .partner-block-title {
    font-weight: 700;
    font-size: 11pt;
    margin: 8pt 0 4pt;
    padding: 4pt 8pt;
    background: #dce6f1;
    border: 1pt solid #7f7f7f;
  }

  .muted,
  .doc-footer {
    color: #404040;
    font-size: 10pt;
    margin-top: 20pt;
    padding-top: 8pt;
    border-top: 1pt solid #bbb;
    text-align: center;
  }
  .mono {
    font-family: ui-monospace, 'Courier New', monospace;
    font-size: 10pt;
  }

  @media print {
    html,
    body {
      height: auto !important;
      overflow: visible !important;
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .document {
      display: block;
      width: 100%;
    }
    /* Allow long tables/sections to split across pages (avoid duplicates from avoid-on-huge-blocks). */
    .meta-table tr,
    .form-field-block,
    table tr {
      page-break-inside: avoid;
    }
    .section {
      page-break-inside: auto;
    }
  }
`;

/** Bilingual header matching the reference research-proposal form. */
export const buildResearchProposalHeader = ({
  titleHe = 'תכנית מחקר - הצעה מלאה',
  titleEn = 'RESEARCH PROPOSAL',
  metaLines = [],
}) => {
  const metaHtml = metaLines
    .map(
      ({ label, value }) => `
    <p class="doc-meta-line">
      <span class="doc-meta-label">${escapeHtml(label)}:</span>
      <span class="doc-meta-value">${escapeHtml(value || '')}</span>
    </p>`
    )
    .join('');

  return `
    <header class="doc-header">
      <p class="doc-title-he">${escapeHtml(titleHe)}</p>
      <p class="doc-title-en">${escapeHtml(titleEn)}</p>
      ${metaHtml}
    </header>
  `;
};

/** Single field: blue label band + content area (template row pair). */
export const buildFormFieldBlock = (label, value) => `
  <div class="form-field-block">
    <div class="form-field-label">${escapeHtml(label)}</div>
    <div class="form-field-value">${value ? escapeHtml(value) : '&nbsp;'}</div>
  </div>
`;

/** Section title (Arial bold, like Subtitle in template). */
export const buildSectionHeading = (title) =>
  `<h2 class="section-heading">${escapeHtml(title)}</h2>`;

/** Compact label | value rows for short metadata fields. */
export const buildMetaTableRows = (rows) =>
  rows
    .map(
      ([label, value]) => `
    <tr>
      <td class="meta-label">${escapeHtml(label)}</td>
      <td class="meta-value">${escapeHtml(value ?? '')}</td>
    </tr>`
    )
    .join('');

export const buildMetaTable = (rows) => `
  <table class="meta-table">
    <tbody>
      ${buildMetaTableRows(rows)}
    </tbody>
  </table>
`;

export const buildMetaSection = (sectionTitle, rows) => `
  <div class="section">
    ${sectionTitle ? buildSectionHeading(sectionTitle) : ''}
    ${buildMetaTable(rows)}
  </div>
`;

export const buildFormFieldsSection = (sectionTitle, fields) => `
  <div class="section">
    ${buildSectionHeading(sectionTitle)}
    ${fields.map(([label, value]) => buildFormFieldBlock(label, value)).join('')}
  </div>
`;

export const buildDocFooter = (text) => `<div class="doc-footer muted">${escapeHtml(text)}</div>`;

export const buildPrintableDocumentHtml = ({ title, htmlBody, dir = 'rtl', lang = 'he' }) => {
  const safeTitle = escapeHtml(title || '');
  const safeLang = escapeHtml(lang || 'he');
  const safeDir = escapeHtml(dir || 'rtl');

  return `<!doctype html>
<html lang="${safeLang}" dir="${safeDir}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${safeTitle}</title>
    <style>${buildPrintStyles()}</style>
  </head>
  <body>
    <div class="document">
      ${htmlBody || ''}
    </div>
  </body>
</html>`;
};

/**
 * Loads HTML in a hidden iframe and opens the browser print dialog immediately.
 * No extra tab — only the system print preview (Save as PDF) is shown.
 */
const openHtmlForPrint = (fullHtml) => {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'print');
  iframe.style.cssText =
    'position:fixed;width:0;height:0;border:0;opacity:0;visibility:hidden;pointer-events:none;left:-9999px;top:0';

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  iframe.onload = () => {
    const printWindow = iframe.contentWindow;
    if (!printWindow) {
      cleanup();
      return;
    }

    const onAfterPrint = () => {
      printWindow.removeEventListener('afterprint', onAfterPrint);
      cleanup();
    };
    printWindow.addEventListener('afterprint', onAfterPrint);

    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        cleanup();
      }
    }, 300);
  };

  document.body.appendChild(iframe);
  iframe.srcdoc = fullHtml;

  setTimeout(cleanup, 120_000);
};

export const exportPrintableHtmlToPdf = (options) => {
  openHtmlForPrint(buildPrintableDocumentHtml(options));
};

/** For pages that build a complete HTML document string (e.g. NewResearch). */
export const exportFullHtmlDocumentToPdf = (fullHtml) => {
  openHtmlForPrint(fullHtml);
};

/** Shared print CSS for pages that embed styles inline (e.g. NewResearch). */
export const getResearchFormPrintStyles = buildPrintStyles;
