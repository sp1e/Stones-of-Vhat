# B02a visible contact demonstration — integration notes

Status: coordinator inspection notes, not an executable plan or implemented feature. Pair contact, complete blocker ordering and cast lifecycle are dependencies. Keep one production writer; do not modify the accepted arm while its dependent query is being built.

## Current inspected integration points

`armLab.ts` owns the fixed stepper, arm fixture, pause/reset generations and development-only diagnostic callback. `armLabView.ts` owns one renderer and reusable segment/marker/axis geometry; it consumes snapshots, never moves native bodies. `armLabTrace.ts` derives historical body/bone/collider frames from measured boundaries. `ArmSnapshot.segments` already exposes detached bindings, joint anchors and identities needed to derive an interpolated contact-time view without inventing a second rig.

The existing native inspector is measured-boundary inspection. A contact-time reconstruction between boundaries is a different, explicitly labelled interpolation view; do not silently move its integer sample slider to an invented “native contact sample.” Preserve the existing actual boundary inspection and clear both inspection modes on resume, reset, handoff, context loss and disposal. Paused inspection must not redeliver a contact or restore an old physics pose.

## Visual purpose

Show the blade volume and its path, target geometry at contact time, the world contact point/normal and the first-blocker result together. The player should be able to see why a wall or shield wins, or why an unresolved near-contact cannot be called a clean miss. Use distinct labels as well as color for hit, initial block and unresolved contact. Never render an expanded safety volume as a confirmed anatomical cut.

This remains a technique view with procedural arm segments, not a finished NPC, gore engine or playable first-person sword. Skin, prepared caps, local damage-region validation and real actor effects follow separately. Keep the later player-facing blade basis relative to the cast aim/camera; the frozen numerical fixtures' world-axis box dimensions are stress data, not a final FPS control layout.

## Ownership and fixed-step flow

- An input edge requests a cast for the next live fixed boundary. Capture the muzzle and cast-locked orientation there, not after physics finishes. Input while paused must not silently queue a future attack.
- The owner advances its existing native simulation, then exposes the completed interval. Compile that interval once for the active cast queries; do not repeat full snapshot/track compilation separately for every collider or draw call.
- On a confirmed first hit or initial block, end the laboratory projectile once and retain only detached display evidence. On unresolved earlier contact, halt/end that cast conservatively at its declared safe boundary; never advance into the next interval and thereby erase the unresolved blocker. The lab can report “osäker kontakt” without pretending to have dealt damage.
- Pause, blur, context loss, reset, pagehide and terminal failure clear pending/live casts and fixed-step debt. Reset generations prevent a late async query initialization from reattaching to a disposed fixture. Existing recoverable reset behavior and actual BFCache handling must remain explicit.
- Render from detached current or recorded data. Allocate shared blade/trail/marker geometry once; reuse it and release it with the existing view. Verify resource counts after shader warmup, not before first material compilation.

## Fixture boundary

The accepted `createArmFixture()` currently has exactly4 bodies/4 colliders/1 joint, including its large floor and wall. Do not sneak a shield, farther body or thin wall into that baseline and invalidate existing stability/count evidence. The executable lab plan must choose a named, independently tested fixture extension or an explicit separate fixture configuration, retaining the original default unchanged. Authored analytical blockers used only in query tests must not be presented as native physical objects in the visible lab.

## Acceptance to preserve and add

Existing browser cases cover genuine handoff/contact, stable paused ticks, ten resets with identical resource counts, resized PC view, graphics recovery, initialization failure and production exclusion. New controls must retain all of them, plus native-history inspection tests. Adding controls must not bury start/pause/reset or overflow the1024×700 and1440×900 layouts.

New native/controller evidence should cover fixed command replay at30/60/144Hz, two distinct projectiles in one tick, repeated delivery suppression and all cast cancellation paths. Browser evidence must exercise actual UI inputs, show real query identities/timing, compare rendered contact-time geometry against the detached query frame, and retain representative screenshots of hit, blocking and unresolved states. The coordinator must open the images, not merely assert file existence. Use a test-owned port distinct from the retained5173 preview and any Claude environment test port. Normal production must still exclude development HTML and diagnostic hooks.

No Windows build or sp1e.se deployment is implied by this development view. The first visible Slicer demonstration is an integration target, not acceptance of the wider B01–B04 research matrix or the raw-combat design addendum.
