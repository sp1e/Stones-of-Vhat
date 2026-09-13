import type { EvidenceClass, Phase, ProvenanceRecord } from './types.ts';

// One record per objectId/componentId. Ledger IDs resolve in docs/environment/source-ledger.md and
// DR-nn in docs/environment/decisions.md (tested). No record claims measured geometry.

const BASELINE: Phase = { layer: 'baseline-1510' };
const BASELINE_TEXT = 'c. 1510 working baseline (design date, not a claim that every detail existed)';
const AUTHORED = 'none: authored blockout dimensions; no measured geometry used';
const NO_GEOMETRY = 'none: no geometry authored for this record';
const SELF = 'self-authored procedural blockout geometry and colours; no third-party asset';
const LINK_ONLY = 'no asset; cited documents are link-only and their reuse rights are unverified';

type Fields = {
  intendedYearOrPhase?: string; phase?: Phase; evidenceClass: EvidenceClass; sourcePageFigure: readonly string[];
  measurementScope?: string; uncertainty: string; designChange: string; rightsStatus?: string;
};
const record = (objectId: string, componentId: string, fields: Fields): ProvenanceRecord => ({
  objectId, componentId,
  intendedYearOrPhase: fields.intendedYearOrPhase ?? BASELINE_TEXT,
  phase: fields.phase ?? BASELINE,
  evidenceClass: fields.evidenceClass,
  sourcePageFigure: fields.sourcePageFigure,
  measurementScope: fields.measurementScope ?? AUTHORED,
  uncertainty: fields.uncertainty,
  designChange: fields.designChange,
  rightsStatus: fields.rightsStatus ?? SELF,
});
const invention = (objectId: string, componentId: string, designChange: string, uncertainty: string, sources: readonly string[] = ['design record only']) =>
  record(objectId, componentId, { evidenceClass: 'gameplay-invention', sourcePageFigure: sources, uncertainty, designChange });

const HOUSE_COMPONENTS: Readonly<Record<string, readonly string[]>> = {
  h1: ['plinth', 'walls', 'roof', 'openings', 'threshold'],
  h2: ['plinth', 'walls', 'roof', 'openings', 'threshold'],
  h3: ['plinth', 'walls-ground', 'walls-upper', 'roof', 'openings', 'threshold'],
  h4: ['plinth', 'walls', 'roof', 'lean-to', 'lean-to-roof', 'openings', 'threshold'],
  h5: ['plinth', 'walls', 'lintel', 'passage-sill', 'passage-floor', 'roof', 'openings'],
  h6: ['plinth', 'walls', 'roof', 'rear-store', 'rear-store-roof', 'openings', 'threshold'],
};
const houseRecords = Object.entries(HOUSE_COMPONENTS).flatMap(([variant, components]) => components.map((component) =>
  invention(`house-variant-${variant}`, component, 'DR-04 house kit; collision class per DR-10',
    'modest late-medieval domestic volume; size, openings, plinth and roofing material are not sourced',
    ['L-HISTORY-ENV §4 (six compatible house types)', 'L-CHAPTER-SPEC §7'])));

