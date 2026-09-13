# Technical figure — proposed numeric authoring contract

2026-09-13. For independent internal contract review before the first asset-core writer. The approved product scope is unchanged. This is one adult technical figure for render/bind/seam verification, not final NPC art, historical clothing, medical simulation, an anatomical physics owner or completed B03. Companion execution plan: `2026-09-13-technical-figure-core-plan.md`.

**Final independent contract PASS, 2026-09-13:** Astra/high `figure_contract_spec` closed the six initial/follow-up exporter, format and measurable-geometry findings plus preparation lifetime notes. No source model, actual export, installed toolchain or numerical geometry acceptance is implied. Use the explicit later overrides in this document over the historical inventory recipe.

## 1. Identity, units and rig

Asset key `svh-technical-figure`, revision `1`, purpose `anatomical-render-proof`, physics acceptance `false`. Canonical root has identity transform; metres, +Y up, forward −Z. All exported object scales are positive unit scale. Three basis marker nodes have canonical positions origin `(0,0,0)`, up `(0,.25,0)`, forward `(0,0,-.25)`.

Exactly 11 deform joints in one skin; no helper, neutral or leaf joints. Stable joint IDs below are carried in explicit node extras in addition to readable names. All formulas use float64 constants before float32 export; rounded display coordinates are not an independent source of truth.

| Joint | Parent | Head (m) | Tail (m) |
| --- | --- | --- | --- |
| pelvis | asset root | `(0,.91,0)` | `(0,1.08,0)` |
| chest | pelvis | `(0,1.08,0)` | `(0,1.44,0)` |
| head | chest | `(0,1.44,0)` | `(0,1.72,0)` |
| upper-arm-R | chest | `(.20,1.43,0)` | `(.50,1.30,0)` |
| forearm-R | upper-arm-R | `E` below | `E + .28 v(20°)` |
| upper-arm-L | chest | X-mirror of upper-arm-R | X-mirror of upper-arm-R |
| forearm-L | upper-arm-L | X-mirror of forearm-R | X-mirror of forearm-R |
| thigh-L | pelvis | `(-.10,.96,0)` | `(-.11,.52,0)` |
| lower-leg-L | thigh-L | `(-.11,.52,0)` | `(-.11,.08,-.02)` |
| thigh-R | pelvis | `(.10,.96,0)` | `(.11,.52,0)` |
| lower-leg-R | thigh-R | `(.11,.52,0)` | `(.11,.08,-.02)` |

For the right arm, `S=(.20,1.43,0)`, `E=(.50,1.30,0)`, `u=normalize(E-S)`, `h=normalize((-u.y,u.x,0))`, `f=(0,0,-1)`, `v(theta)=cos(theta)u+sin(theta)f`. Rest flexion is 20 degrees; positive flexion rotates toward −Z about `h`. Forearm length is .28 m. Left positions are mirrored, not negative-scaled objects.

Bone frame: `Y=normalize(tail-head)`, `Z=normalize(worldZ-Y dot(worldZ,Y))`, `X=Y cross Z`. Reject a degenerate projection; require determinant +1. Local −Z is projected forward, not necessarily world −Z. Original inverse binds come from these rest transforms once and never change during preview or separation preparation.

The eventual anatomical edge inventory is nonseverable spine plus neck, shoulder-L/R, elbow-L/R, hip-L/R, knee-L/R. This asset names the eventual graph but supplies working prepared geometry for **elbow-R only**. No collider, mass, inertia, COM, joint limit, damage threshold or physical acceptance is inferred from bone lengths or node names.

## 2. Animation

One actual exported clip named `arm_elbow_proof`, 60 fps, frames 1 through 121 inclusive, duration 2 seconds. Right elbow flexion keys `(time s, degrees)` are `(0,20)`, `(.5,60)`, `(1,100)`, `(1.25,100)`, `(2,20)`. Only forearm-R rotation changes; no animated translation/scale, rest rewrite or clip overshoot. Use explicitly sampled rotations at every frame. Validate actual exported channels, key times and sampled angles in the 20–100 degree envelope, not merely a Blender Action name.

