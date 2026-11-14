#!/usr/bin/env node
/**
 * Keeps agent edits Biome-clean. `afterFileEdit` applies formatting and safe fixes to each edited file and
 * remembers it; `stop` checks every remembered file and, if anything is left, sends the diagnostics back to
 * the agent as a follow-up so it fixes them before finishing.
 *
 *   node .cursor/hooks/biome.mjs afterFileEdit|stop
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const event = process.argv[2];
const input = JSON.parse(readFileSync(0, 'utf8'));
const root = input.workspace_roots?.[0] ?? process.cwd();
const biome = join(root, 'node_modules/.bin/biome');
const list = join(tmpdir(), 'cursor-biome', `${input.conversation_id}.txt`);

/** Returns Biome's report when it finds errors, or '' when clean or when Biome can't run (fail open). */
function biomeCheck(...args) {
  try {
    execFileSync(biome, ['check', '--no-errors-on-unmatched', '--files-ignore-unknown=true', '--colors=off', ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return '';
  } catch (error) {
    return error.status === 1 ? `${error.stdout}${error.stderr}` : '';
  }
}

if (!existsSync(biome)) process.exit(0);

if (event === 'afterFileEdit' && input.file_path) {
  mkdirSync(join(tmpdir(), 'cursor-biome'), { recursive: true });
  appendFileSync(list, `${input.file_path}\n`);
  biomeCheck('--write', input.file_path);
}

if (event === 'stop' && input.status === 'completed' && existsSync(list)) {
  const files = [...new Set(readFileSync(list, 'utf8').split('\n'))].filter((f) => f && existsSync(f));
  const report = files.length ? biomeCheck('--error-on-warnings', ...files) : '';
  if (report) {
    const followup_message = `Biome reports problems in files you edited. Fix them (\`pnpm check:fix\` applies safe fixes; use a \`biome-ignore\` comment with a reason only when the rule genuinely doesn't apply), then finish.\n\n${report.slice(0, 8000)}`;
    console.log(JSON.stringify({ followup_message }));
  } else {
    rmSync(list, { force: true });
  }
}
