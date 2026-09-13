# Installed character exporter — bounded read-only inventory

2026-09-13, coordinator plus independent Sol/high inspection while the Live Slicer writer owns runtime code. **No character generated, exported, rendered or accepted. No installation or saved Blender preference.** This records the actual local tool contract needed by the companion anatomy-asset next-slice brief, not a finished pipeline.

## Tool versions and availability

| Item | Observed evidence |
| --- | --- |
| Blender |5.2.1LTS, build hash9e2066aef7ef, build2026-08-25; executable `C:/Program Files/Blender Foundation/Blender 5.2/blender.exe`; parent repeated `--version` |
| Official bundled glTF exporter |5.2.40, declares Blender5.2.0 compatibility; `5.2/scripts/addons_core/io_scene_gltf2/__init__.py` under the Blender install |
| Export operator |Read-only background/factory-startup RNA probe confirmed `bpy.ops.export_scene.gltf` and relevant flag names |
| Native compression bridges |Probe returned Draco/Meshopt available; both bundled bridge DLLs exist. Availability is not a decoded-runtime acceptance |
| Three loader modules |Installed Three has GLTFLoader, SkeletonUtils, DRACOLoader, KTX2Loader and Meshopt decoder; no project imports of these found |
| glTF Transform / Khronos gltf-validator |Not found on PATH, global npm list, project dependencies or project `.bin`; `npx` availability is not installed-tool evidence and was not used |
| gltfpack |No executable found on PATH or under the Blender install; a configured external binary is separate |

The background inspection did not open a GUI, save preferences, export assets or issue a network request. The inventory is machine-local and should be rechecked before an installation/export task; no package versions were invented or installed here.

## Supported first-proof recipe, still to exercise with an authored file

Use one dedicated export collection and one intended runtime armature. Author source in Blender-native metres,+Z up, forward+Y; verify the exported result is runtime+Y up/forward−Z with `export_yup=True`. The actual project validator must measure that basis rather than rely on a name or convention claim.

The inspected operator supports the following proposed settings. They are explicit **inputs for the future retained exporter**, not an executed export or its validation result:

```python
export_format='GLB'
collection=asset_collection_name
use_selection=False
use_visible=False
use_renderable=False
use_active_collection=False
export_yup=True
export_apply=False
export_extras=True
export_attributes=False
export_skins=True
export_influence_nb=4
export_all_influences=False
export_def_bones=False
export_armature_object_remove=False
export_leaf_bone=False
export_hierarchy_flatten_bones=False
export_hierarchy_flatten_objs=False
export_rest_position_armature=True
export_animations=True
export_animation_mode='ACTIVE_ACTIONS'
export_nla_strips_merged_animation_name='arm_elbow_proof'
export_force_sampling=True
export_frame_step=1
export_frame_range=True
export_current_frame=False
export_optimize_animation_size=False
export_draco_mesh_compression_enable=False
export_meshopt_compression_enable=False
export_use_gltfpack=False
export_materials='EXPORT'
export_cameras=False
export_lights=False
```

Apply source object transforms explicitly before export; `export_apply` concerns modifiers and is not a magical scale repair. Keep the first proof uncompressed to isolate skin/cap/identity defects from decoder and quantization changes; run the selected upstream optimization/validation gate before a shipping claim. Do not enable both compression switches just because the exporter exposes both.

`export_def_bones=False` is intentional only because the technical export rig contains runtime-intended bones and no control rig. A later animation control rig should bake to an explicit export rig. Root removal, hierarchy flattening and synthetic leaf joints remain off so named body/bind/attachment mappings cannot disappear silently. Rest-position armature must remain enabled; wounded current pose cannot become an accidental new bind pose.

## Concrete installed-source hazards

- `io_scene_gltf2/blender/exp/joints.py` assigns Blender bone names to joint nodes and adds `_leaf` for synthetic leaves; extras are gathered separately. Ordinary node naming is in `blender/exp/nodes.py`. Durable unique game IDs belong in validated custom properties/extras in addition to readable names, with uniqueness checked before `getObjectByName`-style runtime lookup.
- `blender/exp/primitive_attributes.py` truncates influences beyond the configured count and normalizes the retained weights. Parent read that exact implementation. Validate the source has≤4 nonzero allowed influences, then verify actual exported JOINTS_0/WEIGHTS_0, sums and segment allowlists. Exporter success alone cannot certify an unaltered skin.
- `export_rest_position_armature` is explicitly described in installed RNA as choosing rest versus current-frame pose for joints. `ACTIVE_ACTIONS` merges assigned actions into one glTF animation; keep a named deliberate proof action and verify its actual channels/times after export.
- No exporter collision property was found. Named Empty nodes/extras can carry the project's rigid proxy data, but those are our schema, not automatically working Rapier bodies.
- Export both LOD segment/cap inventories even if caps are initially hidden. Configure per-instance `defaultVisible:false`-style extras off-scene before first render; hiding an object in Blender is not the runtime injury lifecycle.

