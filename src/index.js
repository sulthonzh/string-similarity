// string-similarity — Zero-dep string similarity algorithms
// Levenshtein, Jaro-Winkler, Sørensen-Dice, Hamming, n-gram, Soundex, Metaphone

// ─── Levenshtein ─────────────────────────────────────────────────────
// Classic edit distance: minimum single-char edits (insert/delete/substitute)
// to transform a → b. O(m×n) DP with single-row memory optimisation.

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  // Ensure b is the shorter → less memory
  if (a.length < b.length) [a, b] = [b, a];

  const bl = b.length;
  let prev = new Array(bl + 1);
  let curr = new Array(bl + 1);

  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}

export function levenshteinRatio(a, b) {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ─── Damerau-Levenshtein ────────────────────────────────────────────
// Like Levenshtein but also allows adjacent transpositions (OSA variant).

export function damerauLevenshtein(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const al = a.length, bl = b.length;
  const d = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));

  for (let i = 0; i <= al; i++) d[i][0] = i;
  for (let j = 0; j <= bl; j++) d[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,       // deletion
        d[i][j - 1] + 1,       // insertion
        d[i - 1][j - 1] + cost // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return d[al][bl];
}

// ─── Hamming Distance ────────────────────────────────────────────────
// Only works on equal-length strings. Counts positions that differ.

export function hamming(a, b) {
  if (a.length !== b.length) {
    throw new Error(`Hamming distance requires equal-length strings (got ${a.length} and ${b.length})`);
  }
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}

// ─── Jaro Similarity ─────────────────────────────────────────────────
// Jaro similarity for short strings (names, typos).
// Matching window = floor(maxLen / 2) - 1. Returns 0–1.

