# Research adopted into Vadstena development

Date: 2026-09-08. Baseline: `b4c6a06ba241491f5f69dbdd13e4c525b1358f47`.

Simon explicitly resumed development after compact, asked the development session to read the complete new research first, integrate its findings and continue autonomously. All ten final documents in [the completed research delivery](../../research/deep-research/2026-09-08/README.md), its review notes and structural QA record were read. The ten files match their delivered SHA-256 values. The final Markdown reports are integrated unchanged; the research session's work files and source cache remain untouched and untracked. Reading a report is not a new execution of its proposed experiments.

The [approved chapter spec](../specs/2026-09-05-vadstena-chapter-design.md) remains authoritative. PC web and Windows, real articulated ragdolls, nine prepared sever connections, default-on gore with preserved saved-off choice, two first-chapter schools and the historically qualified 1510 base are unchanged. No new engine, dependency, public deployment, purchase or security-policy relaxation is authorized by this adoption.

## Decisions that affect implementation now

| Finding | Development decision | Evidence needed / boundary |
| --- | --- | --- |
| Existing Three/TypeScript runtime is useful, but the ragdoll binding remains unproven. | Retain the current stack for the reusable Grip slice. Add the joint/pose and contact spikes before final NPC production. Do not add a second simultaneous physics world or a generic ECS. | B01/B02/B03 and minimal B07 precede final engine/asset lock. Jolt is a candidate only if an actual Rapier failure warrants a comparison; a complete engine migration remains a separate decision. |
| Dynamic Grip control needs bounded energy and inertia-aware rotation. | Keep real dynamic bodies, per-step impulses, world-inertia torque, actual collider sweeps and pre-impulse safety release. Start with a deliberately limited COM grip for single centered props. | Real wall/corner/stair/player/long-prop tests, sleeping pickup, range/visibility reasons, finite speeds and force/torque bounds. Off-center grips and connected ragdoll components are not covered yet. |
| Research tuning ranges are hypotheses; draft values are also unvalidated. | Record one prototype tuning profile before testing. Preserve the existing 18 kg barrel as a test target; compare identical shapes at 0.5/2/10/15 kg plus the declared maximum. Prefer conservative force/throw limits and measure their consequences. | Compare lift response, cap activation, throw velocity and release energy. Equal trajectories under mass-scaled PD are not evidence of perceived weight. No subjective playtest or final balance claim. |
| Abrupt target changes and requested-versus-actual holding can cause failure. | Test bounded target changes, failed selection and actual-held feedback; R+mouse only rotates a genuinely held object. Reconcile the session toggle after failure, throw or automatic release. | Pending acquire survives until consumed; next intended toggle click can reacquire. Pausing, blur, hidden page, pointer-lock loss and restart clear every latent input and Grip state. |
| Render rate must not drive physical commands. | Extend fixed-step replay to Grip with identical per-tick commands under 30/60/144 Hz render grouping. | Compare discrete held/release/throw outcomes and numeric poses for this same build. No cross-platform bit-identical replay promise. |

