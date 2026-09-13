# Measurements — environment blockout

Only values produced by running code are listed. Blockout dimensions themselves are authored (DR-01), not
measured. Browser and renderer numbers come from the lab browser test (see below).

## Native capsule route walk

Source: `game/tests/environmentRoute.test.mjs`, test "the real capsule walks both routes…". Real
`createYard` capsule, walking speed 4.2 m/s, fixed 60 Hz steps, steering toward waypoints with
`forward: 1` only (no teleport). Node v24.16.0, Windows 11, 2026-09-13.

| Route | Path | Ticks | Seconds | Horizontal metres |
|---|---|---|---|---|
| portik | Rådhus approach → Storgata → portik → courtyard 1 → lane → open space → gate → S:t Per north | 1511 | 25.2 | 105.5 |
| alley | Rådhus approach → Storgata → east alley → open space → gate → S:t Per north | 1368 | 22.8 | 95.5 |

Both end grounded on the churchyard plateau at capsule centre y ≈ 0.45 + 0.86. These are steering-bot
times in straight segments, not human play time; the chapter target of 15–20 minutes is content pacing
(L-DESIGN-STORY §3), not something this blockout claims to fill.

## Collision behaviour observed

| Case | Result |
|---|---|
| Walk into Storgata W4 facade for 2 s | stopped at x > −2.45 (plinth face −2.62 plus capsule radius) |
| Same walk with W4 bodies removed (negative control) | passed to x < −5 |
| Walk into closed courtyard-2 gate for 1.5 s | stopped at x < 16.7 |
| Same walk with only the gate removed (negative control) | passed to x > 18 |
| Walk into churchyard wall | stopped at z > −29.45 |
| Walk through the gate | climbed both steps and the plateau edge by autostep; grounded at y within 0.05 of 1.31 |
| Escape sweep: 13 checkpoints × 12 headings; each run a fresh `createYard`, 20-tick settle, 600 fixed sprint steps (10 s); finite + bounds checked every 5 ticks incl. tick 599 | 156/156 stayed inside map bounds (32.2 s) |
| Same heading toward the north fence with `fence-approach-north` removed (negative control, permanent test) | escaped |

The earlier sweep (7 s per heading, each heading continuing from the previous endpoint, one world per checkpoint)
was replaced on 2026-09-13 14:30 after Codex review; it is not evidence for the independent 10 s matrix.

## Mutation checks (tests must fail when the layout is wrong)

Retained and re-runnable: `docs/environment/mutation-check.mjs`. It checks each snippet is present exactly once
(LF-normalized, so a CRLF checkout still matches), journals the original bytes to the ignored
`game/.playtest/environment/mutation-journal/` before mutating, runs the named test, and restores and verifies the
original bytes. An interrupted run is repaired at the start of the next run, and SIGINT/SIGTERM between tests restore
immediately. **KILLED** means a non-zero exit *and* the named test reported failing; the first assertion line is
quoted below.

Commands (from the worktree root):
- `rtk proxy node docs/environment/mutation-check.mjs --browser` (all entries)
- `... --browser --only "<name substring>"` (selected entries)

Runs on 2026-09-13, Node v24.16.0, Windows 11, working tree on top of `cf9a877`, final sources:

- **15:47–15:53 full run: 21/22 killed.** The survivor was an *equivalent* mutation: removing only the catch guard
  in `requestPlay` cannot change the failure message, because `idleMessage()` independently keeps the terminal text.
