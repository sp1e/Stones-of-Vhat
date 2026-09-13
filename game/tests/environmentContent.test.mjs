import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const url = new URL('../src/content/environment/index.ts', import.meta.url);
const api = existsSync(url) ? await import(url.href) : {};
const ledger = new URL('../../docs/environment/source-ledger.md', import.meta.url);
const decisions = new URL('../../docs/environment/decisions.md', import.meta.url);

const LAYERS = new Set(['baseline-1510', 'later-phase', 'time-fracture']);
const EVIDENCE = new Set(['documented', 'interpretation', 'gameplay-invention', 'measured']);
const COLLISION = new Set(['solid', 'overhead', 'surface', 'inset']);
const METADATA = ['objectId', 'componentId', 'intendedYearOrPhase', 'evidenceClass', 'sourcePageFigure',
  'measurementScope', 'uncertainty', 'designChange', 'rightsStatus'];

function requireApi() {
  assert.equal(typeof api.buildEnvironment, 'function', 'buildEnvironment must exist');
  assert.ok(Array.isArray(api.ELEMENT_CATALOGUE), 'ELEMENT_CATALOGUE must be exported');
  assert.ok(Array.isArray(api.PROVENANCE), 'PROVENANCE must be exported');
}
const recordKey = (value) => `${value.objectId}/${value.componentId}`;
const finite = (vector) => [vector.x, vector.y, vector.z].every(Number.isFinite);

// Independent oracle: yaw-aware axis-aligned bounds of an element's visible volume.
function bounds(element) {
  const { geometry: g, position: p } = element;
  const yaw = element.yaw ?? 0;
  const halfXZ = (w, d) => {
    const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
    return [(w * c + d * s) / 2, (w * s + d * c) / 2];
  };
  switch (g.kind) {
    case 'box': { const [hx, hz] = halfXZ(g.size[0], g.size[2]); return box(p, hx, p.y - g.size[1] / 2, p.y + g.size[1] / 2, hz); }
    case 'cylinder': return box(p, g.radius, p.y - g.height / 2, p.y + g.height / 2, g.radius);
    case 'crown': return box(p, g.radius, p.y - g.radius * 0.8, p.y + g.radius * 0.8, g.radius);
    case 'gable-roof': case 'pyramid-roof': {
      const overhang = g.overhang ?? 0;
      const [hx, hz] = halfXZ(g.width + 2 * overhang, g.depth + 2 * overhang);
      return box(p, hx, p.y, p.y + g.rise, hz);
    }
    case 'plane': { const [hx, hz] = halfXZ(g.size[0], g.size[1]); return box(p, hx, p.y, p.y, hz); }
    case 'cobble-patch': { const [hx, hz] = halfXZ(g.size[0], g.size[1]); return box(p, hx, p.y, p.y + g.stoneHeight, hz); }
    default: throw new Error(`unknown geometry ${g.kind}`);
  }
}
function box(p, hx, minY, maxY, hz) { return { minX: p.x - hx, maxX: p.x + hx, minY, maxY, minZ: p.z - hz, maxZ: p.z + hz }; }
function sizes(geometry) {
  switch (geometry.kind) {
    case 'box': return [...geometry.size];
    case 'cylinder': return [geometry.radius, geometry.height];
    case 'crown': return [geometry.radius];
    case 'gable-roof': case 'pyramid-roof': return [geometry.width, geometry.depth, geometry.rise];
    case 'plane': return [...geometry.size];
    case 'cobble-patch': return [...geometry.size, geometry.stoneHeight, geometry.count];
    default: return [];
  }
}
function groundBelow(environment, element) {
  const { x, z } = element.position;
  const tops = environment.elements.filter((candidate) => candidate.role === 'ground').map(bounds)
    .filter((b) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ).map((b) => b.maxY);
  assert.ok(tops.length > 0, `${element.id} has no ground below it`);
  return Math.max(...tops);
}