Angles interpolate piecewise linearly between those five landmarks, including the constant 100-degree interval. For sample k=0..120, t=k/60 and delta=theta(t)-20 degrees. Let Qrest be the right forearm's declared world rest rotation and Qparent the upper arm's world rest rotation. Its sampled local quaternion is `inverse(Qparent) * Q(h,delta) * Qrest`, sign-equivalent to the same rotation. Exactly one channel targets forearm-R `rotation`, with one LINEAR sampler, 121 scalar times and 121 VEC4 rotations. Time error is at most 1e-6 seconds, quaternion chord error at most 2e-6; other constant TRS channels are not accepted. Source F-curves contain only this bone's rotation, not keyed whole-rig transforms. Explicit exporter overrides `export_optimize_animation_keep_anim_armature=False` and `export_optimize_animation_keep_anim_object=False` retain the real rotation samples with optimization off while discarding unanimated constant properties. Installed sampler source, not the ambiguous UI description alone, supports this selection; actual output remains a gate.

## 2a. Exact supported raw GLB subset

Exporter time-base override: source `fps=60`, `fps_base=1` and **`export_anim_slide_to_zero=True`** map frames 1..121 to the required 0..2 seconds. The installed default is false and would preserve 1/60..121/60; do not compensate by changing test times or the source frame inventory.

Accept only GLB version 2, exactly one JSON chunk followed by one BIN chunk, and one scene selected as scene index 0 with exactly one canonical asset root. One buffer uses the embedded BIN and has no URI. Byte lengths include checked four-byte chunk padding; buffer length may omit at most three trailing padding bytes. No unknown chunks, external resources, images, textures, samplers, cameras, lights, node/primitive morph weights or targets, extensionsUsed/extensionsRequired or any nonempty extension object. No loader plugins or compression. Unknown structural glTF properties/features are rejected; agreed `name`, `extras`, `asset.generator` and standard material properties below are the declared metadata exceptions, not arbitrary behavior.

Nodes use TRS only, with omitted T/R/S interpreted as identity; reject `matrix`, mixed matrix/TRS, nonfinite data, any scale outside positive unit scale tolerance 2e-6, duplicate parents, cycles, unreachable nodes and extra scene roots. Mesh-bearing nodes contain exactly one TRIANGLES primitive, the declared skin index and one assigned material. No node instancing extension. Root/LOD/mesh/marker transforms must agree with their canonical declared frames, not merely pass the positive-scale test. The single skin lists exactly the eleven declared joints. The optional `skin.skeleton` may be absent, as in the installed Blender exporter; independently derive the common joint root (pelvis) and verify its declared parent graph and common asset ancestry. If `skin.skeleton` is present, it must reference that exact pelvis joint root, not an arbitrary ancestor or another mesh. No post-export property injection is needed. Maxima are 64 nodes, 42 meshes/primitives, 3 materials, 1 skin, 1 animation/channel/sampler, 512 accessors and 512 bufferViews; all are checked before allocating derived arrays.

| Accessor use | Allowed type/component | Normalization |
| --- | --- | --- |
| POSITION, NORMAL | VEC3 / FLOAT 5126 | absent or false |
| TEXCOORD_0 | VEC2 / FLOAT 5126 | absent or false |
| JOINTS_0 | VEC4 / UNSIGNED_BYTE 5121 or UNSIGNED_SHORT 5123 | absent or false |
| WEIGHTS_0 | VEC4 / FLOAT 5126 | absent or false |
| _SVH_VERTEX | SCALAR / FLOAT 5126 | absent or false |
| primitive indices | SCALAR / UNSIGNED_BYTE 5121, UNSIGNED_SHORT 5123 or UNSIGNED_INT 5125 | absent or false |
| inverseBindMatrices | MAT4 / FLOAT 5126, count 11 | absent or false |
| animation times / rotations | SCALAR / FLOAT 5126 and VEC4 / FLOAT 5126, count 121 each | absent or false |

