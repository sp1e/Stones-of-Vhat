// Re-runnable mutation evidence for the environment tests (docs/environment/measurements.md).
//
//   node docs/environment/mutation-check.mjs            native mutations (content, route, scene)
//   node docs/environment/mutation-check.mjs --browser  also the lab lifecycle mutations (uses port 4182)
//   add `--only <name substring>` to rerun selected entries
//
// Each mutation replaces one exact source snippet, runs the named test, and restores the original bytes in `finally`.
// KILLED requires a non-zero exit AND the named test reported as failed; the first assertion line is printed as evidence.
// Refuses to start on a snippet that is missing or not unique, so a stale entry can never pass silently.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const game = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'game');
const CONTENT = 'tests/environmentContent.test.mjs', ROUTE = 'tests/environmentRoute.test.mjs';
const SCENE = 'tests/environmentScene.test.mjs', LAB = 'browser/environmentLab.spec.mjs';

const MUTATIONS = [
  { name: 'fruit-tree crown lowered into reach', file: 'src/content/environment/kit.ts', test: CONTENT,
    failing: 'solid elements are exactly the collision bodies', from: 'crownRadius: 1.5, crownCentre: 3.9', to: 'crownRadius: 1.5, crownCentre: 3.1' },
  { name: 'door inset protrudes 0.2 m', file: 'src/content/environment/kit.ts', test: CONTENT,
    failing: 'solid elements are exactly the collision bodies', from: 'z: depth / 2 + 0.015 }', to: 'z: depth / 2 + 0.2 }' },
  { name: '1691 lantern moved into the baseline', file: 'src/content/environment/provenance.ts', test: CONTENT,
    failing: 'the 1510 baseline excludes later phases', from: "phase: { layer: 'later-phase', fromYear: 1691 }", to: "phase: { layer: 'baseline-1510', fromYear: 1691 }" },
  { name: 'bodies drop yaw rotation', file: 'src/content/environment/index.ts', test: CONTENT,
    failing: 'solid elements are exactly the collision bodies', from: 'return element.yaw === 0 ? body :', to: 'return true ? body :' },
  { name: 'cobble patch enlarged to a carpet', file: 'src/content/environment/route.ts', test: CONTENT,
    failing: 'route content', from: "cobbles('church-gate-cobbles', 0, -26.8, 7, 3.6, 303)", to: "cobbles('church-gate-cobbles', 0, -26.8, 60, 20, 303)" },
  { name: 'lane blocked by a fence', file: 'src/content/environment/route.ts', test: ROUTE, pattern: 'walks both routes',
    failing: 'walks both routes', from: "f('lane-east', -15.8, -2, -15.8, -8)", to: "f('lane-east', -18, -5, -15.8, -5)" },
  { name: 'W4 house rendered but its colliders dropped', file: 'src/content/environment/index.ts', test: ROUTE, pattern: 'facade rejects',
    failing: 'facade rejects', from: "bodies: elements.filter((candidate) => candidate.collision === 'solid')",
    to: "bodies: elements.filter((candidate) => candidate.collision === 'solid' && !candidate.id.startsWith('storgata-w4-'))" },
  { name: 'approach north fence removed from the layout', file: 'src/content/environment/route.ts', test: ROUTE, pattern: 'escape sweep',
    failing: 'escape sweep: twelve 10 s headings', from: "f('approach-north', -14, 52, 22, 52),", to: '' },
  { name: 'gate step raised to 0.45 m', file: 'src/content/environment/landmarks.ts', test: ROUTE, pattern: 'churchyard wall',
    failing: 'churchyard wall rejects', from: 'step(2, 0.3, -29.475),', to: 'step(2, 0.45, -29.475),' },
  { name: 'render box swaps width and depth', file: 'src/render/environment/sceneBuilder.ts', test: SCENE,
    failing: 'solid meshes occupy exactly the collider volume', from: 'boxGeometry(g.size[0], g.size[1], g.size[2], tile)', to: 'boxGeometry(g.size[2], g.size[1], g.size[0], tile)' },
  { name: 'render ignores element yaw', file: 'src/render/environment/sceneBuilder.ts', test: SCENE,
    failing: 'solid meshes occupy exactly the collider volume', from: 'object.rotation.set(0, element.yaw, 0);', to: 'object.rotation.set(0, 0, 0);' },
  { name: 'crown blobs pushed outward', file: 'src/render/environment/geometry.ts', test: SCENE,
    failing: 'render-only geometry stays inside the envelope', from: '0.86 + random() * 0.14', to: '1.0 + random() * 0.3' },
  { name: 'scene dispose forgets materials', file: 'src/render/environment/sceneBuilder.ts', test: SCENE,
    failing: 'dispose releases every geometry', from: '      materials.dispose();\n', to: '\n' },
  { name: 'tree trunks cut short (floating crowns)', file: 'src/content/environment/kit.ts', test: SCENE,
    failing: 'every tree trunk reaches into the rendered underside', from: 'const TRUNK_INTO_CROWN = 0.25;', to: 'const TRUNK_INTO_CROWN = 1.6;' },
  { name: 'tree trunks poke through their crowns', file: 'src/content/environment/kit.ts', test: SCENE,
    failing: 'every tree trunk reaches into the rendered underside', from: 'const TRUNK_INTO_CROWN = 0.25;', to: 'const TRUNK_INTO_CROWN = -0.9;' },
  { name: 'terminal failure keeps lab listeners', file: 'src/lab/environmentLab.ts', test: LAB, pattern: 'frame failure is terminal', browser: true,
    failing: 'a frame failure is terminal', from: '    generation += 1;\n    cancelAnimationFrame(frameId);\n    events.abort();\n    input.dispose();\n',
    to: '    generation += 1;\n    cancelAnimationFrame(frameId);\n' },
  { name: 'frame loop reschedules after a terminal failure', file: 'src/lab/environmentLab.ts', test: LAB, pattern: 'frame failure is terminal', browser: true,
    failing: 'a frame failure is terminal', from: '  function frame(now: number): void {\n    if (closed || failed) return;\n', to: '  function frame(now: number): void {\n    if (closed) return;\n',
    also: { from: '        fail(MESSAGES.frameFailed);\n        return;\n', to: '        fail(MESSAGES.frameFailed);\n' } },
  { name: 'restart overwrites the graphics-lost message', file: 'src/lab/environmentLab.ts', test: LAB, pattern: 'restart is loading', browser: true,
    failing: 'context loss while a restart is loading', from: 'showPanel(idleMessage(MESSAGES.ready));', to: 'showPanel(MESSAGES.ready);' },
  // The failure case has two independent guards (the catch's `failed` check and idleMessage's failure precedence);
  // removing either alone is an equivalent mutation, so this entry removes both. The `closed` part of the catch
  // guard is covered by the teardown entry below.
  { name: 'late lock rejection ignores a terminal failure (both guards removed)', file: 'src/lab/environmentLab.ts', test: LAB, pattern: 'late pointer-lock rejection', browser: true,
    failing: 'a late pointer-lock rejection never overwrites', from: '      if (closed || failed) return;\n      running = false;\n', to: '      if (closed) return;\n      running = false;\n',
    also: { from: "    if (failed) return status.textContent ?? '';\n", to: '' } },
  { name: 'late lock rejection ignores a lost context', file: 'src/lab/environmentLab.ts', test: LAB, pattern: 'late pointer-lock rejection', browser: true,
    failing: 'a late pointer-lock rejection never overwrites', from: '\n      showPanel(idleMessage(MESSAGES.lockRejected));\n', to: '\n      showPanel(MESSAGES.lockRejected);\n' },
  { name: 'late lock rejection ignores teardown', file: 'src/lab/environmentLab.ts', test: LAB, pattern: 'pagehide teardown', browser: true,
    failing: 'pagehide teardown releases', from: '      if (closed || failed) return;\n      running = false;\n', to: '      if (failed) return;\n      running = false;\n' },
  { name: 'teardown keeps the renderer', file: 'src/lab/environmentLab.ts', test: LAB, pattern: 'pagehide teardown', browser: true,
    failing: 'pagehide teardown releases', from: '    yard = null;\n    view.dispose();\n    delete window.__environmentLab;\n', to: '    yard = null;\n    delete window.__environmentLab;\n' },
];

