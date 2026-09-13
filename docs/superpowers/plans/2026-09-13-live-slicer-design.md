# Live Slicer laboratory — dependent controller/UI direction

Coordinator design preparation while the owner-batch writer works. **Not an accepted controller, visible spell or damage system.** The companion executable `2026-09-13-live-slicer-plan.md` has independent contract PASS; finish the batch dependency before its sole writer starts. This extends the accepted chapter/B02a direction without a new product-approval checkpoint.

## Play intent and visual language

Stones of Vhat is a dark medieval magic-and-sword FPS with physical consequences and default-on optional gore. This isolated development view is a fixed-camera contact experiment, not the finished first-person encounter or a cosmetic gore demonstration. The verbs here are start/pause, physical handoff, select a horizontal/vertical blade, cast, and inspect the actual recorded result.

Use the game-ui-frontend skill's WebGL world + DOM text hierarchy, thematic CSS variables, restrained motion and protected playfield. Its generic mobile requirement is explicitly overridden by Simon's locked **PC keyboard/mouse only** request. No touch controls, mobile breakpoint project, new framework/font/network asset or renderer stack change.

- Material language: existing dark pine/stone and worn-brass controls, with a pale cold Slicer plane. Keep copper arm proxies and familiar COM/anchor markers visibly diagnostic. No fake flesh decals to imply severing.
- Typography: retain the deliberate serif heading and compact UI text; shorten the development heading instead of adding another hero panel. Use Swedish player-facing labels and tabular numerals for times/work counters.
- Palette: existing theme variables plus a restrained pale contact/trail accent and amber uncertainty. Do not use gore-red as a generic success indicator. Color is supplementary to explicit text/status.
- Camera/control: current fixed camera, **no pointer lock or drag-look added to this lab**. All pointer-driven controls remain standard DOM. Future FPS integration uses the actual game input/camera owner, not this diagnostic UI.
- Motion: crisp state changes; actual cast geometry obeys fixed simulation time. A brief optional afterimage may explain the path but must be presentation-only and reduced-motion-aware. Do not slow physics or move historical anatomy just to make a shot visible.

Persistent UI should remain one compact edge control cluster. Keep the central/lower-middle playfield unobstructed. Casting controls/status precede metrics; long contact records and native history remain collapsed, with no two large inspectors open by default. At1440×900 and1024×700, preserve an immediately visible cast/pause/reset action and readable labels; aim for at least75% unobscured playfield in the normal collapsed PC view. Opening a deliberate technical inspector can be denser, but test its actual layout instead of inheriting the older sidebar fit.

## Truthful boundary-born shot evidence

Independent read-only orchestration tested24 cases: birth ticks1/30/90 × animation/physical handoff with existing1.8N·s positive-X UI impulse ×16/40m/s × horizontal/vertical box. Birth position is the **current boundary's** forearm collider center plusZ0.6m, with fixed identity rotation and negative-Z velocity. It never aims retrospectively at the completed interval midpoint. Query every actual blocker and advance only on a clear family.

All24 reached a definite forearm-first contact without initial block; each query preserved the live snapshot/counts and every world was destroyed.16m/s had one clear interval then hit at age2;40m/s hit age1. Total native calls:21–22 animation16,76 physical16,15 animation40,39 physical40. Contact latency is30.114..31.002ms at16 and12.084..12.364ms at40. This is too short to assume flight will be readable at30Hz; frame grouping can show no intermediate airborne frame.

Parent retained the recipe in `game/scripts/probe-boundary-slicer.mjs`, independently reviewed APPROVE, then reproduced24/24/24destroyed with matching outcomes. Reproduce from `game`: `rtk proxy node scripts/probe-boundary-slicer.mjs`. **Provenance limitation:** execution used the current working tree while the separate pair-preflight extraction was underway, not a bit-for-bit pinned5d7e56d checkout. This is supplemental diagnostic evidence. Rerun on frozen accepted source and retain native controller regressions before implementation acceptance. The script's512 assertion is only4×128 arithmetic, not the new shared ledger implementation.

The default prototype can use16m/s plus a legible post-contact trail/inspect affordance. The exact default must be recorded before controller code; this is not a final game's range/balance decision. Do not hide a real miss or make the muzzle track the moving target during flight. Keep the deliberately blocked horizontal-X shot as a negative control alongside the usable free-Z launch.

## Minimal live-controller direction

