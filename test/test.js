import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  levenshtein, levenshteinRatio, damerauLevenshtein,
  hamming, jaro, jaroWinkler, sorensenDice, ngramSimilarity,
  cosineSimilarity, soundex, metaphone, compare,
  findClosest, rankMatches, bigrams, ngrams,
} from '../src/index.js';

// ─── Levenshtein ─────────────────────────────────────────────────────

test('levenshtein: identical strings = 0', () => {
  assert.equal(levenshtein('hello', 'hello'), 0);
});

test('levenshtein: empty strings', () => {
  assert.equal(levenshtein('', ''), 0);
  assert.equal(levenshtein('abc', ''), 3);
  assert.equal(levenshtein('', 'xyz'), 3);
});

test('levenshtein: classic examples', () => {
  assert.equal(levenshtein('kitten', 'sitting'), 3);
  assert.equal(levenshtein('flaw', 'lawn'), 2);
  assert.equal(levenshtein('sunday', 'saturday'), 3);
});

test('levenshtein: single substitution', () => {
  assert.equal(levenshtein('cat', 'cot'), 1);
});

test('levenshtein: case-sensitive', () => {
  assert.equal(levenshtein('ABC', 'abc'), 3);
});

test('levenshteinRatio: 0 to 1 range', () => {
  assert.equal(levenshteinRatio('hello', 'hello'), 1);
  assert.equal(levenshteinRatio('', ''), 1);
  const r = levenshteinRatio('kitten', 'sitting');
  assert.ok(r > 0 && r < 1);
  assert.equal(r.toFixed(4), '0.5714');
});

// ─── Damerau-Levenshtein ─────────────────────────────────────────────

test('damerauLevenshtein: transposition = 1 (vs levenshtein 2)', () => {
  assert.equal(damerauLevenshtein('ca', 'ac'), 1);
  assert.equal(levenshtein('ca', 'ac'), 2);
});

test('damerauLevenshtein: identical', () => {
  assert.equal(damerauLevenshtein('test', 'test'), 0);
});

test('damerauLevenshtein: empty', () => {
  assert.equal(damerauLevenshtein('', 'abc'), 3);
});

test('damerauLevenshtein: complex transposition', () => {
  assert.equal(damerauLevenshtein('abcdef', 'abcfed'), 2); // two swaps
});

// ─── Hamming ─────────────────────────────────────────────────────────

test('hamming: basic', () => {
  assert.equal(hamming('karolin', 'kathrin'), 3);
  assert.equal(hamming('10100', '10011'), 3);
});

test('hamming: identical = 0', () => {
  assert.equal(hamming('hello', 'hello'), 0);
});

test('hamming: unequal length throws', () => {
  assert.throws(() => hamming('abc', 'ab'), /equal-length/);
});

// ─── Jaro ────────────────────────────────────────────────────────────

test('jaro: identical = 1', () => {
  assert.equal(jaro('hello', 'hello'), 1);
});

test('jaro: completely different = 0', () => {
  assert.equal(jaro('abc', 'xyz'), 0);
});

test('jaro: classic examples', () => {
  assert.equal(jaro('MARTHA', 'MARHTA').toFixed(4), '0.9444');
  assert.equal(jaro('DIXON', 'DICKSONX').toFixed(4), '0.7667');
});

test('jaro: empty string = 0', () => {
  assert.equal(jaro('', 'abc'), 0);
  assert.equal(jaro('', ''), 1);
});

// ─── Jaro-Winkler ────────────────────────────────────────────────────

test('jaroWinkler: identical = 1', () => {
  assert.equal(jaroWinkler('hello', 'hello'), 1);
});

test('jaroWinkler: prefix bonus', () => {
  // Jaro-Winkler should be >= Jaro due to prefix
  assert.ok(jaroWinkler('MARTHA', 'MARHTA') >= jaro('MARTHA', 'MARHTA'));
  assert.equal(jaroWinkler('MARTHA', 'MARHTA').toFixed(4), '0.9611');
});

