# Bent elbow skin seam — bounded design finding

2026-09-13. Parent synthesis of the independent Sol/high read-only asset review. **Not an exported asset, accepted anatomical implementation or completed B03.** The live Slicer remains the sole production assignment. Read the companion anatomy-asset brief and installed-export inventory for scope and provenance.

## Why rigid pieces alone do not prove this requirement

An actual SkinnedMesh with one rigid bone weight per segment can establish bind transforms and segment following. It does not by itself establish a continuous, convincingly bending skin/cloth surface at the elbow. Conversely, a permanently blended sleeve can look intact but stretch between disconnected bodies after the joint is cut. Both intact and opened states need explicit authored topology.

The approved rule is that **no active geometry or nonzero skin influence in the opened state may bridge the disconnected components**. It does not forbid retaining a hidden intact-only deformation mesh in the source package. This is an implementation clarification of the existing prepared-seam method, not permission for runtime arbitrary slicing.

## Original candidate — superseded by the geometry qualification below

For the first elbow, retain persistent upper-arm and forearm segment surfaces. Add an explicit intact-only local bridge containing skin and cloth primitives. Its end rings duplicate the adjacent segment boundary positions, normals, UVs and weights; only its interior rings blend across the elbow. At separation, deactivate the bridge and activate the two segment-owned closed cap assemblies atomically. Other anatomical connections stay intact in the first asset proof; the complete 11-segment/nine-edge requirement remains open.

Each LOD carries the same five logical elbow units: upper segment, forearm segment, intact bridge, proximal cap, distal cap. Separate skin/cloth primitives may share one logical unit. Segment/cap joint allowlists stay inside their own component; only an explicitly tagged intact-only bridge may use joints on both sides. Immutable geometry can be shared between cloned actors; bones, visibility and mutable materials cannot.

The reviewer proposed a common rest cut reference plus two bone-relative cap frames, separate from bone-to-body transforms. Parent flags an important detail for the exact authoring plan: a bridge with finite axial width has two different boundary rings. A shared nominal cut plane is not enough to prove that both cap meshes actually seal those rings. Author each closed cap assembly against its own actual boundary, state the width/collar/inset geometry, and validate the exported welded-position topology. Neither a coincident Empty nor a nominal plane label proves closure. These are prepared surfaces, not arbitrary contact-position cuts.

Use the original rest inverse binds throughout animation and physical handoff. Keep the render hierarchy if its local transforms are correctly derived from each current physical body; do not reparent or recompute inverse binds to hide pose error. Blood/wound frames later follow the correct component-local cap anchor, not the SkinnedMesh object's incidental world transform. The cut-zone plane normal and a collision surface normal remain different quantities.

## Eight required proof families for the exact next plan

1. Actual GLB structure, intended skin, unique stable bone/unit/LOD IDs, finite inverse binds, verified metre/+Y-up/−Z-forward basis and no unintended external resources.
2. Actual exported accessor values: at most four nonzero influences, normalized sums, valid joint indices and per-state component allowlists. Reject a persistent segment with a cross-seam weight even if its manifest claims safety.
3. Real clip sampling through the declared bend envelope. Reconstructed bridge/segment boundary pairs stay coincident within a tolerance fixed before authoring; close and shadow views also catch pinching, self-intersection, cloth penetration and z-fighting that positional equality alone misses.
4. Opened active component topology: bridge absent, both caps present, no open boundary edges after position welding, correct winding/normals/UV/material. Cap intersection in strongly bent poses must be inspected, not hidden by an ejection impulse.
5. Independent bind/body/bone/zone/cap frame roundtrips at rest and bent poses. Existing future handoff gate remains2mm/1degree at transfer, not a tolerance for sloppy source seams.
6. Later authoritative unique contact transaction: exactly the target bridge/caps/joint change; original body IDs/mass/pose/velocity/equipment survive and duplicate delivery is a no-op. A visual preview toggle does not satisfy this physics gate.
7. Two cloned instances and both LODs: change just one actor; no regrowing bridge/limb, cap disappearance, second-actor mutation or shared mutable damage material.
8. Later actual contact-reactivation/cut boundary at the worst authored poses, with predeclared finite penetration/energy gates and unchanged legacy four-body lab regressions. The seam-distance probe is a risk observation, not this test.