test('baseline elements have unique ids, finite transforms, positive sizes and a deterministic build', () => {
  requireApi();
  const environment = api.buildEnvironment();
  assert.ok(environment.elements.length > 40, `a route needs real geometry, got ${environment.elements.length}`);
  assert.equal(new Set(environment.elements.map((element) => element.id)).size, environment.elements.length);
  assert.equal(new Set(api.ELEMENT_CATALOGUE.map((element) => element.id)).size, api.ELEMENT_CATALOGUE.length);
  for (const element of environment.elements) {
    assert.ok(COLLISION.has(element.collision), `${element.id} collision ${element.collision}`);
    assert.ok(finite(element.position), `${element.id} position`);
    assert.ok(Number.isFinite(element.yaw ?? 0), `${element.id} yaw`);
    const values = sizes(element.geometry);
    assert.ok(values.length > 0 && values.every((value) => Number.isFinite(value) && value > 0), `${element.id} sizes ${values}`);
  }
  assert.ok(finite(environment.spawn));
  assert.deepEqual(api.buildEnvironment(), environment);
});

test('every element resolves a complete provenance record', () => {
  requireApi();
  const records = new Map(api.PROVENANCE.map((record) => [recordKey(record), record]));
  assert.equal(records.size, api.PROVENANCE.length, 'one record per objectId/componentId');
  for (const element of api.ELEMENT_CATALOGUE) assert.ok(records.has(recordKey(element)), `${element.id} lacks ${recordKey(element)}`);
  for (const record of api.PROVENANCE) {
    for (const field of METADATA) {
      const value = record[field];
      assert.ok(Array.isArray(value) ? value.length > 0 && value.every((item) => item.trim()) : typeof value === 'string' && value.trim(), `${recordKey(record)}.${field}`);
    }
    assert.ok(EVIDENCE.has(record.evidenceClass), `${recordKey(record)} evidence ${record.evidenceClass}`);
    assert.ok(LAYERS.has(record.phase?.layer), `${recordKey(record)} phase layer`);
    if (record.evidenceClass === 'gameplay-invention') assert.match(record.designChange, /DR-\d{2}/, `${recordKey(record)} invention needs a design record`);
    if (record.evidenceClass === 'interpretation' || record.evidenceClass === 'documented') {
      assert.ok(record.sourcePageFigure.some((entry) => /\b[SL]-[A-Z0-9-]+/.test(entry)), `${recordKey(record)} needs a ledger source`);
    }
  }
});