Prefer one lab-specific controller retained alongside one actual ArmFixture/arm-contact batch. It accepts bounded queued launch commands and exposes one fixed-step operation so begin/capture/owner-step/completed-query cannot be accidentally separated by rendering. A render frame can contain8steps; query after **each relevant successful owner step**, not just the last captured interval. No owner rewind, world cloning or interpolated point presented as a measured native boundary.

Each cast gets a unique identity/generation at the current boundary, fixed orientation, retained world velocity, current position and finite remaining lifetime. The shape options match the frozen blade boxes. Queued + active work must have one finite count cap compatible with the8-cast batch limit. Preflight future cast data before advancing the owner; use the accepted helper. The owner alone advances target physics.

On clear, advance that cast to its computed endpoint for the next interval. On selected hit, terminate at the reported upper-time contact. On blocked/unresolved, terminate at the earliest possible time and retain honest diagnostics; never continue into the next interval past possible contact. Range expiry is a distinct terminal state, not a selected hit. A cancelled cast is not a miss.

Keep bounded recent detached terminal records, separate from active state. Reading/inspecting a record does not deliver an event again. If a consumable terminal-event queue is useful for one-shot audiovisual feedback, explicitly test drain-once behavior and two distinct projectiles in the same tick; call these laboratory events, **not anatomy damage authorization**. Full future effect commit still needs current epoch/cast generation/collider/anatomy revision, as recorded in the ordering design.

Pause/blur/visibility loss clears queued and active casts plus simulation debt. Reset/disposal/pagehide/context loss invalidates the generation and stored selection; late async creation must be discarded/destroyed without reviving an old owner. Completed detached diagnostics may remain for deliberate read-only paused inspection where that preserves the existing inspector behavior. The exact retention table belongs in the executable plan. Input while loading/paused/lost must not queue a delayed cast.

No requirement to compile an idle no-cast interval just for a HUD counter: only query when a live/queued cast needs that interval, while maintaining the one retained batcher lifetime. The batch's explicit empty-call transaction remains tested, but does not oblige the live controller to allocate contact history repeatedly when no spell exists. Rendering must not trigger contact queries.

## Contact-time view, not historical restore

Keep the existing measured-boundary inspector and contact inspection visibly distinct. A contact frame can derive both arm segment/collider/bone poses from the retained interval at the selected/earliest contact time, plus the actual blade volume, path and witness/normal when valid. A non-hit has no trustworthy cutting normal; don't fabricate one. Leave current owner tick/metrics unchanged and mark the displayed frame as interpolation-model contact inspection.

Suggested concise state copy:

- Ready: `Skärva redo`.
- Flying: `Kast på väg`.
- Definite hit: `Första träff: underarm` (or the actual named blocker).
- Initial block: `Kastets start är blockerad`.
- Unresolved: `Kontakten kunde inte avgöras`.
- Expired clear path: `Ingen kontakt inom provsträckan`.
- Failure: `Kontaktprovet avbröts – återställ`.

Expose full candidate frontier/call counts only through a collapsed diagnostic surface. Do not present a later diagnostic pair hit as the chosen impact.

Use a bounded reusable mesh/line pool, not a new geometry/material on every frame or click. Warm actual relevant shader/geometry paths before comparing renderer resource counts; creating invisible meshes alone does not establish a stable GPU baseline. Dispose each owned resource/listener/observer and clear cast records on teardown. No required post-processing/bloom dependency.

## Retained acceptance to specify next

- Genuine missing-controller/visual behavior RED, then fixed command replay at30/60/144Hz, including two casts in one tick and multi-step catch-up. Events/identities and contact outcomes match even if UI sampling differs.
- Real boundary-born animation and physical handoff shots with all4blockers; blocked muzzle, matched miss/expiry and earlier unresolved/ambiguous controls. No test-only victim exclusion or distance oracle.
- No casts while paused/loading/lost; no stale async resurrection, latent cast after resume, duplicate event on inspection or same-tick requery budget reset.
- Actual browser pointer/keyboard casting, pause/handoff/reset, separate native/contact inspection, context recovery, BFCache and10resets. Retain the existing14-case courtyard/arm baseline, production exclusion and pointer-lock distinction.
- Open final screenshots at1440×900 and1024×700, showing a real contact and all critical controls; inspect actual blade/target contact-time alignment, not merely DOM labels or debug counters.
- Native/typecheck/build and ordered independent reviews. Browser/Windows/production acceptance remain distinct; no FPS claim from Node/SwiftShader or this boundary diagnostic.

This is the bridge toward the approved brutal magic combat. It does not deliver humanoids, swords, anatomical impairment, prepared severing, blood effects, historical city art or a new Windows executable.