- A separate `--only` run of the second single-guard variant (removing only `idleMessage`'s failure precedence) also
  survived, for the mirror reason. Both single-guard variants were then replaced by one entry that removes both guards.
- **15:58 `--only "both guards removed"` run: killed.**
- **Result for the retained runner: 22/22 entries killed.**
- **Crash-recovery check.** Before the full run I left `kit.ts` mutated (`TRUNK_INTO_CROWN = 9`) with a journal
  entry. The run printed `RESTORED src/content/environment/kit.ts from an interrupted earlier run`, and `kit.ts`
  SHA-256 was identical before and after (`b8b78b75e64a691f…`).

| Mutation | Test file | Assertion that killed it |
|---|---|---|
| fruit-tree crown lowered into reach | content | `courtyard-1-tree-crown overhead bottom 1.9 is within reach` |
| door inset protrudes 0.2 m | content | `approach-w1-openings-1 inset is not contained by a solid` |
| 1691 lantern moved into the baseline | content | `negative control: the 1691 lantern must exist in the catalogue` |
| bodies drop yaw rotation | content | `Expected values to be strictly deep-equal` (body transform list) |
| cobble patch enlarged to a carpet | content | `cobble share 1254.32` |
| lane blocked by a fence | route | `portik: stuck before {"x":-16.9,"z":-9.5}` |
| W4 house rendered but its colliders dropped | route | `capsule inside storgata-w4-plinth` |
| approach north fence removed from the layout | route | `Expected values to be strictly deep-equal` (non-empty escape violation list) |
| gate step raised to 0.45 m | route | `gate passage z=-28.94` |
| render box swaps width and depth | scene | `site-ground x: render -75..77 vs collider -40..42` |
| render ignores element yaw | scene | `approach-w1-plinth x: render -13.88..-9.12 vs collider -14.10..-8.90` |
| crown blobs pushed outward | scene | `courtyard-2-tree-crown crown z` |
| scene dispose forgets materials | scene | `released 216 of 246` |
| tree trunks cut short (floating crowns) | scene | `courtyard-1-tree-crown floats: trunk top 1.50 below crown underside 3.22` |
| tree trunks poke through their crowns | scene | `courtyard-1-tree-trunk pokes through its crown: 5.25 vs crown top 4.57` |
| terminal failure keeps lab listeners | browser | `lab listeners are aborted` |
| frame loop reschedules after a terminal failure | browser | `no frames are scheduled after a terminal failure` |
| restart overwrites the graphics-lost message | browser | `the finished restart must not claim the lab is ready` |
| late lock rejection ignores a terminal failure (both guards removed) | browser | `frame-failure: the late rejection must not replace the message` |
| late lock rejection ignores a lost context | browser | `context-loss: the late rejection must not replace the message` |
| late lock rejection ignores teardown | browser | `a rejection after teardown must not touch the panel` |
| teardown keeps the renderer | browser | `renderer canvas released` |

The lantern mutation is caught by the test's negative control rather than by the baseline-exclusion assertion
itself; both are in the same named test.

RED→GREEN cases written first this session:

- `courtyard-1-tree-crown floats: trunk top 2.20 below crown underside 3.22` — the courtyard screenshot.
- `the finished restart must not claim the lab is ready` — TypeScript reviewer finding.
- `the owned physics world is destroyed` (`bodies: 108` after a frame failure) — Codex finding 2.
- `frame-failure: the late rejection must not replace the message` — Codex sync candidate.

The teardown test was written after the teardown code (SPEC gap); its evidence is the two teardown mutations above,
not a RED run. Earlier tables (scratch scripts, before 14:30) and the 14:37 18/18 run are superseded by these runs.

## Browser lab: renderer counts

Source: `game/browser/environmentLab.spec.mjs`, test "route views at 1440×900 and 1024×700 with renderer counts",
`game/.playtest/environment/renderer-report.json` written 2026-09-13 15:38. Environment: Chromium headless,
SwiftShader (software WebGL), Windows 11, via Playwright. **Not hardware performance.** Ticks/s is fixed-step
simulation progress measured over 1.5 s while SwiftShader renders; a value below 60 means software rendering
throttled the frame loop, not a game frame-rate claim. Draw calls and triangles depend on what the camera sees.

| View (1440×900) | Zone label | Sim ticks/s | Draw calls | Triangles drawn | GPU geometries | GPU textures | Programs |
|---|---|---|---|---|---|---|---|
| radhus-approach | Rådhusansats | 60.3 | 318 | 28806 | 211 | 17 | 5 |
| storgata-north | Storgatan norr | 50.7 | 298 | 18212 | 199 | 16 | 5 |
| portik-east | Portikens gatumynning | 55.0 | 186 | 9966 | 186 | 16 | 5 |
| courtyard-1 | Västra gården | 60.4 | 178 | 14228 | 170 | 16 | 5 |
| open-space | Öppen plats | 59.8 | 166 | 10738 | 149 | 12 | 4 |
| church-gate | Kyrkogårdsporten | 60.1 | 158 | 10676 | 143 | 11 | 4 |

Scene (every view): 216 meshes, 3 instanced cobble meshes, 26 398 authored triangles, 14 procedural textures.
Ten restarts at one fixed spawn keep physics counts and GPU geometries/textures/programs identical (test "ten restarts…").

## Test cost

`environmentRoute.test.mjs`: the independent escape matrix takes 32.2 s on this machine.