const includeBrowser = process.argv.includes('--browser');
const onlyIndex = process.argv.indexOf('--only'), only = onlyIndex > 0 ? process.argv[onlyIndex + 1] : null;
const selected = MUTATIONS.filter((mutation) => (includeBrowser || !mutation.browser) && (!only || mutation.name.includes(only)));
if (selected.length === 0) throw new Error('no mutation selected');
const occurrences = (text, snippet) => text.split(snippet).length - 1;

// Crash safety: the original bytes are journalled (ignored .playtest dir) before any mutation. A run that was
// killed mid-mutation (Ctrl+C, timeout, crash) is repaired at the start of the next run, and a signal that arrives
// between test processes restores immediately. `finally` alone cannot cover a hard kill.
const journalDir = join(game, '.playtest', 'environment', 'mutation-journal');
const journalFile = join(journalDir, 'in-flight.json');
function restoreFromJournal() {
  if (!existsSync(journalFile)) return false;
  const { file, original } = JSON.parse(readFileSync(journalFile, 'utf8'));
  writeFileSync(join(game, file), Buffer.from(original, 'base64'));
  rmSync(journalFile);
  console.log(`RESTORED ${file} from an interrupted earlier run`);
  return true;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { restoreFromJournal(); process.exit(130); });
restoreFromJournal();