test('jaroWinkler: below boost threshold returns jaro', () => {
  const result = jaroWinkler('xyz', 'abc');
  assert.equal(result, jaro('xyz', 'abc'));
});

test('jaroWinkler: custom prefix weight', () => {
  const jw = jaroWinkler('MARTHA', 'MARHTA', { prefixWeight: 0.2 });
  assert.ok(jw > 0.96);
});

// ─── Sørensen-Dice ───────────────────────────────────────────────────

test('sorensenDice: identical = 1', () => {
  assert.equal(sorensenDice('hello', 'hello'), 1);
});

test('sorensenDice: example', () => {
  const r = sorensenDice('night', 'nacht');
  assert.ok(r > 0 && r < 1);
  // 'ni','ig','gh','ht' vs 'na','ac','ch','ht' → intersection={'ht'} → 2*1/(4+4)=0.25
  assert.equal(r, 0.25);
});

test('sorensenDice: completely different', () => {
  assert.equal(sorensenDice('abc', 'xyz'), 0);
});

test('sorensenDice: case insensitive', () => {
  assert.equal(sorensenDice('Hello', 'hello'), 1);
});

// ─── N-Gram ──────────────────────────────────────────────────────────

test('ngramSimilarity: identical = 1', () => {
  assert.equal(ngramSimilarity('hello', 'hello', 2), 1);
});

test('ngramSimilarity: trigram', () => {
  const r = ngramSimilarity('hello', 'hallo', 3);
  assert.ok(r > 0 && r < 1);
});

test('ngramSimilarity: different n values', () => {
  const r2 = ngramSimilarity('abcdef', 'abcxef', 2);
  const r3 = ngramSimilarity('abcdef', 'abcxef', 3);
  assert.ok(r2 !== r3);
});

test('ngramSimilarity: Jaccard formula', () => {
  // "ab","bc" vs "ab","bc" → intersection=2, union=2 → 2/2=1
  assert.equal(ngramSimilarity('abc', 'abc', 2), 1);
  // "ab","bc" vs "cd","de" → intersection=0
  assert.equal(ngramSimilarity('abc', 'cde', 2), 0);
});

// ─── Cosine Similarity ───────────────────────────────────────────────

test('cosineSimilarity: identical = 1', () => {
  assert.equal(cosineSimilarity('hello', 'hello'), 1);
});

test('cosineSimilarity: anagram = 1', () => {
  assert.ok(Math.abs(cosineSimilarity('listen', 'silent') - 1) < 0.001);
});

test('cosineSimilarity: different strings < 1', () => {
  assert.ok(cosineSimilarity('hello', 'world') < 1);
});

test('cosineSimilarity: empty = 0', () => {
  assert.equal(cosineSimilarity('', 'abc'), 0);
});

// ─── Soundex ─────────────────────────────────────────────────────────

test('soundex: classic examples', () => {
  assert.equal(soundex('Robert'), 'R163');
  assert.equal(soundex('Rupert'), 'R163');
  assert.equal(soundex('Ashcraft'), 'A261');
  assert.equal(soundex('Tymczak'), 'T522');
});

test('soundex: same code for similar sounding', () => {
  assert.equal(soundex('Jackson'), 'J250');
  assert.equal(soundex('Jaxen'), 'J250');
});

test('soundex: empty string', () => {
  assert.equal(soundex(''), '0000');
});

test('soundex: single letter', () => {
  assert.equal(soundex('B'), 'B000');
});

test('soundex: removes non-alpha', () => {
  assert.equal(soundex('O\'Brien'), 'O165'); // O,B,R → O165
});

test('soundex: H and W are separators (not coded but don\'t break sequence)', () => {
  // For "Ashcraft": A,S,H,C,R,A,F,T → A, S=2, H=skip, C=2 (but S→2 and C→2, H between means they ARE different), R=6, F=1, T=3
  // Actually: A(keep), S=2, H=skip(no code, reset prevCode), C=2, R=6, F=1, T=3 → A261 (truncated to 4)
  assert.equal(soundex('Ashcraft'), 'A261');
});