const radhus = [
  record('radhuset', 'hall-core', {
    intendedYearOrPhase: 'medieval hall core, c. 1460 or c. 1490 (sources conflict), standing in 1510',
    evidenceClass: 'interpretation',
    sourcePageFigure: ['S-RADHUS-KOMMUN (hall 1460)', 'S-RADHUS-BEBR (possible hall c. 1490)', 'L-HISTORY-ENV §1'],
    uncertainty: 'chronology conflict; footprint, height and wall material are invented blockout values',
    designChange: 'DR-01 placement; DR-02 hypothesis handling' }),
  record('radhuset', 'hall-roof', { evidenceClass: 'interpretation', sourcePageFigure: ['S-RADHUS-KOMMUN (later lantern 1691 and roof 1776 excluded)', 'L-HISTORY-ENV §1'],
    uncertainty: 'medieval roof form unknown; simple gable placeholder avoids the 1776 roof', designChange: 'DR-02' }),
  invention('radhuset', 'hall-openings', 'DR-04 inset openings; DR-10', 'door and window positions invented'),
  record('radhuset', 'tower-partial', {
    intendedYearOrPhase: 'tower walls begun, shown as a stump in 1510 (hypothesis A, default)',
    evidenceClass: 'interpretation',
    sourcePageFigure: ['S-OLM-2007-66 pp. 5–6, comparative reproduction only of S-ZACHRISSON-2001 pp. 84/86', 'L-HISTORY-ENV §1'],
    uncertainty: 'hypothesis A of two; tower state in 1510 uncertain because sources conflict; height invented',
    designChange: 'DR-02 default hypothesis' }),
  record('radhuset', 'tower-complete', {
    intendedYearOrPhase: 'tower completed early 1500s (hypothesis B, selectable)',
    evidenceClass: 'interpretation', sourcePageFigure: ['S-RADHUS-KOMMUN (tower early 1500s)', 'L-HISTORY-ENV §1'],
    uncertainty: 'hypothesis B of two; completion date and form uncertain because sources conflict', designChange: 'DR-02 alternative' }),
  record('radhuset', 'tower-complete-roof', {
    intendedYearOrPhase: 'roof of hypothesis B tower', evidenceClass: 'interpretation', sourcePageFigure: ['S-RADHUS-KOMMUN', 'L-HISTORY-ENV §1'],
    uncertainty: 'hypothesis B roof form unknown; not today\'s cap', designChange: 'DR-02 alternative' }),
  record('radhuset', 'lantern-1691', {
    intendedYearOrPhase: 'lantern added 1691', phase: { layer: 'later-phase', fromYear: 1691 }, evidenceClass: 'documented',
    sourcePageFigure: ['S-RADHUS-KOMMUN (lantern 1691)'], uncertainty: 'form of the blockout is invented; excluded from the 1510 baseline',
    designChange: 'DR-02 kept only as excluded negative-control geometry' }),
  record('radhuset', 'roof-1776', {
    intendedYearOrPhase: 'broken roof 1776', phase: { layer: 'later-phase', fromYear: 1776 }, evidenceClass: 'documented',
    sourcePageFigure: ['S-RADHUS-KOMMUN (roof 1776)'], measurementScope: NO_GEOMETRY,
    uncertainty: 'ledger record only; excluded from the 1510 baseline', designChange: 'DR-02', rightsStatus: LINK_ONLY }),
];

