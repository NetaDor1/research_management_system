/**
 * Tokenize text into words while preserving punctuation attached to tokens.
 */
export function tokenizeWords(text) {
  if (!text || typeof text !== 'string') return [];
  return text.trim().split(/\s+/).filter(Boolean);
}

/**
 * Word-level diff for side-by-side display.
 * Returns segments for original and revised text with type 'equal' | 'changed'.
 */
export function diffWords(originalText, revisedText) {
  const oldWords = tokenizeWords(originalText);
  const newWords = tokenizeWords(revisedText);

  if (oldWords.length === 0 && newWords.length === 0) {
    return { oldSegments: [], newSegments: [], hasChanges: false };
  }

  if (oldWords.length === 0) {
    return {
      oldSegments: [],
      newSegments: newWords.map((text) => ({ type: 'changed', text })),
      hasChanges: newWords.length > 0,
    };
  }

  if (newWords.length === 0) {
    return {
      oldSegments: oldWords.map((text) => ({ type: 'changed', text })),
      newSegments: [],
      hasChanges: oldWords.length > 0,
    };
  }

  const m = oldWords.length;
  const n = newWords.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const oldRev = [];
  const newRev = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      oldRev.push({ type: 'equal', text: oldWords[i - 1] });
      newRev.push({ type: 'equal', text: newWords[j - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newRev.push({ type: 'changed', text: newWords[j - 1] });
      j -= 1;
    } else {
      oldRev.push({ type: 'changed', text: oldWords[i - 1] });
      i -= 1;
    }
  }

  oldRev.reverse();
  newRev.reverse();

  const hasChanges =
    oldRev.some((s) => s.type === 'changed') || newRev.some((s) => s.type === 'changed');

  return { oldSegments: oldRev, newSegments: newRev, hasChanges };
}