test('cited ledger sources and design records exist in docs/environment', () => {
  requireApi();
  assert.ok(existsSync(ledger) && existsSync(decisions), 'source ledger and decisions must exist');
  const ledgerIds = new Set([...readFileSync(ledger, 'utf8').matchAll(/^\| ([SL]-[A-Z0-9-]+) \|/gm)].map((match) => match[1]));
  const decisionIds = new Set([...readFileSync(decisions, 'utf8').matchAll(/^## (DR-\d{2})\b/gm)].map((match) => match[1]));
  assert.ok(ledgerIds.size >= 8 && decisionIds.size >= 3);
  for (const record of api.PROVENANCE) {
    const text = [...record.sourcePageFigure, record.designChange].join(' ');
    for (const [id] of text.matchAll(/\b[SL]-[A-Z0-9]+(?:-[A-Z0-9]+)*/g)) assert.ok(ledgerIds.has(id), `${recordKey(record)} cites unknown ${id}`);
    for (const [id] of text.matchAll(/DR-\d{2}/g)) assert.ok(decisionIds.has(id), `${recordKey(record)} cites unknown ${id}`);
  }
});

test('no geometry is presented as measured and the Linköping report is never a measurement source', () => {
  requireApi();
  for (const record of api.PROVENANCE) {
    assert.notEqual(record.evidenceClass, 'measured', `${recordKey(record)} claims measured geometry`);
    assert.match(record.measurementScope, /^none\b/, `${recordKey(record)} measurement scope`);
    if (record.sourcePageFigure.some((entry) => entry.includes('S-OLM-2007-66'))) {
      assert.match(record.sourcePageFigure.join(' '), /comparative/i, `${recordKey(record)} must mark ÖLM 2007:66 as comparative only`);
    }
  }
});

test('the 1510 baseline excludes later phases that exist in the catalogue', () => {
  requireApi();
  const layers = new Map(api.PROVENANCE.map((record) => [recordKey(record), record.phase.layer]));
  const later = api.ELEMENT_CATALOGUE.filter((element) => layers.get(recordKey(element)) !== 'baseline-1510');
  assert.ok(later.some((element) => element.objectId === 'radhuset' && /lantern/.test(element.componentId)), 'negative control: the 1691 lantern must exist in the catalogue');
  const environment = api.buildEnvironment();
  const ids = new Set(environment.elements.map((element) => element.id));
  const bodyIds = new Set(environment.bodies.map((body) => body.id));
  for (const element of later) {
    assert.equal(ids.has(element.id), false, `${element.id} leaked into baseline elements`);
    assert.equal(bodyIds.has(element.id), false, `${element.id} leaked into baseline collision`);
  }
  for (const element of environment.elements) assert.equal(layers.get(recordKey(element)), 'baseline-1510', element.id);
  for (const key of ['radhuset/lantern-1691', 'radhuset/roof-1776', 'st-per/choir-alteration-1576', 'st-per/demolition-1829']) {
    assert.ok(layers.has(key) && layers.get(key) !== 'baseline-1510', `${key} must be recorded outside the baseline`);
  }
});

test('Rådhus tower hypotheses both build and differ only in tower components', () => {
  requireApi();
  const partial = api.buildEnvironment({ towerHypothesis: 'partial' });
  const complete = api.buildEnvironment({ towerHypothesis: 'complete' });
  assert.deepEqual(api.buildEnvironment(), partial, 'partial is the documented default');
  const a = new Map(partial.elements.map((element) => [element.id, element]));
  const b = new Map(complete.elements.map((element) => [element.id, element]));
  const changed = [...new Set([...a.keys(), ...b.keys()])].filter((id) => JSON.stringify(a.get(id)) !== JSON.stringify(b.get(id)));
  assert.ok(changed.length > 0, 'the two hypotheses must be visibly different');
  for (const id of changed) {
    const element = a.get(id) ?? b.get(id);
    assert.ok(element.objectId === 'radhuset' && element.componentId.startsWith('tower'), `${id} changed outside the tower`);
  }
  const towerRecords = api.PROVENANCE.filter((record) => record.objectId === 'radhuset' && record.componentId.startsWith('tower'));
  assert.ok(towerRecords.length >= 2 && towerRecords.every((record) => /uncertain|conflict|hypothesis/i.test(record.uncertainty)));
});

test('solid elements are exactly the collision bodies; other classes cannot fake physical space', () => {
  requireApi();
  const environment = api.buildEnvironment();
  const solids = environment.elements.filter((element) => element.collision === 'solid');
  assert.equal(environment.bodies.length, solids.length);
  const bodies = new Map(environment.bodies.map((body) => [body.id, body]));
  for (const element of solids) {
    const body = bodies.get(element.id);
    assert.ok(body, `${element.id} has no body`);
    assert.equal(body.mass, undefined, `${element.id} must be static`);
    assert.deepEqual(body.position, element.position);
    const yaw = element.yaw ?? 0;
    assert.deepEqual(body.rotation ?? { x: 0, y: 0, z: 0, w: 1 }, { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
    if (element.geometry.kind === 'box') assert.deepEqual(body.shape, { kind: 'box', size: element.geometry.size });
    else if (element.geometry.kind === 'cylinder') assert.deepEqual(body.shape, { kind: 'cylinder', radius: element.geometry.radius, height: element.geometry.height });
    else assert.fail(`${element.id} solid geometry ${element.geometry.kind} has no collider shape`);
  }
  // Ground slabs are solid too; excluding them keeps "rests on a solid" and "inside a solid" non-vacuous.
  const solidBounds = solids.filter((element) => element.role !== 'ground').map((element) => ({ element, b: bounds(element) }));
  for (const element of environment.elements) {
    const b = bounds(element);
    if (element.collision === 'surface') {
      const ground = groundBelow(environment, element);
      assert.ok(b.maxY <= ground + 0.03 + 1e-9 && b.minY >= ground - 1e-9, `${element.id} surface top ${b.maxY} over ground ${ground}`);
    } else if (element.collision === 'overhead') {
      const ground = groundBelow(environment, element);
      const restsOnSolid = solidBounds.some(({ b: s }) => Math.abs(s.maxY - b.minY) < 0.02 && s.minX < b.maxX && s.maxX > b.minX && s.minZ < b.maxZ && s.maxZ > b.minZ);
      // yard.ts: standing eye = 0.86 + 0.55 + 0.3 - 0.1 = 1.61 m; jump apex adds 5.5²/(2·18) = 0.84 m → 2.45 m.
      assert.ok(b.minY >= ground + 2.6 || restsOnSolid, `${element.id} overhead bottom ${b.minY} is within reach`);
    } else if (element.collision === 'inset') {
      const tolerance = 0.05;
      assert.ok(solidBounds.some(({ b: s }) => b.minX >= s.minX - tolerance && b.maxX <= s.maxX + tolerance
        && b.minY >= s.minY - tolerance && b.maxY <= s.maxY + tolerance && b.minZ >= s.minZ - tolerance && b.maxZ <= s.maxZ + tolerance), `${element.id} inset is not contained by a solid`);
    }
  }
});

test('route content: six house variants, three tree forms, limited cobbles and whole landmark silhouettes', () => {
  requireApi();
  const environment = api.buildEnvironment();
  const objects = new Set(environment.elements.map((element) => element.objectId));
  assert.equal([...objects].filter((id) => id.startsWith('house-variant-')).length, 6);
  assert.ok([...objects].filter((id) => id.startsWith('tree-form-')).length >= 3);
  const stPer = new Set(environment.elements.filter((element) => element.objectId === 'st-per').map((element) => element.componentId));
  for (const component of ['west-tower', 'nave', 'choir']) assert.ok(stPer.has(component), `S:t Per lacks ${component}`);
  assert.ok(environment.elements.some((element) => element.objectId === 'radhuset' && element.componentId === 'hall-core'));
  const materials = new Set(environment.elements.filter((element) => element.collision === 'surface').map((element) => element.material));
  for (const material of ['packed-earth', 'worn-grass', 'stone-patch', 'cobbles']) assert.ok(materials.has(material), `surface ${material}`);
  const area = (element) => element.geometry.size[0] * element.geometry.size[1];
  const cobbleArea = environment.elements.filter((element) => element.geometry.kind === 'cobble-patch').reduce((sum, element) => sum + area(element), 0);
  const { minX, maxX, minZ, maxZ } = environment.bounds;
  assert.ok(cobbleArea > 0 && cobbleArea / ((maxX - minX) * (maxZ - minZ)) < 0.08, `cobble share ${cobbleArea}`);
});

test('Storgata is not a straight modern street: facade lines and headings vary', () => {
  requireApi();
  const walls = api.buildEnvironment().elements.filter((element) => /^storgata-[we]\d[a-z]?-walls/.test(element.id));
  const west = walls.filter((element) => element.id.startsWith('storgata-w')).map((element) => bounds(element).maxX);
  const east = walls.filter((element) => element.id.startsWith('storgata-e')).map((element) => bounds(element).minX);
  assert.ok(west.length >= 4 && east.length >= 4, `street rows ${west.length}/${east.length}`);
  assert.ok(Math.max(...west) - Math.min(...west) >= 0.3, `west facade spread ${west}`);
  assert.ok(Math.max(...east) - Math.min(...east) >= 0.3, `east facade spread ${east}`);
  const headings = new Set(walls.map((element) => element.yaw.toFixed(3)));
  assert.ok(headings.size >= 4, `facade headings ${[...headings]}`);
  const narrowest = Math.min(...east) - Math.max(...west);
  const widest = Math.max(...east) - Math.min(...west);
  assert.ok(narrowest > 4 && widest < 7.5, `Storgata stays constrained: ${narrowest}..${widest}`);
});

test('future landmark anchors are documented without geometry or skyline placement', () => {
  requireApi();
  for (const objectId of ['vadstena-slott', 'marten-skinnares-hus', 'klosterkyrkan']) {
    const records = api.PROVENANCE.filter((record) => record.objectId === objectId);
    assert.ok(records.length > 0, `${objectId} anchor record`);
    assert.equal(api.ELEMENT_CATALOGUE.filter((element) => element.objectId === objectId).length, 0, `${objectId} must not have geometry`);
  }
  const castle = api.PROVENANCE.find((record) => record.objectId === 'vadstena-slott');
  assert.equal(castle.phase.layer, 'time-fracture');
  assert.equal(castle.phase.fromYear, 1545);
  assert.ok(api.PROVENANCE.filter((record) => record.objectId === 'marten-skinnares-hus').every((record) => record.phase.layer !== 'baseline-1510'));
});
