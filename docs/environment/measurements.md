# Measurements — environment blockout

Only values produced by running code are listed. Blockout dimensions themselves are authored (DR-01), not
measured. Browser and renderer numbers are added after the lab test runs.

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
| Escape sweep: 13 checkpoints × 12 headings × 7 s sprint | stayed inside map bounds |

## Mutation checks (tests must fail when the layout is wrong)

Run from a scratch script that edits one source line, runs the named test and restores the file.

| Mutation | Test | Outcome |
|---|---|---|
| fruit-tree crown lowered into reach | content: collision classes | failed as expected |
| door inset protrudes 0.2 m | content: collision classes | failed as expected |
| 1691 lantern record moved into baseline | content: baseline exclusion | failed as expected |
| bodies drop yaw rotation | content: collision classes | failed as expected |
| cobble patch enlarged to a carpet | content: route content | failed as expected |
| lane blocked by a fence | route walk | failed: stuck before lane exit |
| W4 house rendered but its colliders dropped | facade rejection | failed: capsule inside `storgata-w4-plinth` |
| approach north fence removed | escape sweep | failed (non-zero exit; assertion text not captured) |
| gate step raised to 0.45 m | churchyard steps | failed (non-zero exit on the plateau assertion) |
| render box swaps width and depth | scene: solid meshes equal colliders | failed as expected |
| render ignores element yaw | scene: solid meshes equal colliders | failed as expected |
| crown blobs pushed outward | scene: render-only envelopes | failed as expected |
| scene dispose forgets materials | scene: dispose releases resources | failed as expected |

## Test cost

`environmentRoute.test.mjs` takes about 38 s on this machine, of which the escape sweep is about 35 s.