// ─── Metaphone ───────────────────────────────────────────────────────

test('metaphone: basic', () => {
  assert.ok(metaphone('Smith').length > 0);
  assert.ok(metaphone('Schmidt').length > 0);
});

test('metaphone: empty string', () => {
  assert.equal(metaphone(''), '');
});

test('metaphone: produces something reasonable', () => {
  const m1 = metaphone('telephone');
  const m2 = metaphone('telefon');
  assert.ok(typeof m1 === 'string');
  assert.ok(typeof m2 === 'string');
});

test('metaphone: removes non-alpha', () => {
  const m = metaphone('hello123');
  assert.equal(m, metaphone('hello'));
});

// ─── compare() ───────────────────────────────────────────────────────

test('compare: levenshtein returns distance + similarity', () => {
  const r = compare('cat', 'cot', 'levenshtein');
  assert.equal(r.distance, 1);
  assert.ok(Math.abs(r.similarity - 2/3) < 0.001); // 1 - 1/3
});

test('compare: jaro-winkler returns similarity only', () => {
  const r = compare('hello', 'hello', 'jaro-winkler');
  assert.equal(r.similarity, 1);
  assert.equal(r.distance, undefined);
});

test('compare: throws on unknown algorithm', () => {
  assert.throws(() => compare('a', 'b', 'nonexistent'), /Unknown algorithm/);
});

test('compare: alias lev', () => {
  const r1 = compare('cat', 'cot', 'lev');
  const r2 = compare('cat', 'cot', 'levenshtein');
  assert.deepEqual(r1, r2);
});

test('compare: alias jw', () => {
  const r1 = compare('hello', 'hello', 'jw');
  const r2 = compare('hello', 'hello', 'jaro-winkler');
  assert.deepEqual(r1, r2);
});

// ─── findClosest ─────────────────────────────────────────────────────

test('findClosest: returns best match', () => {
  const result = findClosest('apple', ['aple', 'application', 'snapple', 'orange']);
  assert.equal(result.match, 'aple');
  assert.equal(result.index, 0);
  assert.ok(result.score > 0.8);
});

test('findClosest: single candidate', () => {
  const result = findClosest('test', ['test']);
  assert.equal(result.match, 'test');
  assert.equal(result.score, 1);
});

test('findClosest: levenshtein algorithm', () => {
  const result = findClosest('cat', ['car', 'bat', 'rat'], 'levenshtein');
  assert.equal(result.match, 'car'); // 1 edit vs 1 edit vs 1 edit — all tied, first wins
});

test('findClosest: empty candidates', () => {
  const result = findClosest('test', [], 'jaro-winkler');
  assert.equal(result.index, -1);
  assert.equal(result.match, undefined);
});

// ─── rankMatches ─────────────────────────────────────────────────────

test('rankMatches: sorted by score descending', () => {
  const results = rankMatches('hello', ['hello', 'hallo', 'xyz', 'help']);
  assert.equal(results[0].candidate, 'hello');
  assert.equal(results[0].score, 1);
  assert.equal(results[results.length - 1].candidate, 'xyz');
  assert.ok(results[0].score >= results[1].score);
});

test('rankMatches: correct number of results', () => {
  const results = rankMatches('test', ['test', 'best', 'rest']);
  assert.equal(results.length, 3);
});

// ─── bigrams / ngrams helpers ────────────────────────────────────────

test('bigrams: produces correct set', () => {
  const bg = bigrams('hello');
  assert.ok(bg.has('he'));
  assert.ok(bg.has('el'));
  assert.ok(bg.has('ll'));
  assert.ok(bg.has('lo'));
  assert.equal(bg.size, 4);
});

test('bigrams: single char', () => {
  const bg = bigrams('a');
  assert.equal(bg.size, 1);
  assert.ok(bg.has('a'));
});

test('ngrams: trigram', () => {
  const ng = ngrams('hello', 3);
  assert.ok(ng.has('hel'));
  assert.ok(ng.has('ell'));
  assert.ok(ng.has('llo'));
  assert.equal(ng.size, 3);
});
