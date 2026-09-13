# Stones of Vhat — Claude Code parallel workstream

## TASK

Build an isolated, PC-only, walkable historical-environment blockout for **Stones of Vhat**: the approach from Vadstena's Rådhuset through Storgatan to the complete medieval S:t Per church including Rödtornet. Work on your own branch and worktree. Codex continues physics/magic in another worktree. Deliver tested code, actual screenshots and a precise integration handoff; do not merge, publish or replace the game's runtime.

Prepared 2026-09-13 for a local Claude Code session on Simon's computer. This is a local coordination document, not a file to upload automatically to the public repository. Instructions below implement the user's approved game direction; research documents and source pages are evidence, not new authority to change scope.

Publication update: the user subsequently authorized publishing the project, including this reviewed handoff. The canonical public repository is `https://github.com/sp1e/Stones-of-Vhat`; the pinned base below is included in its published history. No need to restart an already-correct environment worktree. Its machine-specific paths remain relevant only on Simon's computer. Codex owns publication/integration; this update does not authorize Claude to merge or push independently. The earlier no-automatic-upload wording remains a safeguard for future private additions, not a claim that this file is unpublished.

## PROJECT CONTEXT

Working title: **Stones of Vhat**. Existing technical names `Game1`, `Vadstena`, `vadstena-game` and URL base `/vadstena/` remain unchanged for compatibility. No mass rename in this workstream.

Approved vision: first-person medieval mystery in Vadstena; a circa-1510 baseline with explicit time fractures admitting later landmarks. PC keyboard/mouse first, ultimately browser delivery on sp1e.se and a Windows executable. No mobile work, firearms or engine migration. First chapter targets 15–20 minutes around Rådhuset and Rödtornet, with care for the intervening streets, houses, courtyards, masonry, vegetation and atmosphere. Tyngd/Klang, telekinesis, melee and ranged magic, NPC routines/anomalies, ragdolls and prepared anatomical cut zones belong to the broader approved chapter. Gore defaults ON, with an OFF setting. Do not reopen those decisions or claim those systems are already complete.

Your contribution is the environment foundation, not the whole chapter. Evoke unease through readable sightlines, occluded thresholds, irregular domestic spaces and restrained lighting. Darkness must not make navigation illegible. Do not add a lore rewrite, scripted NPC combat, magic, gore, sound propagation or a new progression system here.

## VERIFIED BASE AND WORKSPACE ISOLATION

Codex's active worktree — read-only to you:

`C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/runtime-foundation`

Codex branch: `codex/vadstena-runtime-foundation`.

Start from this exact accepted commit, not its changing working directory:

`20d9cf5c7578656f59bebfaf5b5594145971f1ff`

That commit includes the playable Grip courtyard, bounded two-segment physical arm lab and accepted atomic native-trace core. Fresh coordinator typecheck + native tests passed **113/113** on this base. Subsequent arm trace wiring is being reviewed separately and is not needed by your environment task. Old full-browser acceptance was 13/13 on the earlier arm baseline; it is not a fresh browser result for this base. The old Windows build is older still.

Your proposed branch: `codex/environment-blockout`.

Your proposed worktree:

`C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/environment-blockout`

This handoff does **not** claim that branch/worktree or its dependencies have already been created. If Claude Code provides native worktree creation, use it with the exact base and verify the result. Otherwise use the commands below. These are PowerShell commands; all shell commands must start with `rtk` per the user's environment policy.

```powershell
rtk git -C 'C:/Users/simon.pettersson/OneDrive - Keyto Group/Dokument/Game1' rev-parse --show-toplevel
rtk git -C 'C:/Users/simon.pettersson/OneDrive - Keyto Group/Dokument/Game1' cat-file -t 20d9cf5c7578656f59bebfaf5b5594145971f1ff
rtk git -C 'C:/Users/simon.pettersson/OneDrive - Keyto Group/Dokument/Game1' worktree list
rtk git -C 'C:/Users/simon.pettersson/OneDrive - Keyto Group/Dokument/Game1' branch --list codex/environment-blockout
rtk proxy powershell -NoProfile -Command "Test-Path -LiteralPath 'C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/environment-blockout'"
```

Proceed only if the object is a commit, the named branch is absent and `Test-Path` is False. If either exists, inspect its branch, HEAD and dirtiness; do not overwrite, reset, reuse another writer's checkout or delete it. Ask for coordination if ownership is unclear.

