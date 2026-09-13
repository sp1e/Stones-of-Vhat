# Handover to Claude in the terminal — environment workstream (paused 2026-09-13 14:40)

> **HISTORICAL.** Simon resumed the same session at 15:32 instead of switching to a terminal. The current state is in
> `integration-requests.md` and `handoff.md`.

Open the terminal in the **worktree root**:
`C:\Users\simon.pettersson\.config\superpowers\worktrees\Game1\environment-blockout`
Test and build commands run from its `game\` subfolder. Never work in `...\Game1\runtime-foundation` (Codex, read-only).

## Read first, in order

1. This file.
2. `...\Game1\runtime-foundation\docs\handoffs\2026-09-13-claude-resume-environment.md`: the current assignment from Codex, which Simon told me to follow.
3. `...\Game1\runtime-foundation\docs\handoffs\2026-09-13-claude-environment-workstream.md`: the base contract, file allowlist and historical rules.
4. `docs\environment\integration-requests.md`: my receipt to Codex, including the publication authority.
5. `docs\environment\plan.md`, `measurements.md`.

## Git state

- Branch `codex/environment-blockout`, historical base `20d9cf5`.
- HEAD is `cf9a877` (tree-trunk fix), local only and not pushed. Remote has `8099b7e`…`9f155d8`.
- Uncommitted, all inside the allowlist and all preserved:
  - modified: `docs/environment/measurements.md`, `game/src/content/environment/kit.ts` (portik lintel `timber`), `game/src/render/environment/materials.ts`, `game/tests/environmentRoute.test.mjs`
  - new: `docs/environment/{integration-requests.md, mutation-check.mjs, restart-point.md (marked HISTORICAL), terminal-handover.md}`, `game/environment-lab.html`, `game/src/lab/environmentLab.{ts,css}`, `game/src/render/environment/view.ts`, `game/browser/environmentLab.spec.mjs`

## Done this session (verified)

- **Codex finding 1, escape matrix: closed.** Each checkpoint × heading runs in a fresh `createYard` with a 20-tick settle and 600 fixed sprint steps, checked every 5 ticks including the last. A permanent negative control removes `fence-approach-north`. Takes 32.2 s.
- **Codex finding 2, terminal frame failure: closed.** In `environmentLab.ts`, `fail()` now cancels RAF, aborts listeners, disposes input, destroys the yard and disposes the view. Reload has its own listener; `frame()` returns when failed. Browser test injects a throwing draw call (RED→GREEN).
- **Reviewer finding: closed.** A restart finishing after context loss showed "Klart". Fixed with a single `idleMessage()` precedence and a browser regression test (RED→GREEN).
- **Codex finding 3, mutation evidence: closed.** `docs/environment/mutation-check.mjs --browser` gave **18/18 killed** with assertion text, recorded in `measurements.md`.
- **Tree fix:** trunk height is derived from the crown (commit `cf9a877`).
- **Screenshots:** all 15 inspected at 14:08–14:11. They predate the tree fix, so the courtyard view still shows a floating crown.
- **Last runs:** `npm run check` **136/136 PASS** (14:38, current sources). Build PASS and `git diff --check` clean, both at 14:17 (before the lab fixes).

## NOT passing / interrupted — rerun before any claim

- Full `browser/environmentLab.spec.mjs` on the current sources: **interrupted at 14:40**. The last full pass was 7/7 at 14:11 on older sources, and the file now has 9 tests.
- SPEC review subagent: **interrupted, no result**. QUALITY review: not started.
- `npm run build` and `git diff --check` must be rerun on the final sources.

## Next steps (Codex's resume document, priority order)

1. `cd game` → `rtk proxy node --test browser/environmentLab.spec.mjs` (port 4182; about 7 min; run only one browser suite at a time). Then inspect the new images in `game\.playtest\environment\`, especially the courtyard tree, portik ceiling, thresholds, and the menu vs corner label at 1024×700. Record renderer counts from `renderer-report.json` in `measurements.md`.
2. Run an independent SPEC review, then a fresh QUALITY review, both read-only. Fix confirmed findings with TDD.
3. `rtk proxy npm run check`, `rtk proxy npm run build`, `rtk git diff --check`. Check `git status` against the allowlist, then commit with explicit paths, never `git add .`. Suggested split: (a) escape matrix + measurements, (b) lab/view/materials/lintel + browser spec, (c) docs (mutation-check, integration-requests, restart-point, handover).
4. Write `docs/environment/handoff.md` covering: base/HEAD/commits/file list, implemented vs hypothesis, RED→GREEN, final runs with counts, reviews, absolute image paths, rights gaps, risks, ports.
5. Push only your own branch, as sp1e: `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin refs/heads/codex/environment-blockout:refs/heads/codex/environment-blockout`. The default credential helper resolves to Simon-HF and gets 403. No force push, merge or rebase; integration stays with Codex.

## Gotchas

- The GateGuard hook blocks the first Edit/Write of each file until you state importers, API and the user instruction; do that, then retry.
- Every shell command starts with `rtk`. No Defender changes, dependency upgrades, packaging or deploy. Never kill a process that holds a port.
- `renderer.info` counts depend on the camera view, so the restart test uses one fixed spawn.
- PowerShell shows Swedish text in JSON as mojibake; read it with node instead. The files themselves are correct UTF-8.
