# Contact-motion compiler — implementation evidence

Date: 2026-09-13. Scope: `game/src/physics/contactMotion.ts` and `game/tests/contactMotion.test.mjs` against the locked [implementation plan](2026-09-13-contact-motion-tracks-plan.md). This is the detached motion prerequisite to B02a, not a projectile, gore or full-body acceptance claim.

## Delivered behavior

The compiler validates a completed fixed interval and its actual measured native boundaries, then owns detached blocker tracks. It samples body-origin linear translation and true constant-rate shortest quaternion rotation, composing each constant collider-local pose afterwards. It returns identity, span/time, poses, world derivatives and a conservative point-speed bound for this declared interpolation model. No live native world is queried, stepped or restored.

The complete geometry/membership/authority/endpoint and bounded-domain checks remain in the plan. Navigation is validated but excluded as a spell blocker; box/ball blockers are supported, unsupported blockers reject. Output mutation and destroyed-owner controls preserve detached ownership. Actual arm controls cover one animation span and eight physical spans, including all four colliders at all nine measured physical knots.

## Independent review and retained defects

Initial TDD observed the missing compiler assertion fail, then passed small functional groups. Initial focused15/15 did not constitute final acceptance:

| Review | Reproduced defect | Retained correction evidence |
| --- | --- | --- |
| SPEC | Collider enumeration followed registration order, not code-unit body/collider identity order | Multi-body/multi-collider permutation test |
| SPEC | Positive navigation dimensions could become zero in float32 | Box, ball, both capsule dimensions and both cylinder dimensions; zero capsule half-height stays valid |
| QUALITY | Installed Three small-angle `slerp` actually used normalized LERP, exceeding the sampler's constant angular speed bound | Independent analytic quarter-angle/circular-position and finite-difference speed-bound regression; true shortest world-delta exponential interpolation |
| QUALITY | Sparse navigation-box arrays skipped dimension validation | Fully sparse and every single missing axis reject through dense indexed validation |

SPEC corrections: RED15/17 → GREEN17/17. Existing valid behavior was then retained honestly as coverage, not falsely labelled missing-feature RED: compile after owner destruction/all36 knots, pure-angular tiny-span overflow. Expanded19/19 passed SPEC. Parent pre-QUALITY-fix full135/135 also passed; those checks had missed the subsequent QUALITY defects.

QUALITY corrections: focused `--test-name-pattern="constant-rate|densely validates"` RED0/2 → GREEN2/2, followed by21/21. The original valid small-angle reproduction has angle0.06rad over1/60s, stationary origin, local offset31m and ball radius0.0005m. Before the fix its quarter-angle was0.014999156202537103 instead of0.015 and center speed111.608370755m/s exceeded whole-point bound111.6018m/s. Independent final recheck measured quarter-angle0.015 and speed111.60000000024982m/s, below the same unchanged bound.

Ordered rechecks: delta **SPEC PASS**, then original **QUALITY APPROVE**. SPEC independently exercised24 noncommuting/small/large/sign samples and a subnormal midpoint within a1e-310s span. QUALITY reproduced both original defects against the corrected source. No important findings remain within this compiler scope.

## Coordinator validation

Commands run from `game/`, all prefixed with `rtk proxy`:

| Check | Current final-source evidence |
| --- | --- |
| `node --test tests/contactMotion.test.mjs` |21/21 PASS,443.4204ms |
| `npm run check` | Final strict typecheck and137/137 native PASS,59081.2845ms; zero failures/skips/cancellations |
| `npm run build` | PASS; existing large-bundle advisory remains |
| Scoped whitespace / commit | Exact four-path staged `git diff --cached --check` PASS; only source, tests, plan and this evidence record included |

Independent final focused runs also passed21/21 (SPEC and QUALITY; QUALITY462.1562ms). No browser run is claimed for this nonvisual module. The production build still renders the existing courtyard; the new module is not yet connected to a visible spell.

## Limits and automatic continuation

This is a bounded ±32m,64-body/128-collider, measured-boundary interpolation model. It is not proof of the solver's unknown continuous trajectory, universal angular CCD, whole-city candidate completeness, full ragdolls or hardware frame-time performance. Preserve the explicit model label and native-float uncertainty policy in the next query layer.

The independently reviewed next plan is [bounded pair query](2026-09-13-contact-pair-query-plan.md): real world-free Rapier contacts, initial blocks, guarded first-contact brackets and uncertainty across spans. Global first-blocker ordering and cast lifecycle follow, then a visible arm-lab Slicer demonstration. No routine user gate is required; parent starts that writer after final compiler acceptance. No Windows rebuild, Defender change or sp1e.se deployment belongs to this compiler increment.