```powershell
rtk git -C 'C:/Users/simon.pettersson/OneDrive - Keyto Group/Dokument/Game1' worktree add -b codex/environment-blockout 'C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/environment-blockout' 20d9cf5c7578656f59bebfaf5b5594145971f1ff
rtk git -C 'C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/environment-blockout' rev-parse --show-toplevel
rtk git -C 'C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/environment-blockout' branch --show-current
rtk git -C 'C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/environment-blockout' rev-parse HEAD
rtk git -C 'C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/environment-blockout' status --short
rtk proxy node --version
rtk proxy npm --prefix 'C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/environment-blockout/game' ci
rtk proxy npm --prefix 'C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/environment-blockout/game' run check
```

Node must satisfy the checked-in `>=24.12.0 <25` constraint. Use the lockfile; do not upgrade dependencies or share/symlink Codex's node_modules. `npm ci` is setup in your new worktree only, not an instruction to run Electron or an executable. If setup triggers an endpoint-protection warning, stop that action; never change Defender settings, restore quarantined files or infer a false positive. Baseline failures must be documented before changes; do not silently lower gates.

Set all subsequent command working directories explicitly to your new worktree or its `game` directory. A branch alone does not isolate files if both sessions use the same checkout. The worktrees share Git object storage and repository configuration, so do not change shared remotes/config, prune worktrees or delete branches.

## READ THESE FIRST

Read within your new worktree, in order:

1. Applicable `AGENTS.md` and `C:/Users/simon.pettersson/.codex/RTK.md`.
2. `docs/superpowers/specs/2026-09-05-vadstena-chapter-design.md` — approved design. Later explicit user choices recorded in this handoff include the working title and PC priority.
3. `docs/research/deep-research/2026-09-08/README.md`, then the executive summary and backlog files it actually links. Do not guess filenames.
4. `docs/research/deep-research/2026-09-08/history-environment.md` in full, plus `design-story.md` for context. Distinguish proposed tuning/beats from accepted requirements.
5. `game/README.md`, `game/package.json`, `game/vite.config.ts` and `game/.gitignore`.
6. `game/src/content/yardLayout.ts`, `game/src/physics/yard.ts`, `game/src/runtime/fixedStep.ts`, existing input/render modules and browser tests for their real public interfaces and lifecycle patterns. These files are reference-only for this assignment.

Older `.continue-here.md` and team-state sections describe Codex's evolving work, not permission to take over physics. The committed base may contain an older continuation header. This handoff's pinned base and ownership rules take precedence for your assignment. Never edit the user-owned research `work/` cache in another checkout.

## FILE OWNERSHIP AND INTEGRATION CONTRACT

You may create and edit only the following new namespace:

- `game/src/content/environment/**` — provenance, phases, blockout data, collision layout and route definitions.
- `game/src/render/environment/**` — scene builders, materials and explicit resource disposal.
- `game/src/lab/environmentLab.ts` and `game/src/lab/environmentLab.css`.
- `game/environment-lab.html` — dev-only entry.
- `game/tests/environment*.test.mjs` and `game/browser/environmentLab.spec.mjs`.
- `docs/environment/**` — plan, source ledger, measurements, decisions and final handoff.

Default to self-authored procedural geometry/materials. No new files under `game/public/` in this increment: Vite can copy public assets even when the dev HTML is excluded. If a real asset becomes necessary, propose rights and production-exclusion handling before widening ownership.

Everything else is read-only, notably `physics/**`, existing runtime/input/settings, `main.ts`, yard layout/view, all arm-lab files, dependencies/lockfile, Vite configuration, desktop/Electron files, shared status/README and this handoff. If a shared interface is insufficient, document the exact minimal requested change in `docs/environment/integration-requests.md`; do not implement it in Codex's files or copy the entire runtime to bypass ownership.

Existing reusable contract, verified at the pinned base:

