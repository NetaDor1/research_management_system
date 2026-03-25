export const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const buildPrintStyles = () => `
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #212529;
    line-height: 1.6;
    padding: 24px;
  }
  h1 {
    font-size: 24px;
    margin: 0 0 12px 0;
    color: #2d3748;
    border-bottom: 2px solid #667eea;
    padding-bottom: 12px;
  }
  h2 {
    font-size: 16px;
    margin: 24px 0 10px 0;
    color: #667eea;
    border-bottom: 1px solid #e9ecef;
    padding-bottom: 6px;
  }
  .section {
    margin-bottom: 18px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 12px;
  }
  .kv {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    padding: 10px 12px;
  }
  .k {
    font-weight: 700;
    color: #495057;
    margin-bottom: 4px;
  }
  .v {
    word-break: break-word;
    white-space: pre-wrap;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }
  th, td {
    border: 1px solid #dee2e6;
    padding: 8px;
    text-align: left;
    vertical-align: top;
  }
  html[dir="rtl"] th,
  html[dir="rtl"] td {
    text-align: right;
  }
  th {
    background: #667eea;
    color: white;
  }
  .muted {
    color: #6c757d;
  }
  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }
  @media print {
    body { padding: 10mm; }
  }
`;

export const exportPrintableHtmlToPdf = ({ title, htmlBody, dir = 'rtl', lang = 'he' }) => {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    // Popup blocked: fallback to printing from a hidden iframe.
    // This avoids popup blockers and still produces a text-based PDF via the browser print dialog.
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const safeTitle = escapeHtml(title || '');
    const safeLang = escapeHtml(lang || 'he');
    const safeDir = escapeHtml(dir || 'rtl');

    iframe.srcdoc = `
      <!doctype html>
      <html lang="${safeLang}" dir="${safeDir}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${safeTitle}</title>
          <style>${buildPrintStyles()}</style>
        </head>
        <body>
          ${htmlBody || ''}
        </body>
      </html>
    `;

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }
    }, 250);

    return;
  }

  const safeTitle = escapeHtml(title || '');
  const safeLang = escapeHtml(lang || 'he');
  const safeDir = escapeHtml(dir || 'rtl');

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html lang="${safeLang}" dir="${safeDir}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${safeTitle}</title>
        <style>${buildPrintStyles()}</style>
      </head>
      <body>
        ${htmlBody || ''}
      </body>
    </html>
  `);
  printWindow.document.close();

  // Let the browser paint layout before opening print dialog.
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
};

