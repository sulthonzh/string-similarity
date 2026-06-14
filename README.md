# string-similarity

Zero-dependency string similarity algorithms for Node.js. Levenshtein, Jaro-Winkler, Sørensen-Dice, n-gram, cosine, Soundex, Metaphone, and more.

## Why

Every project needs fuzzy string matching eventually — typo correction, search, deduplication, name matching. Existing libraries either pull in heavy dependencies or only implement one algorithm. This one covers all the common algorithms in a single zero-dep package.

## Install

```bash
npm install string-similarity
```

## Quick Start

```js
import { levenshtein, jaroWinkler, findClosest } from 'string-similarity';

// Edit distance
levenshtein('kitten', 'sitting'); // 3

// Similarity score (0–1)
jaroWinkler('MARTHA', 'MARHTA'); // 0.9611

// Find best match from a list
findClosest('apple', ['aple', 'application', 'orange']);
// { match: 'aple', index: 0, score: 0.9333 }
```

## Algorithms

### Levenshtein (`levenshtein`)
Minimum single-character edits (insert, delete, substitute) to transform one string into another.

```js
levenshtein('flaw', 'lawn'); // 2
levenshteinRatio('flaw', 'lawn'); // 0.5
```

### Damerau-Levenshtein (`damerauLevenshtein`)
Like Levenshtein, but also counts adjacent transpositions as a single edit.

```js
damerauLevenshtein('ca', 'ac'); // 1 (levenshtein would say 2)
```

### Hamming (`hamming`)
Position-by-position comparison. Requires equal-length strings.

```js
hamming('karolin', 'kathrin'); // 3
```

### Jaro (`jaro`)
Similarity for short strings (names, typos). Returns 0–1.

```js
jaro('DIXON', 'DICKSONX'); // 0.7667
```

### Jaro-Winkler (`jaroWinkler`)
Jaro + common-prefix bonus. Best for name matching.

```js
jaroWinkler('MARTHA', 'MARHTA'); // 0.9611

// Options
jaroWinkler('MARTHA', 'MARHTA', { prefixWeight: 0.2, maxPrefix: 4, boostThreshold: 0.7 });
```

### Sørensen-Dice (`sorensenDice`)
Bigram-based similarity. Good for word-level fuzzy matching.

```js
sorensenDice('night', 'nacht'); // 0.25
```

### N-Gram Similarity (`ngramSimilarity`)
Jaccard similarity over character n-grams.

```js
ngramSimilarity('hello', 'hallo', 3); // configurable n
```

### Cosine Similarity (`cosineSimilarity`)
Character-frequency cosine. Anagrams score 1.0.

```js
cosineSimilarity('listen', 'silent'); // ≈ 1.0
```

### Soundex (`soundex`)
Classic 4-character phonetic code.

```js
soundex('Robert'); // 'R163'
soundex('Rupert'); // 'R163' — same code!
```

### Metaphone (`metaphone`)
Simplified Metaphone phonetic algorithm.

```js
metaphone('Smith'); // 'SM0T'
```

## Unified API

### `compare(a, b, algorithm)`
Returns `{ distance?, similarity? }` for the given algorithm.

```js
compare('kitten', 'sitting', 'levenshtein');
// { distance: 3, similarity: 0.5714 }

compare('MARTHA', 'MARHTA', 'jaro-winkler');
// { similarity: 0.9611 }
```

Algorithm aliases: `lev`, `osa`, `jw`, `dice`.

### `findClosest(target, candidates, algorithm)`
Returns the best match from a list.

```js
findClosest('apple', ['aple', 'application', 'snapple', 'orange']);
// { match: 'aple', index: 0, score: 0.9333 }
```

### `rankMatches(target, candidates, algorithm)`
Returns all candidates sorted by similarity (descending).

```js
rankMatches('hello', ['hello', 'hallo', 'xyz', 'help']);
// [{ candidate: 'hello', score: 1 }, { candidate: 'hallo', score: 0.8667 }, ...]
```

## CLI

```bash
# Compare two strings
strsim compare "kitten" "sitting" --algo levenshtein --json

# Find closest match
strsim closest "apple" "aple" "application" "snapple"

# Rank candidates
strsim rank "hello" "hallo" "xyz" "help"

# Phonetic codes
strsim soundex "Robert"
strsim metaphone "Smith"

# Pure distance
strsim distance "kitten" "sitting" --algo levenshtein
```

## License

MIT
