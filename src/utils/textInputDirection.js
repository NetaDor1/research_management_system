/** Pick RTL when Hebrew dominates; otherwise LTR. Empty fields use defaultDir. */
export function textInputDir(value, defaultDir = 'ltr') {
  const text = String(value ?? '');
  if (!text.trim()) return defaultDir;

  let hebrew = 0;
  let latin = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code >= 0x0590 && code <= 0x05ff) hebrew += 1;
    else if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) latin += 1;
  }

  if (hebrew > 0 && hebrew >= latin) return 'rtl';
  return 'ltr';
}

export function textInputAlign(dir) {
  return dir === 'rtl' ? 'right' : 'left';
}