The installed Rapier 0.20.0 declarations and selected source-map code were independently rechecked by the read-only physics reviewer. Current `castShape` takes `targetDistance` before `maxToi`; exclusions use actual collider/body objects. Research does not invalidate this Grip architecture. The public [Rapier body guide](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/) and [query guide](https://rapier.rs/docs/user_guides/javascript/scene_queries/) were also consulted, but installed-version declarations govern exact signatures. Explicit GPU resource ownership follows [Three's disposal guidance](https://threejs.org/manual/en/how-to-dispose-of-objects.html).

## P0 gates moved ahead of final content production

These are recorded engineering dependencies, not completed implementation or extra chapter scope.

1. **Bounded joint and pose probe (B01 / K01):** prove local axes, actual angular limits and animation-to-physics pose/velocity transfer. Rapier's raw `jointSetLimits` is available, but descriptor `limits` does not establish spherical limits. Isolate the version-bound adapter; test both directions, coupled axes, stairs, contacts and destruction within 24 bodies per rig. Do not assume a top-level `RawJointAxis` export or use logical `||` for axis masks. A proposed 2 mm / 1 degree handoff tolerance must be recorded before the test, not retrofitted to pass.
2. **Moving volumetric contact (B02 / K02):** define hand origin, start-volume overlap, relative motion, fixed-at-cast blade orientation and first blocker. Pairwise shape casts account for two linear velocities, not automatic rotational sweep. Include thin wall, translating/rotating crossing arm, matched near miss, arm before torso, two distinct projectiles and duplicate delivery. Stable world/caster/cast identity and revalidation after graph changes are prerequisites for severing.
3. **Skinned asset/ownership probe (B03 / K03):** use a real simple animated figure with a clothed arm, both caps, two instances and LOD. Test a complete distal chain and later all nine edges without new mass/body/weapon duplication. Skeleton cloning alone does not isolate mutable materials. No final six-NPC production before this gate.
4. **Minimal packaged asset proof (B07 / K12):** use actual GLB, KTX2/decoder and selected audio files. The current desktop path filter does not permit these formats/nested decoder paths. Any later policy change must be narrow and tested with allowed bytes/MIME plus traversal, unknown-file, worker and CSP negatives. No policy change is needed for the current asset-free Grip slice.

**B04 final engine decision is broader than these physics/asset gates:** it additionally requires one representative street section, one playable Klang clue and the same representative content in actual PC-web and Windows exports. Record observed authoring/iteration and export behavior. The detailed M3/M4 production follows later, but these small environment/audio representatives must be brought forward before final engine lock. An isolated joint probe or asset load cannot decide the whole engine choice.

The research proposes B01-B03 before the whole production Grip dependency B05. Our existing approved mechanics-first sequence is retained for the small prop-only Grip slice: its command/controller tests remain reusable, and no final rig or engine decision is being locked by it. This ordering avoids treating an unbuilt ragdoll as a prerequisite for learning from ordinary props. Full P03 acceptance still requires detached/connected anatomy later.

**New development-side diagnostic:** [raw joint probe results](2026-09-08-rapier-joint-probe-results.md) now demonstrate the limited single-axis API route in 24 isolated fixtures, with coordinator reproduction. They also expose that generic masks lock the named axes in 0.20.0 despite misleading comments. This narrows K01's API uncertainty; combined-axis/anatomical/full-rig acceptance stays open.

[Relative-contact diagnostics](2026-09-08-relative-contact-probe-results.md) additionally reproduce an analytically solvable crossing that both endpoint-frozen casts miss, a matched near miss, TOI-unit equivalence and witness-frame caveats. These are useful B02 test seeds, not rotating-arm/projectile/anatomy acceptance.

## Historical phase and environment rules adopted

Source: [history-environment](../../research/deep-research/2026-09-08/history-environment.md), especially the phase matrix and visually reviewed Hasselmo reproductions. These are research-derived constraints, not fresh archival verification by the development session.

- The route remains Rådhusområdet–Storgatan–S:t Per, but today's Stora Torget/Kyrktorget and regulated street lines are not assumed to represent 1510. Use the reviewed older-map topology; obtain original-map evidence before claiming exact parcel/shore measurements.
- S:t Per is a whole church in the base phase. The free-standing Rödtorn and later school are later phases. The 42 m figure is a checking question, not a locked 1510 dimension.
- Rådhusets medieval core is plausible; the exact early tower form remains uncertain. Keep explicit alternatives instead of importing today's roof/lantern silhouette.
- Mårten Skinnares hus has unresolved construction-phase dates later than 1510. Keep the site anchor and a named intrusion phase until the original building evidence settles the model.
- Klosterkyrkan needs its reconstructed medieval roof/bell-tower phase. Its medieval bell arrangement also informs Klang's normal soundscape; today's bell location is not projected backward.
- The castle begins after the base year and is a deliberate later intrusion. Its 1510 site is not assumed to be an empty modern park.
- Mixed stone/gravel/earth is a historically informed reconstruction, not a claim of universal cobbles. A documented precinct wall is not a complete urban ring wall. Tree species and courtyard positions retain uncertainty labels.
- Every significant component records stable ID, intended phase, evidence class, page/figure, measured extent, uncertainty, gameplay alteration and independent rights status. Accessible photographs/PDFs are references, not automatically licensed textures.

The five required eye-level environment views, six compatible house types, two playable alleys/two courtyards and real collision-to-visual agreement stay in M3. Nothing in the current test yard is relabeled as historical final art.

## Chapter, audio, damage and persistence choices carried forward

Source: [design-story](../../research/deep-research/2026-09-08/design-story.md) and [technical dossier](../../research/deep-research/2026-09-08/technical-dossier.md).

- Adopt the proposed learning structure: establish a visible everyday rhythm, break it with a perceivable sound anomaly, allow investigation, then telegraph hostility and leave retreat/recovery. The proposed 18-minute beat allocation is an authoring target, not measured playtime.
- Retain physical passage clearance versus sound diversion as genuinely different solutions. No unique consumable prop or surviving information NPC is required for progress. Record reward/discovery IDs, not spell spam, for progression.
- Fästpunkt's trial must require a bounded temporary anchor while hands are free; Återklang's trial must require a recognizable replayed game-generated rhythm, not a generic distraction. Both support retries and the same clear chapter boundary.
- Prefer a small explicit NPC state machine for six adults. Life/anatomy state outranks behavioral intent. Semantic sound events feed hearing, audio and captions independently of volume; captions use the player's perceptual access and portal direction rather than reveal hidden sources.
- Keep object capabilities explicit (`grippable`, resonance/material, permitted anchors, phase and quest role) when these systems are introduced; do not promise every interaction from one generic flag.
- Damage transaction and anatomy own stable segment/component identity. Gore presentation is generation-gated, independently switchable, and cannot change physical or quest outcomes. Neutral remnants remain visible physical objects.
- Checkpoints contain full PRNG/timers, graph, ownership and body motion, with current preferences applied before presentation. A seed or saved physics handles are insufficient. Safe phase changes validate all occupied new geometry before any mutation.

These choices refine the approved design without implementing future systems prematurely. New numeric combat, contact and handoff thresholds will be explicit fixture parameters and tested before being called balance or acceptance evidence.

## Verification and distribution boundaries

The [research QA matrix](../../research/deep-research/2026-09-08/qa-performance-distribution.md) covers all 26 spec IDs. Grip contributes to P03/U01/R01/R03, not whole-chapter acceptance. Before new Grip code, strict typechecking and all 32 baseline native tests passed freshly in this resumed turn. Earlier browser 6/6 and Windows 2/2 twice remain dated prior evidence until the changed browser code is retested.

Keep actual full-Chromium BFCache, context loss, menu/input, ten-reset resource and nested-base production checks. Browser screenshots must be inspected for scene readability; a DOM assertion cannot judge WebGL output. PC-only scope overrides skill defaults about mobile. FPS and the whole 240-body content budget remain unmeasured.

The newer research correctly narrows the older handoff's website CSP claim: a second permissive CSP cannot override a restrictive one, but a global policy relaxation is not the only possible solution. A tested path-policy restructuring or separate game origin may be appropriate when website integration is requested. No sp1e files or headers are changed here. Hosting limits and licenses are reverified at the actual distribution decision.

The previously accepted unpacked exe is not a single-file portable release and will not acquire Grip merely because browser source changes. Ordinary launch, default-profile persistence, offline assets and portable lifecycle remain explicit Windows tasks. The original Defender history remains unresolved; no exclusions, restores, settings changes or safety-clearance claim are made.

## Work order and ownership

1. Complete/review the revised executable Grip plan, then observe RED and implement its coupled physics/input/view slice with one writer.
2. Independently review spec compliance, then code quality; fix material findings and run full native/browser/build plus screenshot checks.
3. Establish B01's stable body/motion/identity and pose contract first, then run B02's moving-contact/projectile gate against it, followed by B03's skinned anatomy/ownership gate. Independent B02 fixture scaffolding may start earlier; it does not bypass the motion contract. Minimal B07 package-assets probing joins when actual resources are ready, before final anatomy/asset lock.
4. Bring forward the representative street section and Klang clue needed by B04's two-export/iteration comparison. Continue full historical environment, chapter/audio and checkpoint production afterward in dependency order, without waiting for more generic research.

Coordinator owns this adoption note, the delivery map, `.continue-here.md` and `team-state.md`. The Grip implementer owns its plan, new Grip modules, their integrations/tests and results. Independent reviewers are read-only. No new sidebar task is created. Review/planning is not reported as working gameplay.
