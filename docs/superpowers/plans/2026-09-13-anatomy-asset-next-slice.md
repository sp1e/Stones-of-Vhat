# After visible Slicer — anatomy and authored damage asset

Coordinator preparation while `live_slicer_impl` owns the nine controller/UI paths. **Not an executable plan, second production assignment, accepted rig or delivered gore.** Finish that slice's native/browser/visual acceptance before starting this code. This note connects Simons symmetric-injury requirement to the adopted research instead of extending the collision laboratory indefinitely.

## Product outcome to preserve

The next demonstration must turn a valid aimed contact into an anatomical consequence on an actual skinned figure: regional function loss, then a qualified prepared cut with a physically detached distal chain. The same damage rules apply to player/NPC actors with equal authored attributes. A sword is another qualified contact source, not a cosmetic alternative to the Slicer damage system. A projectile that struck an intervening shield or wall cannot hurt the actor behind it.

Gore is on for a new profile and a saved false preference is respected. Off changes blood/cap/loose-part/sound presentation only; the same body still blocks and reacts physically. Body loss must not disappear visually into an invisible collider. Symmetric leg injury must eventually change both player locomotion and NPC movement, not only an animation label. Numeric thresholds are authored game balance, not medical simulation claims.

## Read and keep the actual research gates

- `docs/research/deep-research/2026-09-08/implementation-backlog.md` B01/B02/B03/B07.
- `docs/research/deep-research/2026-09-08/technical-dossier.md` sections3–7.
- Approved `2026-09-05-vadstena-chapter-design.md` and later `2026-09-13-combat-injury-addendum.md` in the specs directory.
- Accepted contact ordering/owner-batch evidence and the still-active live-Slicer plan.

The two-box arm is not full B01: hip/knee, complete-body stairs/wall, anatomical limits and the rig/body budget remain unproved. B03 explicitly requires a skinned/clothed figure, two visual instances, two LODs, all nine eventual cut edges and a second cut inside an already loose chain. A free-standing cylinder cut does not close those gates. Do not declare a final engine decision from the successful arm/query work.

## Current local asset/tool evidence

On2026-09-13, a tracked-project search found no GLB/glTF/Blend character assets or existing asset manifest. No project asset directory was found at `game/assets`. This is a scoped project search, not proof the user owns no assets elsewhere. No external model was downloaded or purchased.

Blender is installed outside PATH at `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe`. Read-only `--version` returned **Blender5.2.1LTS**, build hash **9e2066aef7ef**, build date2026-08-25. The research dossier's Blender4.5 manual is a reference version, not the current local exporter contract. Verify installed export options before scripting; do not silently assume4.5 flags. No .blend/GLB export, installation, preference save or GUI launch was done during this inventory.

The bounded independent installed-source/RNA inventory is retained in `2026-09-13-installed-character-export.md`: bundled glTF exporter5.2.40, supported explicit skin/animation/naming options and the source weight-truncation hazard. Parent separately read the critical installed option and weight/joint code. glTF Transform and Khronos validator were not found in the inspected local/global tool locations; no install was attempted. This resolves export feasibility, not the missing authored-asset/validator/runtime proof.

The web-3d-asset-pipeline skill selects DCC source→GLB2.0→upstream optimization/validation→engine-native load. Preserve the existing plain Three/TypeScript/Rapier stack and explicit fixed stepping; generic starter render-loop examples are not a replacement for the accepted runtime. Check installed glTF Transform/validator availability and decoder policy before choosing compression. Do not install or enable multiple decoders merely because examples mention them.

Read-only desktop inspection confirms a concrete B07 gap: `game/desktop/policy.mjs` currently permits only flat assets endingjs/css/wasm/png/jpg/webp/svg/woff2; `.glb`, `.gltf`, `.bin`, `.ktx2` and audio are not allowed. `desktop/main.mjs` has a restrictive self-only CSP without a blob worker allowance. The normal Vite production entry excludes the development labs. Therefore a browser-only arm GLB is not packaged-asset acceptance. A future exact small asset test must drive narrowly scoped extension/MIME/worker policy changes with traversal/negative-policy regressions; do not broaden file access or CSP speculatively. No desktop policy or package was changed by this inventory.

## Smallest useful authored asset package

Author a deliberately plain **adult human technical mannequin** with one cloth-covered arm and clear skin/cloth/material separation, not final historical NPC art. Retain editable source and deterministic author/export recipe with tool revision. A project-created test asset avoids unexplained third-party licensing, but is not evidence of1510 clothing accuracy or final realistic art quality.

Use the already specified11 base segments (pelvis, chest, head, two upper/forearm pairs and two thigh/lower-leg pairs), the nine named neck/shoulder/elbow/hip/knee cut connections and a nonseverable spine connection. Stable IDs must survive both LODs. Final naming and mass/shape numbers belong in the exact plan before code. Do not merge game IDs with Blender display names or native handles.

