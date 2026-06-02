#!/usr/bin/env node
/**
 * validate-review-output.js
 * Validates Smart Code Review Guardian report structure.
 *
 * Usage:
 *   node validate-review-output.js report.md
 *   node validate-review-output.js --stdin   (read from stdin)
 *   cat report.md | node validate-review-output.js --stdin
 */

const fs = require('fs');

const REQUIRED_SECTIONS = [
  '# Smart Code Review Guardian Report',
  'Overall Status:',
  'Risk Score:',
  '## Summary',
  '## Changed Files Reviewed',
  '## Findings',
  '## Missing Context',
  '## Recommended Next Actions',
  '## Final Decision',
];

const VALID_STATUS = ['PASS', 'WARN', 'FAIL'];
const VALID_SEVERITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function readInput() {
  const arg = process.argv[2];
  if (arg === '--stdin' || arg === '-') {
    return fs.readFileSync(0, 'utf8');
  }
  if (!arg) {
    console.error('Usage: node validate-review-output.js <report.md|--stdin>');
    process.exit(1);
  }
  if (!fs.existsSync(arg)) {
    console.error(`File not found: ${arg}`);
    process.exit(1);
  }
  return fs.readFileSync(arg, 'utf8');
}

function validate(content) {
  const errors = [];
  const warnings = [];

  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      errors.push(`Missing required section or field: "${section}"`);
    }
  }

  const statusMatch = content.match(/Overall Status:\s*(PASS|WARN|FAIL)/i);
  if (statusMatch) {
    const status = statusMatch[1].toUpperCase();
    if (!VALID_STATUS.includes(status)) {
      errors.push(`Invalid overall status: ${statusMatch[1]}`);
    }
  } else {
    errors.push('Could not parse Overall Status (expected PASS | WARN | FAIL)');
  }

  const riskMatch = content.match(/Risk Score:\s*(\d+)/);
  if (riskMatch) {
    const score = parseInt(riskMatch[1], 10);
    if (score < 1 || score > 10) {
      errors.push(`Risk score out of range (1-10): ${score}`);
    }
  } else {
    warnings.push('Risk score not found or not numeric');
  }

  const findingBlocks = content.split(/### Finding|\*\*Severity:\*\*|^- \*\*Severity:\*\*/i).length - 1;
  if (findingBlocks === 0 && !content.match(/no findings|no issues found/i)) {
    warnings.push('No findings detected — ensure Findings section documents issues or states none found');
  }

  for (const sev of VALID_SEVERITY) {
    if (content.includes(sev)) break;
  }

  // Check for hallucination red flags
  if (content.match(/I assume|probably has tests|likely covered/i)) {
    warnings.push('Language suggests unverified assumptions — prefer Missing Context');
  }

  return { errors, warnings, valid: errors.length === 0 };
}

function main() {
  const content = readInput();
  const result = validate(content);

  const report = {
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!result.valid) {
    process.exit(1);
  }
  if (result.warnings.length > 0) {
    process.exit(0);
  }
}

main();
