# M1A playable courtyard — verification results

Date: 2026-09-05

Target: local PC browser prototype at `/vadstena/`

Branch: `codex/vadstena-runtime-foundation`

## Outcome

The M1A courtyard is playable in Chromium with an actual Three.js render, Rapier-owned 1/60 simulation, pointer-lock first-person input, pause/focus gates, persisted gore preference, clean world restarts, and a reload recovery state for WebGL context loss. The visual world is deliberately a technical yard, not a historical reconstruction.

Windows `.exe` packaging is not part of this implementation. The browser runtime keeps simulation, view, input, and DOM UI boundaries separate so a later desktop wrapper does not need to rewrite the game loop.

## TDD evidence

RED was observed before production browser files existed:

- `rtk proxy node --test game/browser/yard.spec.mjs` failed because the desktop acceptance test could not find the required `#start` UI.
- `rtk npm --prefix game run check` reported 30 passing native tests and the new scripts-contract test failed with the exact four missing scripts: `dev`, `build`, `preview`, and `test:browser`.
- After the first green implementation, the production-preview test found a real dev-hook leak: `typeof window.__yard` was `function`, not `undefined`. The regression test stayed red until Vite's serve/build boundary explicitly defined diagnostics on dev serve only.
- A later independent review reproduced a BFCache lifecycle bug in full Chromium: actual `pagehide.persisted=true` and `pageshow.persisted=true` restored the already-disposed document with zero canvas and dead controls. A dedicated regression stayed red on that missing canvas until a persisted restore triggered a real reload.

Final GREEN:

- `rtk npm --prefix game run check`: 31/31 tests passed, including strict TypeScript checking.
- `rtk npm --prefix game run build`: Vite 8.2.2 production build passed; nested asset URLs use `/vadstena/`.
- `rtk npm --prefix game run test:browser`: 5/5 Chromium tests passed in 31.7 seconds.

## Browser acceptance exercised

- Trusted click acquired pointer lock before `running` became true.
- Holding W for at least 35 measured simulation ticks moved the player more than one metre toward negative Z; this is not a screenshot-only movement claim.
- Escape paused simulation and the tick remained unchanged over 160 ms.
- A synthesized `window.blur` boundary event while W was physically held paused the game and cleared held movement before resume.
- Gore was expanded, disabled, reloaded, and remained false from local storage.
- Ten guarded restarts reused one canvas and one renderer, stayed paused, and preserved the exact world/GPU counts.
- A rejected pointer-lock promise stayed paused and displayed actionable Swedish recovery text without an unhandled page error.
- Actual `WEBGL_lose_context` forced the fatal recovery surface, disabled start, stopped running, and revealed `Ladda om sidan`.
- A real production preview served `/vadstena/` without failed HTTP resources and without `window.__yard`.
- A separate production preview on port 4180 used full Chromium with BFCache enabled, navigated between `127.0.0.1` and `localhost`, and returned with real persisted lifecycle flags. The disposed cached page reloaded into one fresh canvas, paused ready controls, persisted gore false, and working pointer lock.
- Desktop resize from 1440×900 to 1024×700 updated the canvas to the viewport.
- Page errors, console errors, failed requests, and HTTP responses ≥400 were collected and asserted empty in each flow.

Baseline after two animation frames:

- Rapier: 21 bodies, 21 colliders.
- Three renderer: 20 geometries, 4 textures, 3 programs.
- After 10 restarts: the same counts, one canvas, paused, and persisted gore false.

## Visual review

- `game/.playtest/desktop-menu.png`: 1440×900 ready menu. The left card stays below half the viewport width; warm stone/brass controls remain legible over the desaturated yard.
- `game/.playtest/desktop-play.png`: pointer-locked play state. Only two sparse top labels and a small central reticle remain; the stairs, ramp, low passage, props, floor pattern, silhouettes, and shadows are readable without dashboard chrome.

Both screenshots were opened at original resolution and visually inspected after the final browser run.

## Runtime used and limits

- Node 24.16.0, npm 11.13.0.
- Three 0.185.1, Rapier compat 0.20.0, TypeScript 7.0.2, Vite 8.2.2, Playwright 1.63.0.
- Chromium 153.0.8010.12 with `ANGLE / Vulkan / SwiftShader Device (Subzero)` software rendering.
- No frame-rate or hardware-performance claim is made. Headless SwiftShader proves rendering and lifecycle correctness, not GPU performance on a player's machine.
- The production JavaScript chunk is 3,390.54 kB minified / 1,231.70 kB gzip because the approved Rapier compatibility package ships its runtime payload in the browser bundle. Vite emits its standard >500 kB advisory; this does not fail the build but is a future load-time optimization target.
- Current scope is PC keyboard and mouse. Mobile/touch UX was explicitly deferred.
- Grip, projectiles, NPCs, combat, ragdoll, gore graphics, historical world assets, and Windows `.exe` packaging remain unimplemented.
- Codacy MCP was unavailable in this environment; no substitute scanner was installed.
