#!/usr/bin/env node
/**
 * run-evals.js — Lightweight evaluation harness for Smart Code Review Guardian.
 * Compares sample reviewer outputs against expected keyword/category rules.
 *
 * Usage:
 *   node evals/run-evals.js
 *   node evals/run-evals.js --strict   (exit 1 on any failure)
 */

const fs = require('fs');
const path = require('path');

const EVALS_DIR = path.join(__dirname);
const goldenCases = JSON.parse(fs.readFileSync(path.join(EVALS_DIR, 'golden-cases.json'), 'utf8'));
const expectedResults = JSON.parse(fs.readFileSync(path.join(EVALS_DIR, 'expected-results.json'), 'utf8'));

const strict = process.argv.includes('--strict');
const severityRank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

function loadSampleOutput(relativePath) {
  const full = path.join(EVALS_DIR, relativePath);
  if (!fs.existsSync(full)) {
    throw new Error(`Sample output missing: ${full}`);
  }
  return fs.readFileSync(full, 'utf8');
}

function checkKeywords(content, keywords, mode) {
  const failures = [];
  for (const kw of keywords || []) {
    const found = content.toLowerCase().includes(kw.toLowerCase());
    if (mode === 'must' && !found) {
      failures.push(`Expected keyword not found: "${kw}"`);
    }
    if (mode === 'mustNot' && found) {
      failures.push(`Forbidden keyword found: "${kw}"`);
    }
  }
  return failures;
}

function checkSeverity(content, expectedSeverities) {
  const failures = [];
  if (!expectedSeverities || expectedSeverities.length === 0) return failures;
  const found = expectedSeverities.some((s) => content.toUpperCase().includes(s));
  if (!found) {
    failures.push(`Expected one of severities: ${expectedSeverities.join(', ')}`);
  }
  return failures;
}

function checkMaxSeverity(content, maxAllowed) {
  if (!maxAllowed) return [];
  const maxRank = severityRank[maxAllowed.toUpperCase()];
  const found = content.match(/\b(LOW|MEDIUM|HIGH|CRITICAL)\b/gi) || [];
  for (const s of found) {
    if (severityRank[s.toUpperCase()] > maxRank) {
      return [`Severity ${s} exceeds max allowed ${maxAllowed}`];
    }
  }
  return [];
}

function evaluateCase(caseDef) {
  const expected = expectedResults[caseDef.id];
  if (!expected) {
    return { id: caseDef.id, passed: false, errors: [`No expected-results entry for ${caseDef.id}`] };
  }

  let content;
  try {
    content = loadSampleOutput(caseDef.sampleOutputFile);
  } catch (err) {
    return { id: caseDef.id, name: caseDef.name, passed: false, errors: [err.message] };
  }

  const errors = [
    ...checkKeywords(content, expected.mustIncludeKeywords, 'must'),
    ...checkKeywords(content, expected.mustNotIncludeKeywords, 'mustNot'),
    ...checkSeverity(content, expected.mustIncludeSeverity),
    ...checkMaxSeverity(content, expected.maxSeverityAllowed),
  ];

  if (expected.mustIncludeCategories) {
    for (const cat of expected.mustIncludeCategories) {
      if (!content.toLowerCase().includes(cat.toLowerCase())) {
        errors.push(`Expected category not found: ${cat}`);
      }
    }
  }

  return {
    id: caseDef.id,
    name: caseDef.name,
    reviewer: caseDef.reviewer,
    passed: errors.length === 0,
    errors,
    explanation: errors.length === 0
      ? `Sample output for "${caseDef.name}" satisfies expected reviewer behaviour.`
      : errors.join('; '),
  };
}

function main() {
  const results = goldenCases.map(evaluateCase);
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  const summary = {
    totalCases: results.length,
    passed,
    failed,
    strict,
    regressionSummary: failed === 0
      ? 'No regressions detected in golden cases.'
      : `${failed} case(s) failed — review sample outputs or expected-results.json.`,
    cases: results,
  };

  console.log(JSON.stringify(summary, null, 2));
  console.log('\n--- Eval Summary ---');
  console.log(`Total: ${summary.totalCases} | Passed: ${passed} | Failed: ${failed}`);
  for (const r of results) {
    console.log(`${r.passed ? '✓' : '✗'} ${r.id}: ${r.explanation}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
