# Owner-bound arm contact batch — downstream design note

Coordinator preparation while the pure family resolver is implemented. **Not an executable or accepted implementation plan.** Review the actual family API and this contract before allocating the next sole writer. Do not modify the current writer's files.

## Why this layer exists

The pure resolver can prove completeness relative to an explicit manifest; it cannot prove the caller supplied the real world's full roster. A live laboratory wrapper should retain the actual `ArmFixture` owner and read its snapshot itself, without accepting a caller-supplied motion or collider subset. It also needs a shared work ceiling across all projectile families in one fixed tick, not128 calls multiplied silently by every projectile and collider.

The simplest bounded ownership API appears to be an async `createArmContactBatch(arm, options?)` factory returning `queryTick(casts)` and `destroy()`. Names are provisional until the executable plan. This wrapper is arm-lab-specific, read-only toward the owner, and not an authenticated damage token or a whole-city broad phase. The underlying owner remains responsible for its Rapier world lifetime; destroying this wrapper does not destroy the arm.

## Source-grounded constraints

- `createArmFixture()` owns exactly4 bodies,4 colliders and1 joint: floor, wall, upper-arm and forearm, all collider ID `shape`. No constructor configuration or roster export exists yet. Preserve that accepted fixture and its8 native physical steps.
- Its `snapshot()` contains epoch, tick, counts, complete detached interval/native samples, binding/segment geometry and current metrics. `snapshot()` throws after owner destruction. Read once per batch rather than once per candidate.
- The fixture epoch changes only when a new fixture is created. A wrapper retained for an old fixture must never switch implicitly to a new owner during reset.
- The browser currently advances via `createFixedStepper` and the owner increments its own tick. The stepper's callback tick is not the owner's authoritative interval identity; use `ArmSnapshot.tick/interval`.
- A render frame may execute up to8 fixed steps and the arm retains only its latest interval. Run the synchronous batch **inside** the fixed-step callback immediately after each successful `arm.step()`, not once after `advance()` returns. Otherwise intermediate contacts would be lost at30Hz or during catch-up.
- Handoff can happen at a paused boundary without incrementing tick. Compiler uses the next completed trace's actual sample0 authority, not an earlier caller screenshot. Do not synthesize a contact interval before the owner step.
- Existing pair cast validation is private in `prepare`. If the whole batch is out of budget, skipping pair calls would currently skip cast validation. The next implementation needs a small reviewed extraction of pure cast validation, or an explicitly justified alternative, so **all** input casts preflight before any work/selection. No fake native distance oracle or native call just to validate.

## Proposed ownership and work contract

At creation, await the accepted pair factory, read the retained owner's actual snapshot, verify the bounded named4/4/1 fixture roster and capture detached epoch/refs independently of future query results. No external submitted roster is allowed. This is an architectural ownership boundary between trusted modules, not a defense against fabricated JavaScript objects impersonating an owner.

Each synchronous batch reads the same owner's current completed snapshot, validates expected epoch, whole roster, counts and snapshot/interval tick consistency, then compiles the whole interval once. Match every later manifest to the stored initial roster. No arbitrary collider exclusion, including the upper arm. A future shield/extra-body fixture requires an explicitly reviewed new fixture contract, not widening this wrapper silently.

Validate and detach the entire input cast list before the first pair: dense array, at most8 casts, correct completed interval identity, valid shape/pose/travel, unique `(castId,projectileId)` tuple. Sort casts by code-unit castId/projectileId and colliders by the compiler's bodyId/colliderId order; input permutation may not change work priority. This is deterministic budget allocation, not physical priority across separate spells.

Provisional lab ceiling:512 native calls across the **entire tick**. It is informed by the recorded Node diagnostic, not a proven frame-time target. A smaller integer ceiling0..512 may be a useful explicit laboratory option for retained boundary tests; default512. Reserve128 before each synchronous pair; debit actual returned calls. If fewer than128 remain, every remaining collider/cast gets a correctly tagged unqueried0 record. Keep the stable prefix; do not query a cheaper-looking later candidate or omit an expensive unresolved one. Return actual work and unspent allowance, including up to127 deliberately unused calls.

One batch invocation per completed owner tick: consuming the same interval again must throw instead of resetting the512-call allowance, even if the earlier invocation was empty, all-miss or unresolved. Input/preflight errors before native work are retryable and spend nothing. Mark the interval consumed before the first native query; unexpected subsequent failure must not allow a same-tick retry with a fresh budget or publish partial families. Pair-native failures normally already become explicit inconclusive records. Destroying and recreating the wrapper in the same tick could still reset its local ledger; the later live cast controller must own one wrapper per owner lifetime and not rebuild it to retry failed queries. If this cannot be enforced simply at that integration boundary, move the ledger to that controller's retained epoch state rather than claiming a universal process-wide limit.

Return detached family results, actual used/remaining calls and the captured snapshot if needed by the contact-time view. No effect callback, owner step, body write or damage on query. Do not publish functions/native handles as diagnostic geometry. The exact retained result shape and snapshot-copy cost should be decided before implementation.

## Controls for the executable plan

- Actual full owner, no accepted subset parameter; intact counts, unchanged live snapshot, stale/destroyed owner, wrong known roster, duplicate/sparse cast records and all invalid casts detected before native work even at0 budget.
- Shared budgets0/127/128 and a cheap completed pair leaving exactly128 or127; actual pair count debited, not fixed128. All pending records explicit earliest0, never clear when work remains.
- Two different projectiles in one tick, independently permuted command/roster order, duplicate same-tick invocation, different next tick, empty batch consumption and preflight retry without spend.
- Reproduce the complete-arm upper-arm-at0 negative control and a genuinely clear-muzzle first forearm hit. Never filter the upper arm to force success.
- Every query read-only, wrapper destroy idempotent and owner survives; owner destroy invalidates query; no extra world.step or restore.
- Current pair preflight suite must remain green after any pure validation extraction, with new direct no-native preflight controls. Frozen OBB/travel/call gates and lazy initialization contract stay unchanged.

## Following this batch, still missing

Live casts begin from an actual fixed-step boundary, retain identity/orientation across intervals and stop at the earliest possible contact on blocked/unresolved outcomes. Pause, blur, reset, pagehide, context loss and failed async initialization invalidate queued/active casts and debt. A generation guard prevents late initialization from reviving old casts. Thirty/60/144Hz regrouping of identical fixed commands must retain outcomes.

Exactly-once damage later requires captured cast generation, epoch, collider/anatomy revision and an ordinal checked immediately before committing effects. A hit result is not sufficient authority. Multiple projectiles in one tick cannot damage the former owner of a freshly detached limb. Do not introduce a pretend anatomy graph merely to claim those tests at this query stage.

Visible integration must distinguish interpolated contact-time geometry from the existing measured-boundary inspector, show the actual blade volume and honest uncertainty labels, and retain real browser/resource/restart checks. This work leads toward tight spell action but does not yet implement swords, severing, player/NPC regional injuries or gore.

## Bounded integration review

The prior pair implementer independently inspected the actual owner/stepper and identified the immediate-after-each-step hazard above. It also recommended pure cast validation extraction and fail-closed sealing after unexpected work failure. Those are incorporated. Its alternative of returning cached identical replay results is deliberately not chosen here: rejecting all second submissions has a smaller no-redelivery surface for the initial live lab; recorded inspection can use its already detached result. Likewise, use canonical cast tuple order, not the suggested input order, to preserve command-permutation work allocation. Capture the initial roster from the actual initial owner snapshot rather than compiling an unqueryable initial interval. This is preparation feedback, not executable-plan or source acceptance.