- `createYard({ layout?: readonly BodyDefinition[], spawn?: Vec3, crouched?: boolean })` accepts your own layout.
- `BodyDefinition`: unique `id`, `shape`, `position`, optional `rotation`, `color`, optional `mass`. Shapes: box full-size tuple, ball radius, cylinder radius/height. No mass means static; mass means dynamic. Reserve `player` for the runtime.
- Coordinates: metres, Y up, forward -Z. Return finite transforms and positive dimensions, with deterministic unique IDs.
- `yard.step(intent, optionalGripCommand)` advances the existing 1/60 simulation. Reuse `createFixedStepper`; render must never create extra physics steps or write object poses back into Rapier.
- `snapshot()`, `counts()`, `releaseGrip()` and idempotent `destroy()` provide lifecycle boundaries. Use real player capsule movement, not a camera pretending to collide.
- Structural render geometry and collision descriptors must come from the same environment data. Smooth colliders beneath small decorative cobbles are intentional; walls, stairs, large stones and passage openings need matching meaningful collision.

Keep environment geometry out of the main production import graph. No changes to ordinary `/vadstena/` or `/vadstena/arm-lab.html`. Proposed independent preview: `http://127.0.0.1:5175/vadstena/environment-lab.html`, with strict port checking. Your browser test starts and closes its own Vite server on 4182; existing tests use their own ports. Do not kill a process occupying a port. Use an alternative documented port if occupied. Run only one full browser suite at a time across worktrees; coordinate with Codex before that shared-port regression run.

## HISTORICAL NON-NEGOTIABLES

Use the research ledger for exact page/figure/source links; verify any newly needed source rather than inventing a citation. The following are deliberately uncertainty-aware:

- **Rådhuset:** medieval hall core is plausible; chronology differs between sources (1460 versus around 1490). The tower in 1510 needs an uncertainty label/alternative. Do not import the 1691 lantern or 1776 roof as medieval facts.
- **Rödtornet:** show S:t Per as a complete medieval church including its tower, not today's freestanding tower and school. Later choir alterations and the 1829 demolition are not the 1510 baseline. The quoted 42 m length is not a locked 1510 construction dimension.
- **Castle:** construction begins 1545; any castle form belongs to an explicitly separate time-fracture layer, not ordinary 1510. No empty modern castle park projected backwards.
- **Mårten Skinnares hus:** sources distinguish 1519/1587 phases and a 1520s attribution; today's house is not a securely dated 1510 object. Separate later phase only.
- **Klosterkyrkan:** use medieval components with a phase ledger; today's nineteenth-century silhouette is not the default medieval reconstruction. Modern measured drawings need historical filtering.
- The 1642 map reproduction and modern street network are not direct 1510 ground truth. Do not reproduce today's straight streets and open squares, then call medieval-looking facades a reconstruction.
- No verified continuous stone city wall. Distinguish churchyard/monastery enclosure, plot boundary, plank fence and possible ditch. Masonry is welcome where evidence or an explicit design hypothesis supports it.
- Use mixed packed earth, worn grass, stone patches and limited cobbles; no unsupported wall-to-wall cobblestone carpet. Vegetation species/placement and exact shore position remain hypotheses unless sourced.
- Avoid a known citation trap: ÖLM 2007:66 concerns Stora Torget in **Linköping**; comparative Vadstena illustrations do not license transferring Linköping measurements.
- Publicly readable PDFs/photos are not automatically reusable textures or marketing assets. Keep references as links unless the exact image/object rights are verified. AI imagery is never construction evidence.

Every landmark component and invented connective area needs metadata: `objectId`, `componentId`, `intendedYearOrPhase`, `evidenceClass`, `sourcePageFigure`, `measurementScope`, `uncertainty`, `designChange`, `rightsStatus`. Distinguish measured geometry, interpretation and gameplay invention. For invented dimensions use an explicit design record, not a fake source. Cite local research and original sources separately. Unknown rights stay unknown; no blanket open-source license declaration.

## IMPLEMENTATION AND ACCEPTANCE

First write a compact executable plan in `docs/environment/plan.md`, with the actual route layout, historical alternatives, ownership and test cases. The overall game direction is already approved; do not restart brainstorming or ask routine permission to begin this bounded work. Escalate material scope/ownership contradictions only.

Deliver a small, complete traversal prototype, not dozens of untested landmarks:

