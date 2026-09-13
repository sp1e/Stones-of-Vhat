# Handoff to Codex — environment blockout (2026-09-13 16:10)

## Identity

| | |
|---|---|
| Worktree | `C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/environment-blockout` |
| Branch | `codex/environment-blockout` |
| Historical integration base | `20d9cf5c7578656f59bebfaf5b5594145971f1ff` |
| Code HEAD before this doc commit | `95f6260c49e08a07337d5e21d968dc750919b680` |
| Remote | `sp1e/Stones-of-Vhat`, own branch only (authority: `integration-requests.md`) |

Commits since the base, oldest first:

| SHA | Subject |
|---|---|
| `8099b7e` | docs: plan environment blockout workstream |
| `6ca01db` | feat: add phase-tagged environment blockout content and provenance |
| `9f783c4` | test: walk both environment routes with the real capsule |
| `9f155d8` | feat: render environment blockout from the collision data |
| `cf9a877` | fix: anchor tree trunks inside their crowns |
| `838f4ef` | test: sweep every checkpoint heading in a fresh world for ten seconds |
| `95f6260` | feat: add the dev-only walkable environment lab |
| *(this commit)* | docs: environment handoff, measurements, mutation runner, coordination receipts |

## Exact file list (all inside the allowlist; nothing under `game/public`; no shared file touched)

Code, 22 files, +2957 lines at `95f6260`:

- `game/src/content/environment/`: `types.ts`, `kit.ts`, `landmarks.ts`, `route.ts`, `provenance.ts`, `index.ts`
- `game/src/render/environment/`: `random.ts`, `materials.ts`, `geometry.ts`, `sceneBuilder.ts`, `view.ts`
- `game/src/lab/environmentLab.ts`, `game/src/lab/environmentLab.css`, `game/environment-lab.html`
- `game/tests/environmentContent.test.mjs`, `environmentRoute.test.mjs`, `environmentScene.test.mjs`
- `game/browser/environmentLab.spec.mjs`

Docs:

- `docs/environment/plan.md`, `source-ledger.md`, `decisions.md` (DR-01…DR-12), `measurements.md`
- `mutation-check.mjs`, `integration-requests.md`, `handoff.md`
- `restart-point.md` and `terminal-handover.md`, both marked HISTORICAL

## Implemented and physically verified

- **Route.** Rådhus approach → constrained Storgata. From there, two alternatives:
  - portik (2.6 m gateway) → west courtyard → lane
  - east alley with a bend

  Both lead to the open space (cart, timber stack, well, wall fragment) → churchyard gate with two autostep blocks → S:t Per north side. A real `createYard` capsule walks both routes through every named checkpoint without tunnelling: portik 1511 ticks / 105.5 m, alley 1368 ticks / 95.5 m. Facade, closed gate and churchyard wall reject the capsule, each with a removal negative control. The escape matrix covers 13 checkpoints × 12 headings × 10 s, each in a fresh world, with a fence-removal control.
- **Content.**
  - Six parametric house variants H1–H6, three tree forms, mixed surfaces (earth, grass, stone patches, cobbles under 8 %).
  - Rådhus hall plus tower in two hypotheses (partial by default, complete as an option).
  - Whole medieval S:t Per: west tower, nave, choir.
  - Castle, Mårten Skinnares hus and Klosterkyrkan exist only as provenance anchors without geometry.
  - The 1691 lantern and 1776 roof are later-phase only and excluded from the baseline.
  - Every element resolves one 9-field provenance record.
- **Render.** Render meshes and colliders come from the same element list: solid meshes equal collider bounds within 1 mm, render-only classes stay inside their promised envelopes, seeded detail is deterministic, and dispose releases every geometry, material and texture.
- **Lab (dev-only).** `http://127.0.0.1:<port>/vadstena/environment-lab.html`, with the lifecycle behaviour listed in commit `95f6260`. The normal production build excludes it (tested).

## Authored hypothesis, not verified fact

- All dimensions and distances are authored blockout metres (DR-01). Nothing is measured or georeferenced.
- Rådhus tower state in 1510: two hypotheses, neither asserted.
- S:t Per proportions (DR-03), house kit (DR-04), tree species and placement (DR-08), surfaces, street irregularity (DR-11) and lighting (DR-12) are design records.
- Bot traversal times are not play pacing. The 15–20 minute chapter target is not claimed.

## Final runs on the committed sources (2026-09-13, Node v24.16.0, Windows 11)

| Command (from `game/` unless noted) | Result |
|---|---|
| `rtk proxy npm run check` (typecheck + native) | **136/136 PASS** (15:45) |
| `rtk proxy node --test browser/environmentLab.spec.mjs` | **11/11 PASS**, 190 s (16:01) |
| `rtk proxy npm run build` | PASS; `dist` has no lab sentinel/content (15:46). Chunk-size warning comes from the main bundle, which predates this work. |
| `rtk git diff --check` (+ trailing-space scan of untracked files) | clean (15:46) |
| `rtk proxy node docs/environment/mutation-check.mjs --browser` (worktree root) | 22/22 entries killed (full run 21/22 plus the replaced entry killed; see `measurements.md`) |

