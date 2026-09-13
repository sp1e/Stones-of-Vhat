# Authored figure first proof — draft execution boundary

> Coordinator planning while the live-Slicer writer finishes its own nine paths. **DRAFT, not a production assignment.** Finish live Slicer acceptance first. Before this becomes executable, resolve the explicit authoring decisions below and obtain independent contract review. Simon already approved the product direction and continuous development; this is an internal technical gate, not another user checkpoint.

## Outcome

**Coordinator method update:** the later geometry review rejects hiding a 68–150 mm elbow region as a believable cut. Read the final sections of `2026-09-13-elbow-skin-seam-options.md`: the preferred candidate retains the exterior by pose-baking pre-authored seam halves/caps into their respective components, without changing original inverse binds or inventing cut topology. The old visibility-only instructions below are superseded where they conflict. This draft needs that method, exact numeric authoring data and actual Three shader-normal semantics reconciled before it can become executable. Do not assign its tasks from the outdated bridge wording.

Move from copper boxes to an actual project-authored, skinned adult technical figure with one cloth-covered deforming elbow, two LODs and two independent runtime instances. Demonstrate a real exported animation and prepared closed cap presentation. Keep the remaining full-body physics, injury and valid-contact transaction work explicit: a visual cap preview is **not** a severing command, damage event or completed B03.

Use the current plain Three/TypeScript/Rapier stack and PC controls. The technical model is not final NPC art, a1510costume reconstruction or realistic finished gore. Do not silently substitute this proof for the mandated raw magic/sword combat, player/NPC functional injury or full ragdoll.

Read in full before finalizing: the anatomy-asset brief, installed-export inventory, elbow-skin-seam options, accepted chapter and combat addendum, research backlog B01/B02/B03/B07, technical dossier sections3–7, and relevant asset/UI/playtest skill references. Do not repeat the entire research dossier or reopen approved product choices.

## Intended sequential tasks

### 1. Lock the smallest authored contract and independent negative tests

Use stable logical segment IDs for pelvis,chest,head,upper-arm-L,forearm-L,upper-arm-R,forearm-R,thigh-L,lower-leg-L,thigh-R,lower-leg-R. Record one nonseverable spine plus neck,shoulder-L/R,elbow-L/R,hip-L/R,knee-L/R as the eventual graph. The first active prepared seam is elbow-R. Other connections remain intact; merely listing their IDs does not implement their caps or cuts.

Create one canonical skin/rig that is cloned at runtime, not two pre-baked figures. Both LODs retain identical logical segment and elbow unit inventories. Bind matrices come from the authored rest pose, never from the previewed wound pose. Declare metres,+Y up and forward−Z, positive uniform scale, unique stable node extras, and the exact exported proof clip name/times.

The opened-state rule permits a deliberately tagged intact-only deformation bridge. Persistent segment/cap geometry cannot have nonzero weights in both disconnected components. Bridge end-ring vertex positions/normals/UV/weights must match their neighbouring segment rings; only internal bridge rings may blend across the elbow. Each of the two cap assemblies must close its own actual boundary, not just point to a common nominal cut Empty. Cloth follows the same state transition as skin.

Before authoring code, finish a small numeric table for figure dimensions, bone heads/tails, elbow bend envelope, bridge ring positions, per-LOD radial/axial subdivisions, cap collar/inset dimensions, boundary-weld tolerance, basis markers and material/geometry/file budgets. Source collision-proxy/bone-to-body metadata must be explicitly marked as authored input, with physical mass/COM/inertia/joint acceptance deferred to a separately tested anatomical owner; no unverified metadata may be called a functioning ragdoll. Do not improvise body physics values inside a loader.

Tests should fail first for a missing asset/contract, then independently reject wrong joint IDs, duplicate logical IDs, a persistent cross-seam weight, missing LOD cap, wrong winding/open component boundary, nonfinite accessor, invalid joint index/weight sum, negative/nonuniform scale and a wrong export basis. These are actual data mutations or constructed malformed fixtures, not tests that only inspect a compliant manifest string.

### 2. Retained Blender author/export and narrow upstream processing

Use the verified local Blender5.2.1LTS and bundled exporter5.2.40 with background/factory-startup execution. Retain editable source plus an author/export script and explicit options from the installed-export inventory. Do not launch a GUI, save user preferences, reuse an unknown external model or download/purchase textures. State project-authored provenance; do not invent a historical costume attribution or a new asset licence on the user's behalf.

Keep the first output uncompressed GLB2.0 with simple PBR materials and no external textures/resources. The real source rig must have at most four nonzero allowed influences before export; exporter truncation/normalization is not a repair strategy. Bake the deliberately named elbow proof clip and verify its actual exported channels, not merely the source Action name. Keep caps and both LODs in the file, then configure default visibility before adding a runtime clone to the scene.

