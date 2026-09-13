# Design records — environment blockout

Invented dimensions and placements are recorded here instead of being attributed to a source. Every
`DR-nn` cited in `game/src/content/environment/provenance.ts` must exist below (tested). Dated 2026-09-13.

## DR-01 Authored route topology and distances

The route follows the *topological* plan in L-HISTORY-ENV §4: Rådhus approach → constrained street →
physical passage or side alley → open space with cover and retreat → S:t Per. Every distance is authored
blockout metres chosen for walk time and sightlines. World axes are not georeferenced and imply no compass
alignment. No 1642-map reproduction or modern GIS block was traced. Walk times are measured with the real
capsule in `docs/environment/measurements.md`, not claimed historical distances.

## DR-02 Rådhus tower: default hypothesis `partial`, alternative `complete`

Sources conflict (S-RADHUS-KOMMUN: tower early 1500s; S-RADHUS-BEBR: cautious; Zachrisson via
S-OLM-2007-66, comparative only: tower walls begun before 1567). The lab defaults to walls begun to a
stump because it claims less. `complete` is selectable for comparison. Both are hypotheses; neither
footprint nor height is measured. The 1691 lantern exists only as an excluded `later-phase` catalogue
element (negative control); the 1776 roof is a ledger record without geometry.

## DR-03 S:t Per blockout proportions

Whole church as a silhouette: west tower (medieval Rödtornet), three-aisled nave read as one hall volume,
narrower choir. Tower 9 × 9 × 32 m, nave 27 × 18 m, choir 10 × 10 m are invented for legibility and
orientation. The 42 m length in S-STPER-KOMMUN merges phases and is deliberately not used. Pre-1576 choir
form, roof pitch and wall material mix are unknown; brick tower colour is interpretation.

## DR-04 House variant kit H1–H6

Six parametric variants: H1 booth, H2 gable-timber, H3 stone ground floor with timber upper, H4 narrow
gable with rear lean-to, H5 portik house with 2.6 × 2.6 m gateway, H6 low workshop. Width, depth, wall
and roof heights are invented at human scale. Roofing material is not sourced; colours are neutral
placeholders. Doors and windows are insets on solid walls, so no opening looks passable unless it is.

## DR-05 Mixed ground surfaces and limited cobbles

One smooth ground collider with packed earth; worn grass, stone patches and a few cobble patches on top
as render-only surfaces ≤ 0.03 m high. S-BAKGATAN-2009 documents only local older paving with uncertain
dating, so cobbles stay under 8 % of the map rectangle (tested). Large edges and steps are real colliders.

## DR-06 Enclosures: churchyard wall, plank plot fences, one closed gate

A stone churchyard enclosure around S:t Per; plank fences for plot boundaries; one closed plank gate as
the blocked threshold. No city wall (none verified). The monastery wall of S-KLOSTERMUR-KOMMUN is not
placed here. A possible ditch is not modelled.

## DR-07 Churchyard plateau and gate steps

The churchyard sits 0.45 m above the street, reached by two step blocks (tops 0.15 and 0.30 m, treads
0.45 m). This is a gameplay invention for a readable threshold that exercises autostep (max 0.25 m, min
width 0.35 m in `yard.ts`), loosely motivated by raised burial ground; it is not a sourced level.

## DR-08 Tree forms

Three self-authored forms: broad crown, pollard, small fruit tree. Species, age and exact placement are
not asserted. Trees stand in yards and the open space, not evenly along the street (L-CHAPTER-SPEC §7).
Trunks are cylinder colliders; crowns are render-only above 2.6 m.

## DR-09 Cover in the open space and courtyard furnishing

Cart, timber stack, low wall fragment and a well are static blockout colliders giving cover, sightline
breaks and retreat choices. They are placeholders for later physical props; none is dynamic here.

## DR-10 Collision classes and reach thresholds

`solid` emits a static body with identical transform; `overhead` must rest on a non-ground solid or start
≥ 2.6 m above ground (standing eye 1.61 m, jump apex eye ≈ 2.45 m from `yard.ts`); `surface` ≤ 0.03 m;
`inset` lies inside a solid expanded by 0.05 m.

## DR-11 No modern straight street or square

Storgata is built from separately placed houses with varied facade lines (≥ 0.3 m spread) and small
headings (tested). The open space is bounded irregularly by houses, fences and the churchyard wall. This
avoids projecting today's regulated streets and squares (S-HASSELMO-1982 pp. 60–63, S-OP2040) backwards.

## DR-12 Lighting and atmosphere

Overcast late-day light with restrained warm key, cool fill and distance fog. Unease comes from occluded
thresholds and narrow sightlines, not darkness; the route must stay legible (render-only decision).