Every primitive has all six listed vertex attributes and indices, no other attribute semantics. In this texture-free proof TANGENT is absent, so the later tangent-preservation rule applies only if a future reviewed revision introduces it. Attribute counts agree and are positive; no attribute accessor exceeds 65536 elements, no index accessor exceeds 54000 elements. All accessors have bufferViews, no sparse/accessor extensions, no unchecked multiplication/offset overflow and no data outside their declared view/BIN. Component offsets are component-aligned; vertex starts and explicit byteStride are four-byte aligned. Vertex stride may be omitted (tightly packed) or explicitly 4..252 bytes, at least element size. Index, inverse-bind and animation views are tightly packed with no byteStride; no cross-use view that violates these rules. A declared bufferView target is only ARRAY_BUFFER 34962 for attributes or ELEMENT_ARRAY_BUFFER 34963 for indices; other views omit target. Validate actual index ranges/divisibility by three and finite float components. POSITION min/max must exist and match actual finite bounds within 2e-6; any other provided min/max must be correct. Reject unused accessors/views and material resources instead of allowing unchecked payloads.

Materials use only the three declared opaque, single-sided simple metallic-roughness PBR roles with finite bounded baseColorFactor/metallicFactor/roughnessFactor, names/extras and optional identity defaults. No texture slot, transparency, emissive extension or alternate technique. Normals are nonzero unit vectors within 2e-6 in canonical GLB; runtime pose-baked shader vectors are governed separately below. Validate JSON types and fixed metadata schema rather than trusting an `extensionsUsed` omission or an extras assertion. Retained negative mutations cover each forbidden category, including matrix/morph/extension/external URI, component/normalization/stride mismatches and excessive counts.

## 3. Technical silhouette and unit inventory

Two explicit LOD groups share one rig and stable unit inventory. Each LOD has exactly 21 mesh primitives:

- 13 skin units: the nine segment IDs other than upper-arm-R/forearm-R, plus right upper bulk, proximal seam half, distal seam half, right forearm bulk.
- Four cloth units: right upper bulk, proximal seam half, distal seam half, right forearm bulk. Each is a real thin sleeve shell with outer/inner surfaces, not a double-sided open sheet.
- Four initially hidden cap templates: proximal/distal skin cap and proximal/distal cloth hem.

Use one primitive per named unit to make ownership unambiguous. Extras on each mesh-bearing node include `assetKey`, `revision`, `unitId`, `lod`, `role`, `segmentId` or `seamId`, allowed joints and initial visibility. No duplicated logical unit in one LOD; the two LOD inventories must match. The source is one figure, not two baked actor copies. Hiding caps in Blender does not replace explicit off-scene runtime visibility initialization.

Basic visible dimensions are technical design data, not medical claims:

| Part | Authoring dimensions |
| --- | --- |
| Pelvis | Ellipsoid half axes `(.16,.12,.10)`, centre `(0,.96,0)` |
| Chest | Ellipsoid half axes `(.20,.21,.11)`, centre `(0,1.255,0)` |
| Head | Ellipsoid half axes `(.105,.16,.105)`, centre `(0,1.62,0)`; top 1.78 m |
| Upper arm | Tapered round segment, radius .055 at shoulder to .048 at proximal seam guard |
| Forearm | Radius .038 at distal seam guard to .030 at wrist; a simple rounded hand silhouette belongs to the same segment/joint |
| Thigh | Tapered radius .085 to .065 |
| Lower leg | Tapered radius .065 to .045, with a small rounded foot extending toward −Z on the same segment/joint |