No code, source model, generated geometry, package install or export was performed by the reviewer. This finding narrows the authoring method before a bounded executable plan; it does not authorize extending the current writer's nine paths.

## Numeric proposal review: reject a wide disappearing elbow as gameplay

The later read-only proposal used two boundary offsets of 75 mm to keep rigid caps apart through a 20–100 degree bend. It would hide 150 mm of the central elbow region on opening. A reduced proposal still removed 68 mm while narrowing the envelope to 20–80 degrees. The coordinator rejects adopting either as a gameplay cut: they are technical closure fixtures, not credible preservation of the struck arm. No such figure has been authored or accepted.

Keep the distinction between a **deformation envelope** and a **missing region**. A broad region may blend to make an intact elbow bend; it need not disappear when cut. Planar-cap separation margins alone do not establish the actual deformed surface or justify deleting healthy-looking exterior geometry.

## Preferred feasibility path: retain the exterior with prepared pose-baked halves

The next read-only analysis found a bounded alternative. Author the central cut loop twice, with matching rest positions, normals, UVs and blend weights. Keep all cross-weighted vertices in two explicitly replaceable seam halves. Outside their guard rings, the permanent upper/forearm bulk uses only its own component bone. Each seam half has a fully pre-authored cap template, including central-loop vertex mapping, interior vertices, UVs, indices and material role; cloth has its own outer/inner loops and hem closure. No runtime plane cutting, new triangulation or arbitrary mesh topology is proposed.

At a frozen valid pose, prepare instance-owned copies of the two seam halves and caps for **both LODs**. Let `A_j(t)` be the actual mesh-local skin transform including original bind matrix/inverse and joint inverse bind. An intact point is `q = sum(w_j A_j(t) p_rest)`. The replacement owned by component `k` stores `p_new = inverse(A_k(t_cut)) q`, with weight 1 to that component's bone. Original rig inverse binds and mesh world transform remain unchanged. In the exact captured pose this reproduces the intact exterior; no span of healthy outer skin is discarded. All cross-weighted active seam primitives are replaced together, while the canonical source remains immutable.

The coordinator checked the installed Three shader source after the reviewer's generic normal-matrix recommendation. In this installed version `skinnormal_vertex` uses the weighted skin matrix with homogeneous `w=0`, then `defaultnormal_vertex` applies the object normal matrix. **Do not substitute inverse-transpose of the blended LBS matrix and call that exact Three shading preservation.** Reconstruct the actual installed position, normal and tangent paths, preserve the exterior shading direction through the rigid-owner inverse, and validate geometric face normals separately. Cap edge normals may deliberately be discontinuous from exterior skin. Reject nonfinite/singular transforms, invalid scales, collapsed shading vectors and failed preservation tolerances.

Cap templates must meet the same transformed central loop as their own seam half. Prepared opposite, slightly inset cap interiors may avoid a coplanar full-disc overlap, but this is still a hypothesis to validate on the exported, skinned triangles. A shared boundary at the initial cut is expected; inverted/non-manifold surfaces, overlap away from that boundary, skin/cloth penetration and unmatched mappings are not. Dynamic buffer ownership, conservative new bounds and disposal are now explicit costs of this alternative, not hidden in a visibility toggle.

Prepare everything off-scene against asset/instance/anatomy revision, seam ID and the exact captured pose. On failure leave the intact instance and shared asset untouched. Only a later authoritative anatomy transaction may publish physical graph change and the prepared visual replacement; duplicate events cannot rebake the seam. A visual authoring preview still does not authorize injury or joint removal. This changes the proposed implementation technique, not the user's approved prepared-cut-zone or player/NPC injury scope.

This is the preferred **feasibility candidate**, not a locked numeric/export contract or passing geometry proof. The draft execution plan must be reconciled before writer assignment; in particular its old permanent cross-seam rejection rule must distinguish canonical replaceable templates from active opened geometry. No source asset, dependency or game implementation changed during this analysis.