const stPerSources = ['S-STPER-KOMMUN (whole three-aisled church; 42 m not used)', 'L-HISTORY-ENV §1'];
const stPer = [
  record('st-per', 'west-tower', { intendedYearOrPhase: 'medieval west tower of the whole church (Rödtornet), standing in 1510',
    evidenceClass: 'interpretation', sourcePageFigure: stPerSources,
    uncertainty: 'height, top, openings and brick/limestone mix unknown; placement authored', designChange: 'DR-03' }),
  record('st-per', 'west-tower-roof', { evidenceClass: 'interpretation', sourcePageFigure: stPerSources,
    uncertainty: 'medieval tower top unknown; pyramid is a placeholder silhouette', designChange: 'DR-03' }),
  record('st-per', 'nave', { intendedYearOrPhase: 'three-aisled nave standing in 1510', evidenceClass: 'interpretation', sourcePageFigure: stPerSources,
    uncertainty: 'aisle arrangement, wall height and roof form unknown; read as one hall volume', designChange: 'DR-03' }),
  record('st-per', 'nave-roof', { evidenceClass: 'interpretation', sourcePageFigure: stPerSources,
    uncertainty: 'roof pitch and covering unknown', designChange: 'DR-03' }),
  record('st-per', 'choir', { intendedYearOrPhase: 'pre-1576 choir', evidenceClass: 'interpretation', sourcePageFigure: stPerSources,
    uncertainty: 'pre-1576 choir form unknown; 1576 alteration excluded', designChange: 'DR-03' }),
  record('st-per', 'choir-roof', { evidenceClass: 'interpretation', sourcePageFigure: stPerSources, uncertainty: 'roof form unknown', designChange: 'DR-03' }),
  invention('st-per', 'openings', 'DR-03 silhouette openings; DR-10', 'portal and window positions invented'),
  record('st-per', 'choir-alteration-1576', { intendedYearOrPhase: 'choir alteration 1576', phase: { layer: 'later-phase', fromYear: 1576 },
    evidenceClass: 'documented', sourcePageFigure: ['S-STPER-KOMMUN (1576)'], measurementScope: NO_GEOMETRY,
    uncertainty: 'ledger record only; not the 1510 baseline', designChange: 'DR-03', rightsStatus: LINK_ONLY }),
  record('st-per', 'demolition-1829', { intendedYearOrPhase: 'church demolished 1829', phase: { layer: 'later-phase', fromYear: 1829 },
    evidenceClass: 'documented', sourcePageFigure: ['S-STPER-KOMMUN (1829)'], measurementScope: NO_GEOMETRY,
    uncertainty: 'ledger record only; not the 1510 baseline', designChange: 'DR-03', rightsStatus: LINK_ONLY }),
  record('st-per', 'freestanding-tower-and-school', { intendedYearOrPhase: 'freestanding Rödtornet and later school after 1829',
    phase: { layer: 'later-phase', fromYear: 1829 }, evidenceClass: 'documented', sourcePageFigure: ['S-STPER-KOMMUN', 'L-HISTORY-ENV §1'],
    measurementScope: NO_GEOMETRY, uncertainty: 'ledger record only; today\'s tower and school are excluded', designChange: 'DR-03', rightsStatus: LINK_ONLY }),
];

const churchyard = [
  invention('st-per-churchyard', 'plateau', 'DR-07', 'raised churchyard level is a gameplay invention, not a sourced level'),
  invention('st-per-churchyard', 'enclosure-wall', 'DR-06', 'a churchyard enclosure is plausible but its line, height and material are invented; not a city wall',
    ['L-HISTORY-ENV §5 (enclosure is not a city wall)']),
  invention('st-per-churchyard', 'gate-steps', 'DR-07', 'step heights chosen for autostep, not sourced'),
  invention('st-per-churchyard', 'gate-posts', 'DR-06', 'gate form invented'),
];

const connective = [
  invention('site-ground', 'base', 'DR-01; DR-05 smooth ground collider', 'flat authored ground; real micro-topography and shore are unknown'),
  invention('route-surfaces', 'packed-earth', 'DR-05', 'distribution of earth, grass and stone surfaces in 1510 is not sourced', ['L-HISTORY-ENV §5']),
  invention('route-surfaces', 'worn-grass', 'DR-05', 'grass placement invented; species not asserted', ['L-HISTORY-ENV §5']),
  invention('route-surfaces', 'stone-patch', 'DR-05', 'stone patches invented at thresholds and wells', ['L-HISTORY-ENV §5']),
  record('route-surfaces', 'cobbles', { evidenceClass: 'interpretation',
    sourcePageFigure: ['S-BAKGATAN-2009 (local older paving, uncertain dating)', 'L-HISTORY-ENV §5'],
    uncertainty: 'local paving exists but city-wide 1510 cobbles are not documented; patches kept small', designChange: 'DR-05 cobble share under 8 %' }),
  invention('plot-boundaries', 'plank-fence', 'DR-06', 'plot lines and fence type invented; no city wall', ['L-HISTORY-ENV §5']),
  invention('plot-boundaries', 'closed-gate', 'DR-06 blocked threshold', 'gate invented for the blocked-threshold test'),
  invention('plot-boundaries', 'gate-post', 'DR-06', 'post form invented'),
  invention('open-space-cover', 'cart', 'DR-09', 'static placeholder for a later physical prop'),
  invention('open-space-cover', 'timber-stack', 'DR-09', 'static placeholder cover'),
  invention('open-space-cover', 'wall-fragment', 'DR-09', 'invented low wall for cover; no sourced structure'),
  invention('courtyard-furnishing', 'well', 'DR-09', 'well position invented; S-RADHUSTORG-2020 mentions a well at the square, not here'),
  ...['broad', 'pollard', 'fruit'].flatMap((form) => [
    invention(`tree-form-${form}`, 'trunk', 'DR-08', 'self-authored form; species, age and placement not asserted'),
    invention(`tree-form-${form}`, 'crown', 'DR-08', 'self-authored crown; species and season not asserted'),
  ]),
];