Other joints can use modest overlapping closed technical volumes because no cut there is claimed; do not hide this as a seamless finished human. Do not apply their allowed overlaps to elbow-R seam validation. Detailed fingers, face, hair, historical garment tailoring and accessories are outside this first core.

LOD0: elbow radial slots 16, other limb radial/axial subdivisions 12/5, torso/pelvis 16/6, head longitude/latitude 16/8. LOD1: elbow 8, other limbs 8/3, torso/pelvis 12/4, head 12/6. Rounded terminal geometry fits the same unit and budgets; do not add unregistered meshes/joints.

## 4. Retained elbow exterior

The deformation half-length is `a=.075 m`. It is **not missing tissue**. Guard centres are `Gprox=E-a u` and `Gdist=E+a v(20°)`. The canonical centreline is `C(s)=E+s u` for `-a<=s<=0` and `E+s v(20°)` for `0<=s<=a`. Ring plane tangent is `T(s)=normalize((1-t)u+t v(20°))`, with `t=(s+a)/(2a)`. Radial basis is `R1=h`, `R2=T cross h`; therefore `R1 cross R2=T`. Central loop uses the same bisector plane for both halves.

Skin radius varies linearly through `r(-.075)=.048`, `r(0)=.042`, `r(.075)=.038` metres. Cloth outer radius is skin radius +.006; inner radius is outer minus .0015. At the guards, bulk geometry duplicates the same position/UV/normal/weight ring. Permanent bulk is single-owner; the source seam halves contain the entire cross-weighted envelope.

LOD0 axial rings (mm): `-75,-56.25,-37.5,-18.75,0,18.75,37.5,56.25,75`. LOD1: `-75,-37.5,0,37.5,75`. Forearm weight `wF=(s+.075)/.15`, upper weight `1-wF`. Guard rings are one-owner; both separately authored central rings are exactly .5/.5. The two central exterior loops and their split vertices must match before and during animation. At a prepared opening both seam halves are **retained as pose-baked replacements**, not hidden with nothing in their place.

This is a feasibility geometry to measure. Standard LBS may pinch or invert it at strong bends; if the actual proof fails, record the defect and propose a narrow authoring correction. Do not silently lower validation tolerances, shorten the clip, introduce ejection, lose exterior geometry or call a failed shape acceptable.

## 5. Pre-authored caps and stable vertex mapping

Each skin cap has the 16/8 central boundary slots and a centre 4 mm inset into its own side along the rest central tangent. Proximal interior is toward −T(0), distal toward +T(0), with opposite outward winding. Cloth hem has outer/inner boundary loops and an intermediate ring of mean radius inset 2 mm into its side. Cap topology, triangle indices, UVs, material role and blend weights are authored before runtime. Central boundary weights/positions equal their exterior counterparts. Interior cap points use the same .5/.5 transform as the central plane. Deliberately hard cap normals do not have to equal smooth exterior normals.

Each relevant source mesh carries one `FLOAT`/`POINT` custom scalar attribute **`_SVH_VERTEX`**, enabled by `export_attributes=True`. Give every semantic source point an integer key representable exactly in float32, range 0..65535. A role/LOD/semantic-ring/slot table in the authoring data and node extras determines the expected local keys and cross-unit ring correspondence; never use raw post-export accessor index as anatomical identity. The table distinguishes outer/inner cloth and cap interior points. UV wrap/normal splits may produce multiple render vertices with one key. Every such split must remain consistent in position and allowed weights and receive the same position update; normals/UV retain their declared face-role discontinuities. Reject a missing/conflicting key or missing expected boundary slot.

The installed exporter was read: it retains supported underscore-prefixed custom attributes when enabled, uppercases names, skips EDGE domain and unsupported types and warns on name collisions. Actual GLB preservation is still a test, including after the selected optimizer. Do not add unused second-UV encoding as another implicit identity source. `TEXCOORD_0` remains ordinary material UV; custom keys are not interpolated as a visible material effect.