Start the visual damage proof with one elbow boundary while preserving the eventual complete graph. Skin triangles and weights, cloth seams, both closed cap surfaces, equipment anchor and collision proxy must all terminate at the intended connection. Distal meshes can share immutable geometry, but instance damage/material state cannot be shared accidentally. The source rig's bind matrices are authored once; never recalculate them from a wounded pose to hide a transform error.

Declare metres,+Y up and project-character forward−Z, positive uniform physics scale, bone-to-body and collider-local transforms, mass/COM/inertia and explicit joint axes/limits. Validate actual exported geometry, joints/weights and node references; a JSON manifest that claims the right names is insufficient. Basic glTF validation and game-specific anatomical validation are different gates.

Run a real skinned animation, clone two visible instances, wound only one and inspect both at both LODs. An asset exporter optimization pass must preserve required IDs/skin/cap mappings; generic name pruning, mesh merging or simplification cannot silently erase anatomical boundaries. Compression is a measured delivery choice after the uncompressed proof, not a prerequisite to first contact.

## Required gameplay/physics bridge — no hidden shortcut

The current `armContactBatch` intentionally requires its original four-body/four-collider/one-joint topology. Removing its elbow joint and suppressing that assertion is not a severing implementation. A new anatomical owner must explicitly account for graph revisions, current connected components, complete supported blocker membership and future local spatial candidates. Keep the old arm laboratory as a regression fixture.

A future cut transaction validates current world/cast generation, stable projectile/contact ID, first-contact evidence, target segment and expected anatomical revision. Zone containment and the approved30° plane criterion are evaluated in the actual contact-time frame; unresolved/initial-blocked results cannot supply a cutting normal. A qualified hit can then change the graph at a defined authoritative boundary without moving one body backwards to historical contact time after its world has advanced.

Author the hit proxies and prepared zone together. A finite blade straddling an exact shared elbow boundary can have two possible first contacts; do not weaken the accepted frontier or choose the smaller segment ID merely to force a satisfying cut. Retain a genuine uniquely selected in-zone positive control and an ambiguous seam negative control. Also distinguish the blade's locked plane normal from the surface contact normal returned by the pair query. The current free-Z lab launch aims at the forearm centre and proves collision, not elbow-zone eligibility.

The transaction must preserve physical body identity, pose, mass and velocity; remove only joints representing the severed edge; transfer distal component/equipment ownership; and publish one corresponding presentation delta. Do not destroy and recreate the detached arm to fake mass conservation. A duplicate delivery changes nothing; a different projectile revalidates against the **updated** graph and can cut another connection in an already loose chain. Stable identity order is not evidence for resolving overlapping uncertain collision times.

Concrete future collision-policy risk: the accepted `createAngularJoint` disables contacts between its connected bodies. Parent `game/scripts/probe-arm-seam.mjs` measures the actual current upper/forearm proxies without removing the joint. Setup intentionally activates/steps each fresh fixture to its phase; the subsequent geometry query alone is owner-nonmutating. At animation boundaries0/1/30/90, native signed separation was−4.470348e−8/−0.0001125635/−0.0030650895/−0.0034978413m. Before/after measurement snapshots/counts matched; all4 teardown blocks completed. `destroyedWorlds` counts successful fixture teardown, not an independent allocation/leak instrument (destroyed counts use a zero-state branch). Independent Sol/high review APPROVE and rerun reproduced all exact values. These are local source-fcd186e geometry observations, not a demonstrated post-cut instability; the near-zero first value is below the query guard. Do not use existing wall/floor stability metrics as evidence that reactivating formerly suppressed adjacent self-contact after a cut is safe. The new authored proxy/seam/collision policy needs a real cut-boundary test, not an arbitrary ejection impulse or permanent ghosting workaround.

Keep regional health/function data independent of player/AI adapters. For equal authored actor data, the same accepted strike sequence gives equal regional state transitions. Which hand a spell or sword uses is explicit capability data. Loss of that hand must not merely reduce an unrelated whole-body health bar. Incapacitation/death and restart need player-camera/input recovery that does not retain a stale limb reference.

## Gore and visual acceptance

Both wound sides must remain closed, correctly lit and attached through movement, shadow, near/far view and LOD. Blood emission originates from the actual active wound frame; it does not fly from a stale world-space point after the arm moves. Keep blood/decal presentation bounded by the approved512particle/128decal budgets, with independently bounded neutral effects and no deletion of physical parts when an effect pool is full.

Switching gore off clears existing blood, decals and delayed callbacks before the next gameplay frame; on again does not replay old wounds as new hits. Retain the correct neutral cap and visible non-anatomical loose-part representation. Test two cloned actors to ensure one actor's cap/material/pool reuse never wounds the other. Realistic-looking source art, physical plausibility and a safe finite resource lifecycle each need their own observed evidence.

Before extending to all nine cuts, require the source→GLB→loader path, real skin animation, valid elbow hit vs off-zone/over-angle negative controls, two-instance/LOD isolation, graph/mass/body/joint/equipment counts and gore-on/off state equality. Then progress to the full-body ragdoll/leg-impairment/sword controls already required by the approved chapter. Keep browser, packaged Windows and website deployment statuses distinct; no Defender bypass or new release inferred from source acceptance.