export function jaro(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const al = a.length, bl = b.length;
  const matchWindow = Math.max(0, Math.floor(Math.max(al, bl) / 2) - 1);

  const aMatches = new Array(al).fill(false);
  const bMatches = new Array(bl).fill(false);
  let matches = 0;

  for (let i = 0; i < al; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, bl);
    for (let j = start; j < end; j++) {
      if (bMatches[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0, transpositions = 0;
  for (let i = 0; i < al; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions = Math.floor(transpositions / 2);

  return (
    (matches / al + matches / bl + (matches - transpositions) / matches) / 3
  );
}

// ─── Jaro-Winkler ───────────────────────────────────────────────────
// Jaro + prefix bonus (up to 4 chars). Good for name matching.

export function jaroWinkler(a, b, opts = {}) {
  const prefixWeight = opts.prefixWeight ?? 0.1;
  const maxPrefix = opts.maxPrefix ?? 4;
  const boostThreshold = opts.boostThreshold ?? 0.7;

  const j = jaro(a, b);
  if (j < boostThreshold) return j;

  let prefixLen = 0;
  const limit = Math.min(maxPrefix, a.length, b.length);
  for (let i = 0; i < limit; i++) {
    if (a[i] === b[i]) prefixLen++;
    else break;
  }

  return j + prefixLen * prefixWeight * (1 - j);
}

// ─── Sørensen-Dice Coefficient ───────────────────────────────────────
// Bigram-based similarity. Good for word-level fuzzy matching.

export function bigrams(str) {
  const s = str.toLowerCase().trim();
  if (s.length < 2) return new Set([s]);
  const set = new Set();
  for (let i = 0; i < s.length - 1; i++) {
    set.add(s.slice(i, i + 2));
  }
  return set;
}

export function sorensenDice(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const bgA = bigrams(a);
  const bgB = bigrams(b);
  if (bgA.size === 0 && bgB.size === 0) return 1;

  let intersection = 0;
  for (const bg of bgA) {
    if (bgB.has(bg)) intersection++;
  }

  return (2 * intersection) / (bgA.size + bgB.size);
}

// ─── N-Gram Similarity ───────────────────────────────────────────────
// Generalised n-gram Jaccard similarity.

export function ngrams(str, n = 2) {
  const s = str.toLowerCase().trim();
  if (s.length < n) return new Set([s]);
  const set = new Set();
  for (let i = 0; i <= s.length - n; i++) {
    set.add(s.slice(i, i + n));
  }
  return set;
}

export function ngramSimilarity(a, b, n = 2) {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const ngA = ngrams(a, n);
  const ngB = ngrams(b, n);
  if (ngA.size === 0 && ngB.size === 0) return 1;

  let intersection = 0;
  for (const ng of ngA) {
    if (ngB.has(ng)) intersection++;
  }

  return intersection / (ngA.size + ngB.size - intersection); // Jaccard
}

// ─── Soundex ─────────────────────────────────────────────────────────
// Classic 4-char Soundex phonetic code.

export function soundex(str) {
  const s = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (!s) return '0000';

  const codes = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  };

  let result = s[0]; // Keep first letter
  let prevCode = codes[s[0]] || '';

  for (let i = 1; i < s.length && result.length < 4; i++) {
    const code = codes[s[i]] || '';
    if (code && code !== prevCode) {
      result += code;
    }
    if (codes[s[i]]) {
      prevCode = code; // Only update for coded letters
    } else if (s[i] === 'H' || s[i] === 'W') {
      // H and W are transparent: don't update or reset prevCode
      // (two same-coded consonants separated only by H/W count as one)
    } else {
      // Vowels (A,E,I,O,U,Y) act as separators — reset prevCode
      prevCode = '';
    }
  }

  return result.padEnd(4, '0');
}

// ─── Metaphone (simplified) ──────────────────────────────────────────
// Simplified Metaphone phonetic algorithm.

export function metaphone(str) {
  let s = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (!s) return '';

  const rules = [
    [/^KN/, 'N'], [/^GN/, 'N'], [/^PN/, 'N'], [/^AE/, 'E'], [/^WR/, 'R'],
    [/X$/, 'KS'],
    [/^X/, 'S'],
    [/CIA/, 'XIA'],
    [/CH/, 'X'],
    [/C(?=[IE])/, 'S'],
    [/(?<=S)C(?=[IE])/, ''], // drop
    [/CK/, 'K'],
    [/C(?![IE])/, 'K'],
    [/DG(?=[IEY])/, 'J'],
    [/D(?=[IEY])/, 'J'],
    [/D/, 'T'],
    [/GH$/, ''],
    [/GH/, ''],
    [/GN$/, 'N'],
    [/G(?=.)/, 'K'],
    [/PH/, 'F'],
    [/Q/, 'K'],
    [/SCH/, 'SK'],
    [/SH/, 'X'],
    [/T(?=[IA])/, 'X'],
    [/TH/, '0'],
    [/T/, 'T'],
    [/V/, 'F'],
    [/WH$/, 'W'],
    [/W(?=.)/, 'W'],
    [/Y(?=[AEIOU])/, 'Y'],
    [/Y/, ''],
    [/Z/, 'S'],
  ];

  // Apply lookbehind-safe transforms manually
  let result = s;

  // Handle the S-C-I/E rule: drop C if preceded by S and followed by I/E
  result = result.replace(/SCI/g, 'SI').replace(/SCE/g, 'SE');

  for (const [pattern, replacement] of rules) {
    // Skip the lookbehind rule since we handled it above
    if (pattern.source.includes('(?<=')) continue;
    result = result.replace(pattern, replacement);
  }

  // Remove duplicates
  result = result.replace(/(.)\1+/g, '$1');

  // Drop silent vowels after first char (keep if first char)
  const first = result[0] || '';
  const rest = result.slice(1).replace(/[AEIOU]/g, '');
  result = first + rest;

  return result;
}

// ─── Cosine Similarity (character-level) ─────────────────────────────

export function cosineSimilarity(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const vecA = charFrequency(a.toLowerCase());
  const vecB = charFrequency(b.toLowerCase());

  let dot = 0;
  for (const ch in vecA) {
    if (ch in vecB) dot += vecA[ch] * vecB[ch];
  }

  const magA = Math.sqrt(Object.values(vecA).reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(Object.values(vecB).reduce((s, v) => s + v * v, 0));

  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

function charFrequency(str) {
  const freq = {};
  for (const ch of str) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  return freq;
}

// ─── Unified compare ─────────────────────────────────────────────────

export function compare(a, b, algorithm = 'levenshtein') {
  switch (algorithm) {
    case 'levenshtein':
    case 'lev':
      return { distance: levenshtein(a, b), similarity: levenshteinRatio(a, b) };
    case 'damerau':
    case 'osa':
      return { distance: damerauLevenshtein(a, b), similarity: 1 - damerauLevenshtein(a, b) / Math.max(a.length, b.length, 1) };
    case 'jaro':
      return { similarity: jaro(a, b) };
    case 'jaro-winkler':
    case 'jw':
      return { similarity: jaroWinkler(a, b) };
    case 'sorensen':
    case 'dice':
      return { similarity: sorensenDice(a, b) };
    case 'ngram':
      return { similarity: ngramSimilarity(a, b, 2) };
    case 'cosine':
      return { similarity: cosineSimilarity(a, b) };
    case 'hamming':
      return { distance: hamming(a, b) };
    default:
      throw new Error(`Unknown algorithm: ${algorithm}`);
  }
}

// ─── findClosest / bestMatch ─────────────────────────────────────────

export function findClosest(target, candidates, algorithm = 'jaro-winkler') {
  let bestIdx = -1;
  let bestScore = -1;

  for (let i = 0; i < candidates.length; i++) {
    let score;
    if (algorithm === 'levenshtein' || algorithm === 'lev') {
      score = levenshteinRatio(target, candidates[i]);
    } else if (algorithm === 'hamming') {
      try { score = 1 - hamming(target, candidates[i]) / Math.max(target.length, candidates[i].length, 1); }
      catch { score = 0; }
    } else {
      const result = compare(target, candidates[i], algorithm);
      score = result.similarity ?? (1 - (result.distance ?? 0) / Math.max(target.length, candidates[i].length, 1));
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return { match: candidates[bestIdx], index: bestIdx, score: bestScore };
}

export function rankMatches(target, candidates, algorithm = 'jaro-winkler') {
  return candidates
    .map((candidate, index) => {
      let score;
      if (algorithm === 'levenshtein' || algorithm === 'lev') {
        score = levenshteinRatio(target, candidate);
      } else {
        const result = compare(target, candidate, algorithm);
        score = result.similarity ?? 0;
      }
      return { candidate, index, score };
    })
    .sort((a, b) => b.score - a.score);
}

// Re-export bigrams/ngrams for consumers
export { bigrams as _bigrams, ngrams as _ngrams };