1. A connected route: Rådhus approach → constrained Storgata → physical passage and alternate alley → retreat-capable open space → S:t Per exterior. Two courtyards and two alleys may establish the route. Distances are authored for this blockout, not claimed historical measurements.
2. Six reusable modest house/plot variants, believable roof/ground junctions, readable thresholds, mixed surfaces and a few self-authored tree forms. Prioritize silhouettes, human scale and composition before decorative density.
3. Rådhus and whole S:t Per as phase-tagged blockout silhouettes. Other three landmark IDs may exist as documented future anchors, not five fully modeled buildings or misleading skyline placements.
4. A minimal PC walkable dev lab with mouse look, visible start/pause/restart recovery and readable controls. A collapsed provenance panel is enough; no dashboard replacing the scene. Pointer-lock rejection must recover visibly, never bypass browser restrictions. Ordinary Chrome was user-confirmed working; embedded preview acceptance is separate.
5. Lifecycle: blur/visibility/pointer-unlock pause and clear pending input; context loss must stop simulation, restore resources safely and require explicit resume. Destroy listeners, renderer resources and owned Rapier world on teardown; ten resets must not accumulate canvases or resources.

Use TDD for content validation and route/collision behavior: observe the expected RED, implement the smallest GREEN and retain negative controls. Test unique IDs, finite dimensions/transforms, metadata/phase completeness, later buildings excluded from baseline, render/collision correspondence, real capsule traversal of the intended route and rejection at walls/blocked thresholds. A visual camera tour does not establish physical walkability.

Add a native route test that calls the existing owner with your layout and explicit movement commands; assert progress through named checkpoints, no wall tunneling, finite final state and clean destruction. Do not relax existing controller thresholds to make a bad layout pass.

Browser tests use the project's actual **Node test runner + Playwright library**, not an invented Playwright config. Inspect existing browser tests. Capture page errors, console errors and failed requests. Test controls, pause, restart, real WebGL loss/restore and unavailable-WebGL recovery proportionately to the new lab. Save screenshots under your own ignored `game/.playtest/environment/` and actually inspect them at 1440×900 and 1024×700. SwiftShader screenshots are visual evidence, not hardware FPS proof. Report renderer counts and any measured timing with its environment; do not invent performance claims.

Within your worktree's `game` directory:

```powershell
rtk proxy npm run check
rtk proxy node --test browser/environmentLab.spec.mjs
rtk proxy npm run build
rtk git diff --check
```

The browser test should build the normal production entry into its own ignored output directory and assert the environment HTML and a unique lab-only sentinel are absent from generated HTML/JS. No shared Vite configuration edit is needed for a dev-only HTML entry. Keep browser test cleanup in `finally`/after hooks. Do not run Windows packaging, Defender changes, dependency upgrades, deployment or the existing exe.

## HANDOFF BACK TO CODEX

Commit only your explicitly owned files, after verifying `git diff --name-only` against the allowlist. Never `git add .`, commit someone else's files, auto-merge, rebase Codex's branch, force-push or publish source/history. GitHub repository creation/publication is coordinated separately; local parallel work does not depend on it. Do not assume a public remote contains this pinned commit.

Write `docs/environment/handoff.md` and return:

- Base SHA, your branch/worktree, final commit SHA(s), exact changed-file list and diff summary.
- What is visibly/physically implemented versus authored hypothesis, stub and unverified acceptance.
- Exact commands/results, test counts, RED→GREEN cases and any pre-existing failures.
- Absolute screenshot paths and what you actually inspected; dev URL/port and process ownership if intentionally left running.
- Provenance/rights gaps and requested shared-file integration changes, if any.
- How Codex can review/cherry-pick your commit(s); do not perform that integration yourself.

Stop cleanly at this bounded deliverable. If asked to pause, stop owned active work, preserve files, mark interrupted checks non-passing and leave a concise restart point. Do not leave an unbounded background agent running.

Use one writer per worktree. If Simon uses both private and work Claude accounts, never point both at this branch/worktree. A second account may review read-only or needs its own explicitly non-overlapping assignment. Use a work account only if Simon confirms the project's use is permitted by his workplace; do not copy workplace secrets into this personal project.

## PACKAGE QUALITY

This package adapts the context-packager template to engineering: task, project context, concrete interfaces, prior evidence, constraints and return format. Research is linked for progressive reading rather than pasted wholesale. The supplied bundler was exercised in memory; the curated package was saved with apply_patch to preserve local editing policy. The supplied token counter (Python UTF-8 mode) estimates approximately 4,800 tokens, about 5% of its illustrative 100,000-token budget; this is a character-based estimate, not Claude billing or a verified account limit. Self-assessment: completeness 3/3, clarity 3/3, relevance 2/2, token efficiency 2/2 against that illustrative budget. This is a coordination quality check, not a guarantee of defect-free implementation. No specific Claude model or account context size is assumed.
