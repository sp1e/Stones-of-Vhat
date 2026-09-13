# Environment blockout — executable plan

Workstream: Claude Code, parallel to Codex. Handoff contract: local file
`runtime-foundation/docs/handoffs/2026-09-13-claude-environment-workstream.md` (not in this branch).

| Item | Value |
|---|---|
| Base | `20d9cf5c7578656f59bebfaf5b5594145971f1ff` (verified: object type `commit`) |
| Branch / worktree | `codex/environment-blockout` · `.config/superpowers/worktrees/Game1/environment-blockout` |
| Node | v24.16.0 (constraint `>=24.12.0 <25`) |
| Baseline before changes | `npm ci` 308 packages, 0 vulnerabilities · `npm run check` **113/113 pass**, 0 fail |
| Dev preview (proposed) | `http://127.0.0.1:5175/vadstena/environment-lab.html`, strict port |
| Browser test port | 4182 (own Vite server, closed in `after`) |

## 1. Scope

A small, complete, PC-only traversal prototype. Not the chapter, not final art.

In: connected route, six house variants, mixed surfaces, three tree forms, Rådhus and whole S:t Per as
phase-tagged silhouettes, three documented future landmark anchors without geometry, walkable dev lab,
lifecycle hardening, provenance metadata, native and browser tests.

Out: NPCs, magic, Grip wiring, gore, sound propagation, progression, lore changes, dynamic props,
assets under `public/`, edits outside the owned namespace, Windows packaging, merge, publication.

## 2. Ownership (write allowlist)

```
game/src/content/environment/**      data, provenance, phases, routes, validation
game/src/render/environment/**       scene builder, procedural materials, view, disposal
game/src/lab/environmentLab.ts|.css  dev lab
game/environment-lab.html            dev-only entry
game/tests/environment*.test.mjs     native tests (picked up by `npm test`)
game/browser/environmentLab.spec.mjs browser test
docs/environment/**                  plan, ledger, decisions, measurements, handoff
```

Read-only reuse by import (no edits): `createYard`, `BodyDefinition`/`Shape`/`Vec3`, `createFixedStepper`,
`createBrowserInput`. Any shortfall goes to `docs/environment/integration-requests.md`.

## 3. Data model

One element list is the single source for both collision and render.

```ts
EnvironmentElement {
  id                // unique; equals the Rapier body id when collision === 'solid'
  objectId, componentId   // key into the provenance record
  collision: 'solid' | 'overhead' | 'surface' | 'inset'
  geometry: box | cylinder | gable-roof | pyramid-roof | plane | crown | cobble-patch
  position, yaw?, material
}
```

| Collision class | Meaning | Enforced invariant (test) |
|---|---|---|
| `solid` | walls, plinths, steps, fences, gates, trunks, well, cart | emits one `BodyDefinition` with identical id, size, position, rotation |
| `overhead` | roofs, tree crowns | bottom ≥ 2.4 m above local ground or rests on a solid top; standing eye ≈ 1.47 m, jump apex eye ≈ 2.31 m |
| `surface` | earth/grass/stone patches, cobbles | top ≤ 0.03 m above local ground (smooth collider underneath is intentional) |
| `inset` | doors, windows, battens | bounds lie inside a solid expanded by ≤ 0.05 m, so no fake opening looks passable |

Provenance record (one per `objectId/componentId`): `objectId`, `componentId`, `intendedYearOrPhase`,
`phase { layer: 'baseline-1510' | 'later-phase' | 'time-fracture', fromYear?, toYear? }`,
`evidenceClass: 'documented' | 'interpretation' | 'gameplay-invention' | 'measured'`,
`sourcePageFigure` (ledger IDs + page/figure), `measurementScope`, `uncertainty`, `designChange`
(decision IDs `DR-nn`), `rightsStatus`. No blockout dimension is measured; `measured` stays unused and
is guarded.

## 4. Route layout (authored blockout metres, not historical measurements)

World frame: metres, Y up, route runs toward −Z. Not georeferenced; compass alignment is not claimed.
Ground top y = 0; churchyard plateau top y = 0.45.

```
z  52 ─ fence ───────────────────────────────────────────────
      A  RÅDHUS APPROACH   spawn (0, 46)     [Rådhus hall x10..21, tower stub x5..10]
z  29 ─────────── Storgata mouth x −3..3 ──────────────────────
      B  STORGATA  width ≈5.2–6.0 m, irregular facades ±0.4 m, small yaw
         W1 H2 · W2 H4 · W3 H5 PORTIK (z≈11) · W4 H6    E1 H3 · gap→COURTYARD 2 · E2 H6 · E3a H1 · E3b H4
         COURTYARD 1 (x −22..−11, z 16..−2) tree, well     COURTYARD 2 (x 9..17, z 29..10) tree, CLOSED GATE
z  −1 ─ S1a H2 · S1b H3 close the street (dead end) ──────────
      route P: portik → Courtyard 1 → LANE W (2.2 m) ↓        route A: ALLEY E (2.2 m, turns south, 1.9 m) ↓
z  −8 ────────────────────────────────────────────────────────
      C  OPEN SPACE x −24..14, z −8..−29.7  cover: cart, timber stack, well, wall fragment; 3 exits
z −29.7 churchyard wall, 3 m gate, two 0.15 m steps up to plateau 0.45 m
      D  S:T PER  west tower (Rödtornet, medieval) x −20..−11 · three-aisled nave x −11..16 · choir x 16..25
z −80 ─ enclosure wall ────────────────────────────────────────
```