The semantic table is structured as `unitId/lod -> { key, surface, ring, slot, role }[]`, with a fixed vocabulary, not author-supplied collision exemptions. For the envelope, surface codes are skin=0, cloth-outer=1, cloth-inner=2; the nine LOD0 axial indices are 0..8, and LOD1 uses indices 0,2,4,6,8. Key is `surfaceCode*4096 + ringIndex*32 + radialSlot`; radialSlot runs 0..15 or 0..7 in that LOD. Guard rings are indices 0 and 8, shared cut ring is 4. Skin cap centre key is 12288; cloth hem intermediate ring keys are 16384+slot. Other bulk semantic points use 32768+local authoring ordinal, below 65536. Keys are local to each named unit/LOD; equality alone never grants adjacency between unrelated units. Independently reconstruct these formulas, expected ring positions/weights and the permitted cross-unit links from the fixed unit roles. Extras cannot introduce an extra allowed overlap or substitute a different ring as the cut boundary.

Validate closed skin and cloth components independently by **declared semantic adjacency plus directed position welding**, not by globally merging unrelated coincident points until holes disappear. Outer/inner sleeve terminal hems belong in their bulk units. A cap pairing with no central boundary, opposite wrong winding, non-manifold edge or mismatched slot is a hard failure. Initial cap pairs can meet at the declared shared boundary; triangle intersections elsewhere are not permitted in the tested elbow envelope. Report any untested geometry relationship explicitly.

### Exact elbow intersection scope

At each sampled pose/LOD, test every unordered triangle pair within and between the active elbow units: intact has eight units (four skin exterior plus four cloth exterior), opened has those eight retained units plus four caps. This gives 36 intact and 78 opened unit-pair relations including each unit against itself; bounds may conservatively cull disjoint pairs but never omit a required relation. The other nine segment units and their intentional technical-joint overlaps are explicitly outside this elbow-intersection proof. Report sample/LOD/state/unit/triangle identities and counters; a coarse bounds overlap is only a candidate, not an intersection result.

The only permitted zero-area contact features are same-unit topological adjacent edges/vertices, named bulk-to-seam guard edges, proximal-to-distal central exterior edges, seam-to-own-cap central edges, and opposite caps' common skin or cloth boundary edge/vertex. Skin never acquires a link to cloth merely because it is close. UV/normal split render vertices represent the same declared semantic point. Reconstruct permitted features from these roles and indices, not an arbitrary authoring exclusion list. Use intersection tolerance **1e-6 m**, separately from the 2e-5 m ring-weld comparison; never weld unrelated points by that distance. Any positive-area coplanar overlap or contact away from a permitted feature is rejected, including between triangles that also share an allowed edge. Do not skip an entire pair because it has a shared slot; compute and classify the remaining intersection locus against that exact feature with the separate tolerance. The 1.5 mm sleeve thickness cannot be consumed by a weld or intersection tolerance. Retain both ordinary adjacent-triangle and same-edge-but-overlapping negative fixtures, as well as skin/cloth penetration and opposite-cap overlap cases.

## 6. Exact pose baking and ownership

At a frozen accepted pose let `A_j(t)=bindMatrixInverse * boneWorld_j(t) * originalInverseBind_j * bindMatrix` in the mesh-local convention used by installed Three. For intact point `p`, `q=sum(w_j A_j(t_cut)[p,1])`. A replacement belonging to component k stores `p_new=inverse(A_k(t_cut))q`, weight 1 to its own bone. Mesh root, bind matrices and original inverse binds remain unchanged. Apply this to every split vertex of both seam halves and the pre-authored caps in both LODs before publication.

For the installed shader path, `s=sum(w_j linear(A_j(t_cut))n)` and `n_new=inverse(linear(A_k(t_cut)))s`. Compare normalized directions after the same object normalMatrix. This is **not** inverse-transpose of the blended LBS matrix. Tangents use the installed vector path and preserve handedness; geometric face normals/winding are validated separately. Reject singular/nonfinite matrices, invalid scales and collapsed shading vectors.