// Snippets are written with LF; match on LF-normalized text and write back with the file's own line endings,
// so a CRLF checkout (core.autocrlf=true) neither breaks matching nor rewrites every line.
const toLf = (text) => text.replace(/\r\n/g, '\n');
const withEol = (text, crlf) => (crlf ? text.replace(/\n/g, '\r\n') : text);

for (const mutation of selected) {
  const text = toLf(readFileSync(join(game, mutation.file), 'utf8'));
  for (const edit of [mutation, mutation.also].filter(Boolean)) {
    const count = occurrences(text, edit.from);
    if (count !== 1) throw new Error(`${mutation.name}: snippet found ${count} times in ${mutation.file}; update this entry`);
  }
}

mkdirSync(journalDir, { recursive: true });
let survived = 0;
for (const mutation of selected) {
  const path = join(game, mutation.file), original = readFileSync(path);
  const source = original.toString('utf8'), crlf = source.includes('\r\n');
  let mutated = toLf(source).replace(mutation.from, mutation.to);
  if (mutation.also) mutated = mutated.replace(mutation.also.from, mutation.also.to);
  writeFileSync(journalFile, JSON.stringify({ file: mutation.file, original: original.toString('base64') }));
  writeFileSync(path, withEol(mutated, crlf), 'utf8');
  try {
    const args = ['--test', ...(mutation.pattern ? ['--test-name-pattern', mutation.pattern] : []), mutation.test];
    const run = spawnSync(process.execPath, args, { cwd: game, encoding: 'utf8', timeout: 600_000 });
    const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
    const namedFailure = output.split(/\r?\n/).some((line) => line.startsWith('✖') && line.includes(mutation.failing));
    const assertion = (output.match(/^\s*(AssertionError[^\r\n]*|Error[^\r\n]*)/m)?.[1] ?? '(no assertion line)').trim().slice(0, 180);
    const killed = run.status !== 0 && namedFailure;
    if (!killed) survived += 1;
    console.log(`${killed ? 'KILLED  ' : 'SURVIVED'} ${mutation.name} — ${mutation.test} — ${assertion}`);
  } finally {
    writeFileSync(path, original);
    if (!readFileSync(path).equals(original)) throw new Error(`failed to restore ${mutation.file}; original kept in ${journalFile}`);
    rmSync(journalFile);
  }
}
console.log(`${selected.length - survived}/${selected.length} killed`);
process.exitCode = survived === 0 ? 0 : 1;
