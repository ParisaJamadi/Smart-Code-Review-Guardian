#!/usr/bin/env node
/**
 * collect-git-context.js
 * Gathers git status, diff source, changed files, and diff content for review workflows.
 * Outputs JSON to stdout. Exit 0 on success, 1 if not a git repo or no changes.
 * Usage:
 *   node collect-git-context.js
 *   node collect-git-context.js --staged-only   (pre-commit: staged diff only)
 */

const { execSync } = require('child_process');

const stagedOnly = process.argv.includes('--staged-only');

function run(cmd, options = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options,
    }).trim();
  } catch (err) {
    if (options.allowFail) return '';
    throw err;
  }
}

function detectBaseBranch() {
  const candidates = ['main', 'master', 'origin/main', 'origin/master'];
  for (const branch of candidates) {
    const exists = run(`git rev-parse --verify ${branch}`, { allowFail: true });
    if (exists) return branch;
  }
  return null;
}

function main() {
  const cwd = process.cwd();

  try {
    run('git rev-parse --git-dir');
  } catch {
    console.error(JSON.stringify({ error: 'Not a git repository', cwd }));
    process.exit(1);
  }

  const status = run('git status --porcelain=v1', { allowFail: true });
  const currentBranch = run('git branch --show-current', { allowFail: true }) || 'HEAD';

  let diffSource = 'none';
  let diff = '';
  let changedFiles = [];

  const stagedDiff = run('git diff --cached --name-status', { allowFail: true });
  const unstagedDiff = stagedOnly ? '' : run('git diff --name-status', { allowFail: true });

  if (stagedDiff) {
    diffSource = 'staged';
    diff = run('git diff --cached', { allowFail: true });
    changedFiles = stagedDiff.split('\n').filter(Boolean).map(parseNameStatus);
  } else if (!stagedOnly && unstagedDiff) {
    diffSource = 'working-tree';
    diff = run('git diff', { allowFail: true });
    changedFiles = unstagedDiff.split('\n').filter(Boolean).map(parseNameStatus);
  } else if (!stagedOnly) {
    const baseBranch = detectBaseBranch();
    if (baseBranch) {
      diffSource = `branch-vs-${baseBranch}`;
      const nameStatus = run(`git diff --name-status ${baseBranch}...HEAD`, { allowFail: true });
      if (nameStatus) {
        diff = run(`git diff ${baseBranch}...HEAD`, { allowFail: true });
        changedFiles = nameStatus.split('\n').filter(Boolean).map(parseNameStatus);
      }
    }
  } else if (stagedOnly) {
    diffSource = 'staged';
  }

  const baseBranch = detectBaseBranch();

  const output = {
    cwd,
    currentBranch,
    baseBranch,
    diffSource,
    hasChanges: changedFiles.length > 0,
    changedFiles,
    diffLength: diff.length,
    diff: diff.length > 100000 ? diff.slice(0, 100000) + '\n\n... [diff truncated at 100KB] ...' : diff,
    statusLines: status ? status.split('\n') : [],
    collectedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(output, null, 2));

  if (!output.hasChanges) {
    process.exit(2);
  }
}

function parseNameStatus(line) {
  const parts = line.split('\t');
  const status = parts[0];
  if (status.startsWith('R') || status.startsWith('C')) {
    return {
      status: status.charAt(0) === 'R' ? 'renamed' : 'copied',
      path: parts[2],
      oldPath: parts[1],
    };
  }
  const code = status.trim();
  const typeMap = { A: 'added', M: 'modified', D: 'deleted' };
  return {
    status: typeMap[code] || code,
    path: parts[1],
  };
}

main();