Canonical GLB geometry stays immutable and shareable. Only prepared replacement seam/cap buffers and mutable materials belong to the affected instance. The other actor cannot change. Both LOD preparations are one atomic visual publication, conditioned on the same asset revision, instance generation and pose version. A stale or failed preparation disposes its private buffers and leaves the intact actor unchanged. Repeated commit is no-op or rejected without replacing the already open seam. No new triangles, general plane clipping or joint/mass mutation is involved.

An instance tracks and releases all outstanding uncommitted preparations on destruction. Successful commit transfers replacement buffers to the live instance; disposing the consumed preparation must not release those transferred buffers. Explicit tests cover both cases, along with multiple pending preparations invalidated by the first successful commit. Diagnostics are detached; exposing a render root for Three integration is not permission for callers to mutate canonical geometry or inverse binds.

This first asset API is explicitly a **visual preparation/preview**, not a damage authorization token. Following anatomy work must combine its prepared visual delta with the correct current-contact/graph transaction. The preview cannot be exposed as a shortcut through the live combat debug API.

## 7. Fixed budgets and acceptance measurements

- Exactly three simple PBR material roles: skin, cloth, cap-proof; no texture/image/sampler or external resource. This is not final graphic-versus-neutral gore presentation.
- Exactly 42 mesh primitives across the two LODs, one skin with 11 joints, one animation and at most 64 nodes.
- Total triangles at most 18000 for LOD0 and 6000 for LOD1, including hidden cap templates. Record actual counts; ceilings are not target filler.
- Raw and processed uncompressed GLB at most 2 MiB each; retained `.blend` plus authoring JSON at most 8 MiB. Raw intermediate and reports live only under the explicitly ignored `.cache/technical-figure/`.
- Basis/rest position error at most 2e-6 m; sign-equivalent quaternion chord error at most 2e-6. Exported original inverse binds must agree with the declared rest rig, not only be invertible.
- Ring weld/central correspondence at most 2e-5 m; pose-baked exterior world position at most 5e-5 m; exterior normalized shader-normal dot at least .99995, with pre-normalized length at least 1e-6.
- Weight sums within 2e-6 of 1; valid joint indices; at most four nonzero exported influences overall, at most two in canonical seam/templates and exactly one in active prepared geometry. Wrong live cross-component weights are rejected, not repaired by Three's loader.
- No tested triangle area below 1e-9 m²; no open or non-manifold directed edges in each opened elbow skin/cloth component; no undeclared elbow triangle intersection. Caps' shared cut boundary is expected, not positive separation at that boundary.
- For each canonical elbow triangle, store its unit rest geometric face normal. At each sample, transport that vector by the skin linear transforms with the triangle's mean vertex weights. Reject a transported reference length below 1e-6; require the normalized actual deformed face normal dot this normalized moving reference to be at least .05. This is the explicit sampled orientation/fold predicate, in addition to unsigned area, directed closure and intersection tests. Compare the prepared triangle to the same captured canonical reference; do not redefine the reference after a fold. Retain a reversed/inverted-triangle control. Report the minimum dot, pose and triangle; this local criterion is not a global physiological deformation model.
- Audit all 121 animation samples at both LODs. Verify actual deformation versus either pure-bone alternative at an internal mixed-weight vertex; require at least 5 mm difference at maximum bend so this is not a rigid-box stand-in.

These are predeclared authoring/proof limits, not observed results, complete physiological realism, physical mass acceptance or FPS. They certify the listed predicates at the 121 samples, not every intermediate continuous-time pose. Perceptual pinching, natural silhouette and shading appearance have no claimed numerical acceptance here and remain explicit blockers of the following actual browser visual gate; a numerically closed but visibly implausible elbow is not accepted game art. Strong-bend geometry that fails a listed numerical predicate requires an evidenced contract/shape correction before core acceptance.