Named checkpoints: `radhus-approach`, `storgata-north`, `storgata-narrows`, `portik-east`, `portik-west`,
`courtyard-1`, `lane-west`, `alley-mouth`, `alley-bend`, `open-space`, `church-gate`, `st-per-north`.
Two waypoint routes share the start and the end: **P** (portik + lane) and **A** (alley).

House variants (parametric): H1 booth (1 storey, eaves to street) · H2 gable-timber (1½ storeys, gable
to street) · H3 stone ground floor + timber upper (2 storeys) · H4 narrow gable with lean-to ·
H5 portik house (2.6 m wide × 2.6 m high gateway) · H6 low workshop with side shed volume.
Each: plinth solid, wall solid, roof overhead, door/window insets, threshold step solid (≤ 0.15 m).

## 5. Historical alternatives carried in data

| Object | Baseline 1510 rendering | Alternative / excluded |
|---|---|---|
| Rådhuset | hall core; **tower hypothesis `partial`** (walls begun) by default | `complete` tower variant selectable; lantern 1691 and roof 1776 = `later-phase`, excluded |
| S:t Per | whole church: west tower (Rödtornet), three-aisled nave, choir | choir alteration 1576, demolition 1829, freestanding tower + school = `later-phase`, excluded; 42 m not used |
| Vadstena slott | no geometry, unplaced anchor | `time-fracture` layer, from 1545 |
| Mårten Skinnares hus | no geometry, unplaced anchor | 1519 / 1587 / 1520s phases in ledger only |
| Klosterkyrkan | no geometry, unplaced anchor | medieval roof/bell-tower phase after 1455 noted; 19th-century silhouette excluded |
| Ground | mixed earth, worn grass, stone patches, limited cobble patches | no wall-to-wall cobbles |
| Enclosures | churchyard wall; plank plot fences; one closed plank gate | no city wall; ditch not modelled |

## 6. Test cases (TDD: RED observed before each GREEN)

Native `tests/environmentContent.test.mjs`
1. Element ids unique; every transform finite; every size positive; deterministic (two builds deep-equal).
2. Every element resolves a provenance record; every record has all nine fields non-empty.
3. Every `S-*`/`L-*` source id resolves in `docs/environment/source-ledger.md`; every `DR-nn` in `decisions.md`.
4. Guard: ÖLM 2007:66 (Linköping) is never a measurement source; no record claims `measured`.
5. Baseline excludes every `later-phase`/`time-fracture` element; negative control: the catalogue *does*
   contain the 1691 lantern element and it disappears only from the baseline build.
6. Tower hypotheses: both build valid; body sets differ only in `radhuset/tower` components.
7. Collision classes: solid ↔ body identity; overhead/surface/inset invariants from §3.
8. Landmark anchors: slott, Mårten Skinnares hus and Klosterkyrkan have records but zero elements.

Native `tests/environmentScene.test.mjs` (Three.js in Node, no WebGL)
9. Scene meshes tagged with element ids; solid mesh world bounds equal body bounds within 1 mm.
10. `dispose()` releases every geometry/material/texture it created; ten builds do not grow counts.

Native `tests/environmentRoute.test.mjs` (real `createYard` capsule)
11. Routes P and A reach every named checkpoint in order within a tick budget, via steering commands only.
12. Per tick: finite state, displacement ≤ sprint step + ε, capsule centre never inside a solid footprint.
13. Walking into a facade, the churchyard wall and the closed courtyard gate is rejected; negative
    control: the same walk with that single blocker removed passes through.
14. Churchyard steps are climbed by autostep, ending grounded on the plateau (y ≈ 1.31).
15. Escape sweep: from each checkpoint, 12 headings × 10 s stays inside map bounds.
16. `destroy()` returns counts to zero.

Browser `browser/environmentLab.spec.mjs` (Node test runner + Playwright library, SwiftShader)
17. Lab boots with sentinel, one canvas, no page/console/request errors; start → pointer lock → W moves.
18. Esc / blur / pointer unlock pause; tick frozen; held key cleared across resume.
19. Rejected pointer lock stays paused with a visible message and an enabled start button.
20. Ten restarts: identical physics counts and GPU resource counts, one canvas.
21. Real `WEBGL_lose_context`: simulation stops, controls disabled; restore → resources back, resume explicit.
22. Unavailable WebGL: clear reload recovery, no canvas, no frame loop.
23. Production build into `.playtest/environment/production`: no `environment-lab.html`, no lab sentinel,
    no environment content ids in generated HTML/JS.
24. Screenshots at 1440×900 and 1024×700 under `game/.playtest/environment/`, inspected by eye.

## 7. Order of work

1. Ledger + decisions (IDs the tests resolve) → content RED/GREEN (1–8).
2. Scene builder RED/GREEN (9–10).
3. Route RED/GREEN (11–16); record measured walk times in `measurements.md`.
4. Lab + view; browser RED/GREEN (17–23); screenshots and inspection (24).
5. Full gate: `npm run check`, `node --test browser/environmentLab.spec.mjs`, `npm run build`,
   `git diff --check`; allowlist check on `git diff --name-only`; local commits; `handoff.md`.

The full shared browser suite (ports 4173/4174/4178/4180) is **not** run by this workstream without
coordination with Codex.
