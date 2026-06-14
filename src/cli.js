#!/usr/bin/env node
// strsim CLI — string similarity comparison

import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);

function usage() {
  console.log(`strsim — string similarity comparison

USAGE:
  strsim compare <a> <b> [--algo <algorithm>]
  strsim closest <target> <candidate1> [candidate2...]
  strsim rank <target> <candidate1> [candidate2...]
  strsim soundex <string>
  strsim metaphone <string>
  strsim distance <a> <b> [--algo <algorithm>]

ALGORITHMS:
  levenshtein, damerau, jaro, jaro-winkler, sorensen, ngram, cosine, hamming

OPTIONS:
  --algo <name>   Algorithm (default: jaro-winkler for compare/closest/rank)
  --json          Output as JSON
  -h, --help      Show this help

EXAMPLES:
  strsim compare "kitten" "sitting" --algo levenshtein --json
  strsim closest "apple" "aple" "application" "snapple"
  strsim soundex "Robert"
  strsim metaphone "Smith"`);
}

function getFlag(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(name) {
  return args.includes(name);
}

async function main() {
  const importPath = new URL('./index.js', import.meta.url).href;
  const {
    levenshtein, levenshteinRatio, damerauLevenshtein,
    jaro, jaroWinkler, sorensenDice, ngramSimilarity,
    cosineSimilarity, hamming, soundex, metaphone,
    compare, findClosest, rankMatches,
  } = await import(importPath);

  const cmd = args[0];

  if (!cmd || cmd === '-h' || cmd === '--help') {
    usage();
    return;
  }

  const json = hasFlag('--json');

  if (cmd === 'soundex' || cmd === 'sx') {
    const str = args[1];
    if (!str) { console.error('Error: missing string'); process.exit(1); }
    const code = soundex(str);
    if (json) console.log(JSON.stringify({ input: str, soundex: code }));
    else console.log(code);
    return;
  }

  if (cmd === 'metaphone' || cmd === 'mp') {
    const str = args[1];
    if (!str) { console.error('Error: missing string'); process.exit(1); }
    const code = metaphone(str);
    if (json) console.log(JSON.stringify({ input: str, metaphone: code }));
    else console.log(code);
    return;
  }

  if (cmd === 'compare' || cmd === 'cmp') {
    const a = args[1];
    const b = args[2];
    if (!a || !b) { console.error('Error: need two strings'); process.exit(1); }
    const algo = getFlag('--algo') || 'jaro-winkler';
    const result = compare(a, b, algo);
    if (json) {
      console.log(JSON.stringify({ algorithm: algo, a, b, ...result }));
    } else {
      for (const [k, v] of Object.entries(result)) {
        console.log(`${k}: ${typeof v === 'number' ? v.toFixed(4) : v}`);
      }
    }
    return;
  }

  if (cmd === 'distance' || cmd === 'dist') {
    const a = args[1];
    const b = args[2];
    if (!a || !b) { console.error('Error: need two strings'); process.exit(1); }
    const algo = getFlag('--algo') || 'levenshtein';
    if (algo === 'levenshtein' || algo === 'lev') {
      console.log(levenshtein(a, b));
    } else if (algo === 'damerau' || algo === 'osa') {
      console.log(damerauLevenshtein(a, b));
    } else if (algo === 'hamming') {
      try { console.log(hamming(a, b)); }
      catch (e) { console.error(e.message); process.exit(1); }
    } else {
      console.error(`Distance not available for algorithm: ${algo}. Use levenshtein, damerau, or hamming.`);
      process.exit(1);
    }
    return;
  }

  if (cmd === 'closest' || cmd === 'best') {
    const target = args[1];
    const candidates = args.slice(2).filter(a => !a.startsWith('--'));
    if (!target || candidates.length === 0) { console.error('Error: need target and at least one candidate'); process.exit(1); }
    const algo = getFlag('--algo') || 'jaro-winkler';
    const result = findClosest(target, candidates, algo);
    if (json) {
      console.log(JSON.stringify({ target, algorithm: algo, ...result }));
    } else {
      console.log(`${result.match} (${result.score.toFixed(4)})`);
    }
    return;
  }

  if (cmd === 'rank' || cmd === 'sort') {
    const target = args[1];
    const candidates = args.slice(2).filter(a => !a.startsWith('--'));
    if (!target || candidates.length === 0) { console.error('Error: need target and at least one candidate'); process.exit(1); }
    const algo = getFlag('--algo') || 'jaro-winkler';
    const results = rankMatches(target, candidates, algo);
    if (json) {
      console.log(JSON.stringify({ target, algorithm: algo, results }));
    } else {
      for (const r of results) {
        console.log(`${r.score.toFixed(4)}  ${r.candidate}`);
      }
    }
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  usage();
  process.exit(1);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
