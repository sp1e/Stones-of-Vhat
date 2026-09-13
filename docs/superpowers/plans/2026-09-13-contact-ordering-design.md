# B02a first-blocker ordering — dependent working note

Status: coordinator design preparation while the motion/query dependencies are completed. **Not an executable implementation plan, accepted source, or global collision guarantee.** Turn this into an exact tested contract after pair-query acceptance; do not start a second production writer from this note.

## Player-facing reason

A blade must meet the shield or wall in front of a person before it can injure that person. Small numerical overlap between two possible hit times must not let registration order decide whose arm is severed. This applies to later magic and sword contacts, for player and NPC alike. The query remains read-only; damage commits against current anatomy separately.

## Complete candidate family

The initial laboratory wrapper should enumerate every blocker in one accepted compiled motion interval and run the accepted pair query with the same detached cast. No broad-phase filtering, ignored errors or unreported unqueried colliders. The compiler's deterministic code-unit order gives repeatable presentation/work order, not physical precedence.

An authoritative family has exactly one resolution record for each expected blocker and identical world epoch, adjacent interval ticks, cast ID and projectile ID. A resolution is either an actual pair result or an explicitly unqueried family-budget record. Unknown, duplicate, missing or mixed identities reject before publishing an ordering. A caller-provided subset must not masquerade as a complete world query: the lab wrapper must obtain the full completed interval from its authoritative owner or compare it with an independently owned epoch/interval roster. Deriving both expected IDs and results from the same arbitrary submitted motion proves completeness only relative to that potentially incomplete motion. Full-city spatial candidates and a query-local coordinate frame remain separate prerequisites; the compiler's current limits must not reshape Claude's environment.

Pair results are evidence for the declared motion model and empirical native guard, not exact instants. A malformed/native-failed result is not a miss. No selector receives a native handle or changes the live physics owner.

## First-contact frontier

Represent each non-miss pair by its earliest possible time:

- hit: `lowerS`, with a confirmed model contact by `upperS`;
- initial-blocked: time0, no cutting geometry;
- inconclusive: `earliestPossibleS`, with no confirmed upper contact time.

Let U be the minimum confirmed upper hit time or initial blocking-decision time. Initial blocking at time0 is a confirmed restriction on travel, not proof of geometric penetration: positive separation within the empirical guard also blocks. If no such upper time exists, U is conceptually unbounded for this comparison (do not serialize Infinity as output data).

The possible-first frontier contains exactly non-miss candidates whose earliest possible time is ≤U. This excludes a later candidate whenever another contact is already confirmed before it can occur. If no confirmed contact exists, retain every unresolved candidate. Do not use transitive overlap groups: with A=[1,10], B=[5,6], C=[9,11], U=6, so C cannot be first even though its interval overlaps A.

A unique definite first hit requires its upper bound to be **strictly earlier** than every other non-miss candidate's earliest time. Equality stays ambiguous. An earlier inconclusive candidate prevents a later hit from becoming a damage target. Multiple initial blocks are a blocked set at time0, not a normal-hit tie to resolve by collider ID. All-miss is the only clear-path result.

Return an explicit frontier/uncertainty result when uniqueness is not established. Sort identities for deterministic display only. No arbitrary head/torso/limb priority or “smallest ID wins” fallback. Non-unique results must not expose a selected target that downstream code could accidentally damage.

One inconclusive candidate is unresolved, not a unique hit. One initial block is blocked without cutting geometry. Multiple initial blocks or initial blocks plus unresolved candidates at time0 remain blocked with uncertain identity; they must not select a victim. Validate finite in-interval times, lower≤upper, evidence tags, full identities and actual call counts before publishing any ordering.

## Work and lifecycle boundaries to decide in the executable plan

- Pair queries already cap at128 native calls; the whole family also needs a documented total work ceiling. Merely multiplying the maximum128 colliders by128 calls is a bound, not frame-time acceptance. Measure actual lab and stress cases before selecting a lower global budget. A deterministic compatible strategy reserves128 calls before starting each synchronous pair, debits actual returned calls, then stops the stable identity prefix when fewer than128 remain. Every remaining blocker gets an explicit family-owned `unqueried / family-budget / earliestPossibleS:0` record, not a fabricated native pair result with a misleading checkedThroughS. Up to127 calls may remain unused. The fixed-tick ledger must cover all casts, or a per-family cap must be paired with an explicit cast-count cap.
- Spawn a cast at a fixed-step boundary. Preserve its cast/projectile identity across subsequent completed intervals; no retrospective mid-interval muzzle insertion. Orientation remains cast-locked.
- Distinguish contact event identity from actor/limb identity. A delivery token must include epoch/cast/projectile and a defined ordinal. A repeated delivery is rejected; two distinct projectiles in one tick remain distinct.
- The eventual consumer revalidates current epoch, active cast, target collider and anatomy revision immediately before committing one effect. Capture expected anatomy revision and cast generation in the delivery context so revalidation has a historical value to compare against; the pair API need not change. A stale contact cannot recreate an amputated limb or damage its former owner. No damage graph is introduced only to test this query layer.
- For this laboratory increment, blocked/ambiguous/inconclusive outcomes terminate active cast progression and retain detached diagnostic data at the earliest possible blocking time. Uncertainty is not permission to advance the same cast into the next interval beyond that potential contact. A retry would need the original immutable interval/cast; recorded inspection never retries or delivers an effect.
- Pause/restart/disposal clear queued casts and time debt. Regrouping identical fixed commands under30/60/144Hz rendering must preserve query outcomes and identities. Previewing recorded contact data does not redeliver it.

## Retained controls required next

Use real pair geometry for moving shield → arm → farther body, thin wall interception, near-wall muzzle and initial blocking; permute registration order. Include exact ties, overlapping brackets, a genuinely earlier unresolved graze followed by a later definite hit, and the nontransitive-frontier example above as a pure ordering control. Test two projectiles in one tick, duplicate event delivery, stale epoch/collider/topology, detached result mutation and pause/restart. The visible development view should label unresolved candidates honestly and show contact-time frames without restoring or stepping historical physics.

Add budget controls below128/exactly128/after a cheap completed pair, a pending-at-zero blocker before a definite later hit, and all queried misses plus one unqueried candidate. Identity permutations preserve the queried prefix. A consistently compiled subset must fail the owner-completeness boundary. Test single inconclusive, single/multiple initial blocks and initial blocking plus unresolved-at-zero. An unresolved outcome cannot progress into the next interval. Invalid records and stale delivery revisions reject before selected geometry is published.

Independent downstream Astra/high review confirmed the frontier rule with exhaustive finite assignments for seven representative ordering cases. The owner-completeness, initial-decision, family-budget and cross-interval distinctions above incorporate its findings. This is design evidence only and requires no change to the active pair-query API; total-work constants and the executable production plan still await pair measurements.

These notes extend the approved B02a brief. Swords, regional injury, severing and gore remain consumers to implement after this foundation, not completed features.