No source files changed between these runs and the commits; only docs changed after 15:46.

RED→GREEN this session (details in `measurements.md`):

1. Floating tree crown.
2. Restart overwrote the graphics-lost message.
3. Frame failure left the world alive and kept RAF (`bodies: 108`).
4. Late pointer-lock rejection overwrote the terminal message.

Earlier sessions' TDD cases are in `plan.md` test cases 1–24 and the earlier commits.

## Independent reviews

- **TypeScript lifecycle reviewer** (read-only): one medium finding, the restart vs context-loss message. Fixed and tested.
- **SPEC reviewer** (read-only, new agent): contract, history and ownership PASS; findings E1 and E2 CLOSED.
  - Gaps it raised, all fixed: mutation record lagging, late rejection and teardown untested, stale doc claims, `plan.md` checkpoint list and scope line.
  - The teardown test was added after the code; its evidence is two mutations, not a RED run.
- **QUALITY reviewer** (read-only, fresh agent): APPROVE WITH FIXES, no critical or high findings. Both medium findings were in `mutation-check.mjs` and are fixed:
  - hard-kill restore: journal plus signal handler, verified by a simulated interrupted run
  - CRLF-tolerant matching
- Codex findings 1–3 and the `requestPlay` candidate: closed (`integration-requests.md`, 15:40 table).

## Screenshots actually opened

Directory `C:\Users\simon.pettersson\.config\superpowers\worktrees\Game1\environment-blockout\game\.playtest\environment\` (git-ignored).

| File (both `-1440x900` and `-1024x700` unless noted) | Inspected | Observation |
|---|---|---|
| `menu-*` | 14:08, 15:38 | Panel below corner label at 1024×700; readable controls; provenance collapsed |
| `view-radhus-approach-*` | 14:11 | Rådhus tower stub visible down Storgata; mixed earth/grass/cobbles |
| `view-storgata-north-*` | 14:11 | Compressed street, irregular facades, S:t Per tower as a landmark |
| `view-portik-east-*` | 14:11 | Lintel underside reads as dark planks, not black; exit framed on the courtyard |
| `view-courtyard-1-*` | 15:38 | Crown now sits on the trunk (floated before `cf9a877`) |
| `view-open-space-1440x900` | 15:38 | Whole church silhouette, wall, gate steps, open ground |
| `view-open-space-1024x700`, `view-church-gate-*` | 14:11 | Gate posts, path, nave door readable |
| `context-restored-1440x900` | 15:38 | "Grafiken är återställd. Klicka för att fortsätta." with enabled controls |

The images were regenerated at 16:01. Only the tree geometry changed since the 14:11 inspection, so the 14:11 inspections of the other views still apply.

**Visible limitations.** These are appropriate for a blockout, not final art:

- identical dark window voids
- regular masonry and slab tiling
- flat sky
- a thin, tall fruit-tree trunk that reads a little like a lollipop
- sparse domestic detail
- tactical sightlines checked only through the route and escape tests, not a player walkthrough

## Provenance and rights gaps

- Every source in `source-ledger.md` is **link-only, rights unknown**. No texture, photo or drawing was imported; all materials are procedural. Nothing is licensed.
- ÖLM 2007:66 (Linköping) is used only for comparison, never as a measurement.
- Page/figure citations marked unverified in the ledger stay unverified.

## Risks for integration

- `environmentLab.ts` imports shared `createYard`, `createFixedStepper` and `createBrowserInput`. A signature change there breaks the lab; the route test and browser spec will show it.
- Browser evidence is Chromium/SwiftShader only. Ordinary Chrome and hardware FPS are not certified by this delivery.
- `mutation-check.mjs` mutates real sources. Run it only as the sole writer in the worktree.
- The escape matrix adds about 32 s to `npm test`.

## Ports and processes

- The browser spec starts and stops its own Vite server on 4182 (strict).
- No preview server or background process is left running.
- 5175 is unused. Codex ports 5173 and 4178 were not touched.

## How to review and cherry-pick (Codex performs integration)

```powershell
rtk git -C <codex-worktree> fetch origin codex/environment-blockout
rtk git -C <codex-worktree> log --oneline 20d9cf5..origin/codex/environment-blockout
rtk git -C <codex-worktree> cherry-pick 8099b7e^..<doc-commit>
```

The commits touch only the new namespace, so they should apply cleanly on top of newer runtime work. Rerun `npm run check` and the environment browser spec after integration.

## Integration requests

None. The existing `createYard`/`BodyDefinition`/`createFixedStepper`/`createBrowserInput` contract was sufficient.