## Required proof after export

Read actual GLB accessors/hierarchy: one intended skin, finite inverse binds, expected joint/name/game-ID mapping, valid skin attributes and weights, closed caps with winding/normals/UV/materials, matching LOD logical inventory and explicit finite positive collider data. Source geometry must have no triangle or nonzero weight spanning the opened elbow seam. Clothing is subject to the same constraint.

Clone the one canonical rig twice in the runtime; do not bake two copies into the source as a substitute for the instance test. Skeleton/bone state, cap visibility and mutable damage materials must be per instance; shared immutable geometry is allowed. Exercise animation and damage/LOD transitions on just one instance while the other remains unchanged. Graph/mass/ownership, blood presentation and Windows GLB policy remain separate downstream proofs documented in the next-slice brief.

## Installed Three loader and clone ownership — coordinator source read

At approximately 12:14 UTC the coordinator read the installed `SkeletonUtils.js` completely and the relevant `GLTFLoader.js`, `Skeleton.js` and `SkinnedMesh.js` methods. This is source/interface evidence, not an imported model or runtime proof.

- `GLTFLoader.load()` obtains an ArrayBuffer through FileLoader, then parses it; `parseAsync(data, path)` wraps the same parser. No model-wide `dispose()` or task-generation cancellation appears in that loader interface. A future owner must distinguish stale publication from request cancellation and release the resources actually returned to it. Do not claim a generation check aborts an already running parser.
- The loader calls `normalizeSkinWeights()` when constructing a SkinnedMesh. **Validate the original GLB weight accessors before loading**, as well as the runtime mapping afterwards; otherwise a malformed weight sum can be silently repaired before our supposed rejection test sees it. The exporter has a separate truncation/normalization hazard described above.
- `SkeletonUtils.clone()` requires all bones to be descendants of the cloned root. It remaps cloned mesh skeletons to cloned bones, while geometry and materials remain shared by reference. Clone mutable presentation materials deliberately; do not dispose shared canonical geometry when only one instance goes away.
- `Skeleton.clone()` supplies the existing `boneInverses` array to a new Skeleton, so those rest inverse matrices are shared unless deliberately deep-copied. Treat them as immutable; never call `calculateInverses()` or mutate a shared matrix to make an opened pose look correct. A bind call with an explicit original bind matrix avoids the implicit inverse recalculation in `SkinnedMesh.bind()`.
- Skeleton GPU textures are instance resources disposed via `Skeleton.dispose()`. Different cloned SkinnedMesh objects may hold distinct Skeleton objects referencing the same cloned bones; track and release the actual unique skeleton instances, not merely one per logical rig name.
- `SkinnedMesh.computeBoundingBox/Sphere()` traverses skinned positions, and its documented cached sphere is not automatically recomputed for every animated pose. Choose and test conservative bounds or an explicit update policy. A rest-pose bound is not acceptance for bent or detached presentation.

These requirements feed the still-draft authored-figure plan. No source loader, package, asset or desktop-policy change has been made.

## Validator/optimizer registry check — no installation

At11:34–11:35UTC on2026-09-13, parent opened the official [Khronos validator repository](https://github.com/KhronosGroup/glTF-Validator) and [glTF Transform CLI documentation](https://gltf-transform.dev/cli), and queried npm registry metadata with `npm view`. Registry answers are availability evidence, not installed packages or an audit:

- `gltf-validator` latest reported `2.0.0-dev.3.10`, repository `KhronosGroup/glTF-Validator`, integrity `sha512-odJ4k0tRkGXiDGn78yDBg+fBbAIvBnXxh3RwAta0emSxGtyagFE8B4xELB1oYe3S5RD8Ci3uZAsZaascH2LAEQ==`.
- `@gltf-transform/cli` reported `4.5.0`, Node engine `>=20`, integrity `sha512-0i/qco9bR1tva3wI7iksrdcQoZmgFn4WFMJnKOWqXWdX/a2T+mrNomfGUEfFqMSI26JPSZXqasXyHiytiEpodQ==`. Its published dependency list includes the Khronos validator plus Sharp, meshoptimizer and Draco. This is a larger tool dependency graph than merely reading a GLB.

The official CLI supports selective operations and warns that its combined optimization defaults may not fit every scene. For this anatomical asset, do not apply a generic flatten/join/simplify/prune recipe that can remove proxy, cap, attachment or stable-ID nodes. Prefer a retained selective lossless pass and validate both input/output against our contract; inspect installed help/source after a future explicit pinned local dev-tool installation. No runtime decoder is needed for the uncompressed first proof. No global install, package/lock modification, fetched executable, source asset upload or model export occurred during this registry check.