Select and pin the **local dev-only** glTF Transform/Khronos tooling after inspecting the exact package/help/API needed. Registry inventory is already recorded; it is not an installation. No global install, speculative decoder, broad npm update, engine change or desktop-policy modification. Inspect the resulting lock delta. Run a selective lossless upstream pass that cannot join/prune/flatten logical damage units. Validate both raw and processed GLB with Khronos and the project contract; retain counts/hashes/tool versions. Upstream success alone cannot certify anatomical seams.

Generated `.blend`/GLB files are produced by the retained author/export tools; editable code/config uses apply_patch. Resolve exact project-owned output paths before replacing a previous generated revision. Intermediate raw output and captures belong in an explicitly ignored artifact directory; final retained source/output paths and size budgets must be named before writer assignment.

### 3. Engine-native load and per-instance presentation ownership

Use installed Three GLTFLoader and SkeletonUtils through their actual supported interfaces. No new render framework. Load the processed GLB through Vite asset handling, validate runtime node/skin/clip bindings, initialize hidden caps/LOD state off-scene, then publish the fully prepared owner. Late/stale/failed load must dispose exactly the resources it owns and cannot resurrect a reset scene.

A canonical asset can share immutable geometry; clone bones/skeleton state and any mutable damage materials correctly. Preview state belongs to each visible instance, never to the shared asset. A detached graph/visibility readout is acceptable for testing; no debug API may manufacture an accepted combat contact. Keep body graph, damage and cut-transaction APIs out of this visual-only preview.

At a selected animation time, demonstrate that real skinned vertex positions change with the bone animation and both boundary rings stay connected within the locked tolerance. A whole-object rotation or two rigid boxes is not this proof. In the opened preview, hide every intact-only bridge primitive and show the proper caps on both sides, with independent component poses only for explicit asset inspection. Do not call a manually separated preview mesh a physics ragdoll.

Provide a conservative component/skin-bounds strategy so a moving or later detached limb cannot vanish due to stale rest-pose culling. Dispose instance-specific materials/skeleton resources without destroying the canonical geometry still used by the other clone. Final shared-asset release is a different lifecycle step.

### 4. Compact PC asset view and actual acceptance

Use a development-only page with a protected central playfield, two clearly labelled instances and small edge controls for play/pause, proof time, LOD0/LOD1, one-instance prepared-surface preview and reset. Label the preview explicitly: no damage or physical separation is registered here. Do not add pointer lock, touch controls, an asset showroom dashboard or a new public-game route. The production build must still exclude development pages/code/assets not reachable from the real game entry.

Retain actual mouse/keyboard controls, two-clone isolation, both LODs and reset/loading/context-loss/BFCache behaviour appropriate to the view. Warm the genuine animated/skin/cap/material paths before comparing resource counts across ten restarts. Capture intact bent elbow, each closed cap side, both LODs/two instances and near/far views under actual light/shadow. Main opens final captures; numeric topology checks do not replace visual scrutiny of pinching, self-intersection, cloth penetration or overlap.

Require original courtyard and arm/Slicer regressions unchanged. Run independent SPEC, corrections, fresh QUALITY, parent strict/native/build and complete relevant browser tests. Record exact asset provenance and final hashes, remaining geometry/physics/art limitations and whether the runtime is browser-only. No Windows build, CSP/file-policy broadening, Defender action, website deploy or signing claim is authorized merely by this source slice.

## Must resolve before assigning a writer

- Exact small numeric authoring contract, especially finite-width bridge/cap closure and declared bend envelope. An implementation should not choose these implicitly while producing the first model.
- Exact owned files, tool pin/install route, generator output paths and size budgets; one production writer only. Parent owns coordination/results/Git.
- Formal schema distinction between render/bind proof and unaccepted future anatomical physics inputs.
- Independent contract review of the above and actual installed loader/exporter interfaces.

## Immediate following gameplay work, not optional scope removal

Once the asset path is proved, create the anatomical owner with explicit graph revisions and connected components rather than weakening the fixed four-body arm batch. Drive one real prepared elbow cut from a unique current first-contact result; preserve body identity/mass/pose/velocity, remove only the corresponding joint, update equipment and both cap states atomically, reject duplicate delivery and retain an ambiguous-seam negative control. Then complete shoulder/hip/knee/full-body stability, all nine cuts and the second cut inside a loose chain. Integrate the same regional capability state into actual player and NPC locomotion/hand use, then sword contacts and bounded default-on blood/neutral presentation.

This ordering establishes the asset and ownership prerequisites; it does not replace those gameplay deliveries with an indefinitely polished model viewer.