const anchors = [
  record('vadstena-slott', 'anchor', { intendedYearOrPhase: 'separate time-fracture layer from 1545; never ordinary 1510',
    phase: { layer: 'time-fracture', fromYear: 1545 }, evidenceClass: 'documented',
    sourcePageFigure: ['S-SLOTT-SFV (construction begins 1545)', 'S-SFV-VARLDSLIGA (about thirty plots displaced)', 'L-HISTORY-ENV §1'],
    measurementScope: NO_GEOMETRY, uncertainty: 'unplaced future anchor; no location, form or skyline placement claimed',
    designChange: 'DR-01 anchor only', rightsStatus: LINK_ONLY }),
  record('marten-skinnares-hus', 'anchor-stone-part-1519', { intendedYearOrPhase: 'western stone part 1519 (plot donation is a separate fact)',
    phase: { layer: 'later-phase', fromYear: 1519 }, evidenceClass: 'documented', sourcePageFigure: ['S-MARTEN-KOMMUN', 'L-HISTORY-ENV §1'],
    measurementScope: NO_GEOMETRY, uncertainty: 'dating conflict; unplaced; not a securely dated 1510 object', designChange: 'DR-01 anchor only', rightsStatus: LINK_ONLY }),
  record('marten-skinnares-hus', 'anchor-brick-house-1587', { intendedYearOrPhase: 'brick house 1587',
    phase: { layer: 'later-phase', fromYear: 1587 }, evidenceClass: 'documented', sourcePageFigure: ['S-MARTEN-KOMMUN'],
    measurementScope: NO_GEOMETRY, uncertainty: 'later phase; unplaced', designChange: 'DR-01 anchor only', rightsStatus: LINK_ONLY }),
  record('marten-skinnares-hus', 'anchor-1520s-attribution', { intendedYearOrPhase: '1520s attribution',
    phase: { layer: 'later-phase', fromYear: 1520 }, evidenceClass: 'documented', sourcePageFigure: ['S-MARTEN-SFV'],
    measurementScope: NO_GEOMETRY, uncertainty: 'conflicts with the municipal dating; unplaced', designChange: 'DR-01 anchor only', rightsStatus: LINK_ONLY }),
  record('klosterkyrkan', 'anchor-medieval-components', { intendedYearOrPhase: 'medieval church with raised roof and bell tower after 1455',
    evidenceClass: 'documented', sourcePageFigure: ['S-KLOSTER-MONO printed pp. 59–64, fig. 66', 'L-HISTORY-ENV §2'],
    measurementScope: NO_GEOMETRY, uncertainty: 'medieval profile is partly research reconstruction; unplaced, no skyline placement',
    designChange: 'DR-01 anchor only', rightsStatus: LINK_ONLY }),
  record('klosterkyrkan', 'nineteenth-century-roof', { intendedYearOrPhase: '1890s roof', phase: { layer: 'later-phase', fromYear: 1890 },
    evidenceClass: 'documented', sourcePageFigure: ['S-KLOSTER-MONO fig. 66'], measurementScope: NO_GEOMETRY,
    uncertainty: 'today\'s silhouette is not the medieval default', designChange: 'DR-01 anchor only', rightsStatus: LINK_ONLY }),
];

export const PROVENANCE: readonly ProvenanceRecord[] = [...houseRecords, ...radhus, ...stPer, ...churchyard, ...connective, ...anchors];
