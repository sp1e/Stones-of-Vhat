import * as THREE from 'three';
import type { ArmSnapshot } from '../physics/armFixture.ts';
import type { RigidTransform } from '../physics/poseBinding.ts';
import { armTraceFrame } from './armLabTrace.ts';
import type { ArmContactFrame } from './armContactFrame.ts';
import type { ArmSlicerBlade, ArmSlicerTerminalRecord } from './armSlicer.ts';

export type ArmLabSpell = {
  castId: string;
  projectileId: string;
  blade: ArmSlicerBlade;
  position: { x: number; y: number; z: number };
};
export type ArmLabViewState = {
  nativeSampleIndex?: number | null;
  activeSlicers?: readonly ArmLabSpell[];
  lastCast?: ArmSlicerTerminalRecord | null;
  contactInspection?: { frame: ArmContactFrame; record: ArmSlicerTerminalRecord } | null;
};

/** One reusable view; simulation owns every segment pose. */
export function createArmLabView(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', 'Två fysiska armsegment med markerade masscentrum och ledankare');
  host.append(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#273b34');
  const camera = new THREE.PerspectiveCamera(42, 1, .03, 40);
  camera.position.set(-1.7, 2.2, 3.2);
  camera.lookAt(-.05, .75, 0);
  scene.add(new THREE.HemisphereLight('#e5efdd', '#2d3930', 2));
  const key = new THREE.DirectionalLight('#ffe7bb', 3);
  key.position.set(-3, 5, 4);
  scene.add(key);

  const objects: THREE.Mesh[] = [];
  function mesh(geometry: THREE.BufferGeometry, color: string) {
    const item = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color, roughness: .7, metalness: .08,
    }));
    objects.push(item);
    scene.add(item);
    return item;
  }
  const upper = mesh(new THREE.BoxGeometry(.4, .09, .09), '#c39255');
  const lower = mesh(new THREE.BoxGeometry(.4, .09, .09), '#e2be83');
  const floor = mesh(new THREE.BoxGeometry(10, .2, 10), '#657466');
  floor.position.set(0, -.1, 0);
  const wall = mesh(new THREE.BoxGeometry(.2, 20, 10), '#8d9988');
  wall.position.set(.65, 5, 0);
  const com = [0, 1].map(() => mesh(new THREE.SphereGeometry(.014, 12, 8), '#7fe0dc'));
  const anchors = [0, 1].map(() => mesh(new THREE.SphereGeometry(.011, 12, 8), '#f47e68'));
  for (const marker of [...com, ...anchors]) {
    marker.renderOrder = 2;
    marker.material.depthTest = false;
    marker.material.transparent = true;
    marker.material.opacity = .95;
  }
  const grid = new THREE.GridHelper(4, 16, '#8b9c87', '#566b5c');
  grid.position.y = .002;
  scene.add(grid);
  const axes = [0, 1].map(() => [.12, .18, .24].map(size => {
    const helper = new THREE.AxesHelper(size);
    helper.renderOrder = 3;
    for (const material of Array.isArray(helper.material) ? helper.material : [helper.material]) {
      material.depthTest = false;
      material.depthWrite = false;
      material.transparent = true;
      material.opacity = 0;
    }
    scene.add(helper);
    return helper;
  }));

  const bladeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const bladeMaterial = new THREE.MeshStandardMaterial({
    color: '#dceff0', emissive: '#73989a', emissiveIntensity: .35,
    roughness: .32, metalness: .18, transparent: true, opacity: .9,
  });
  const activeBlades = Array.from({ length: 8 }, () => {
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.visible = false;
    blade.renderOrder = 4;
    scene.add(blade);
    return blade;
  });
  const inspectionBlade = new THREE.Mesh(bladeGeometry, bladeMaterial);
  inspectionBlade.visible = false;
  inspectionBlade.renderOrder = 4;
  scene.add(inspectionBlade);

  const pathPositions = new Float32Array(6);
  const pathGeometry = new THREE.BufferGeometry();
  pathGeometry.setAttribute('position', new THREE.BufferAttribute(pathPositions, 3));
  const pathMaterial = new THREE.LineBasicMaterial({ color: '#c9e4e3', transparent: true, opacity: .82 });
  const path = new THREE.Line(pathGeometry, pathMaterial);
  path.visible = false;
  path.renderOrder = 4;
  scene.add(path);

  const normalPositions = new Float32Array(6);
  const normalGeometry = new THREE.BufferGeometry();
  normalGeometry.setAttribute('position', new THREE.BufferAttribute(normalPositions, 3));
  const normalMaterial = new THREE.LineBasicMaterial({ color: '#e8c474' });
  const contactNormal = new THREE.Line(normalGeometry, normalMaterial);
  contactNormal.visible = false;
  contactNormal.renderOrder = 5;
  scene.add(contactNormal);

  const witnessGeometry = new THREE.SphereGeometry(.013, 10, 6);
  const projectileWitnessMaterial = new THREE.MeshBasicMaterial({ color: '#dceff0', depthTest: false });
  const targetWitnessMaterial = new THREE.MeshBasicMaterial({ color: '#e8c474', depthTest: false });
  const projectileWitness = new THREE.Mesh(witnessGeometry, projectileWitnessMaterial);
  const targetWitness = new THREE.Mesh(witnessGeometry, targetWitnessMaterial);
  projectileWitness.visible = false;
  targetWitness.visible = false;
  projectileWitness.renderOrder = 5;
  targetWitness.renderOrder = 5;
  scene.add(projectileWitness, targetWitness);

  let disposed = false;
  const setPose = (item: THREE.Object3D, pose: RigidTransform) => {
    item.position.set(pose.position.x, pose.position.y, pose.position.z);
    item.quaternion.set(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w);
  };
  const setBlade = (item: THREE.Mesh, blade: ArmSlicerBlade, position: { x: number; y: number; z: number }) => {
    item.position.set(position.x, position.y, position.z);
    item.quaternion.identity();
    if (blade === 'horizontal') item.scale.set(.12, .01, .12);
    else item.scale.set(.01, .12, .12);
    item.visible = true;
  };
  const setLine = (line: THREE.Line, values: Float32Array, from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }) => {
    values.set([from.x, from.y, from.z, to.x, to.y, to.z]);
    const attribute = line.geometry.getAttribute('position') as THREE.BufferAttribute;
    attribute.needsUpdate = true;
    line.geometry.computeBoundingSphere();
    line.visible = true;
  };
  const resize = () => {
    if (disposed) return;
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  return {
    canvas,
    render(snapshot: ArmSnapshot, state: ArmLabViewState = {}): void {
      if (disposed) return;
      const sampleIndex = state.nativeSampleIndex ?? null;
      const historical = state.contactInspection?.frame
        ?? (sampleIndex === null ? null : armTraceFrame(snapshot, sampleIndex));
      const segments = historical?.segments ?? snapshot.segments;
      const selectedAnchors = historical?.anchorsWorld ?? snapshot.metrics.anchorsWorld;
      for (const [index, item] of [upper, lower].entries()) {
        const segment = segments[index]!;
        setPose(item, segment.colliderWorld);
        const center = segment.comWorld;
        com[index]!.position.set(center.x, center.y, center.z);
        const anchor = selectedAnchors[index]!;
        anchors[index]!.position.set(anchor.x, anchor.y, anchor.z);
        const poses = [segment.bodyOriginWorld, segment.boneWorld, segment.colliderWorld];
        for (const [axisIndex, pose] of poses.entries()) {
          const helper = axes[index]![axisIndex]!;
          setPose(helper, pose);
          for (const material of Array.isArray(helper.material) ? helper.material : [helper.material]) {
            material.opacity = historical ? 1 : 0;
          }
        }
      }
      for (let index = 0; index < activeBlades.length; index++) {
        const spell = state.activeSlicers?.[index];
        const blade = activeBlades[index]!;
        blade.visible = false;
        if (spell) setBlade(blade, spell.blade, spell.position);
      }
      inspectionBlade.visible = false;
      path.visible = false;
      contactNormal.visible = false;
      projectileWitness.visible = false;
      targetWitness.visible = false;
      const selected = state.contactInspection?.record;
      const shownPath = selected ?? state.lastCast;
      if (shownPath) {
        setLine(path, pathPositions, shownPath.startPosition, shownPath.terminalPosition);
        pathMaterial.color.set(shownPath.kind === 'blocked' || shownPath.kind === 'unresolved' ? '#d7a95a' : '#c9e4e3');
      }
      if (selected) {
        setBlade(inspectionBlade, selected.blade, selected.terminalPosition);
        if (selected.kind === 'hit' && selected.family.kind === 'hit') {
          const geometry = selected.family.hit.geometry;
          projectileWitness.position.set(
            geometry.projectileWitnessWorld.x,
            geometry.projectileWitnessWorld.y,
            geometry.projectileWitnessWorld.z,
          );
          targetWitness.position.set(
            geometry.targetWitnessWorld.x,
            geometry.targetWitnessWorld.y,
            geometry.targetWitnessWorld.z,
          );
          projectileWitness.visible = true;
          targetWitness.visible = true;
          setLine(contactNormal, normalPositions, geometry.targetWitnessWorld, {
            x: geometry.targetWitnessWorld.x + geometry.targetNormalWorld.x * .12,
            y: geometry.targetWitnessWorld.y + geometry.targetNormalWorld.y * .12,
            z: geometry.targetWitnessWorld.z + geometry.targetNormalWorld.z * .12,
          });
        }
      }
      renderer.render(scene, camera);
    },
    resources() {
      return {
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
        visible: {
          activeBlades: activeBlades.filter(blade => blade.visible).length,
          path: path.visible,
          inspectionBlade: inspectionBlade.visible,
          witnesses: Number(projectileWitness.visible) + Number(targetWitness.visible),
          normal: contactNormal.visible,
        },
      };
    },
    destroy(): void {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      for (const item of objects) {
        item.geometry.dispose();
        const materials = Array.isArray(item.material) ? item.material : [item.material];
        for (const material of materials) material.dispose();
        scene.remove(item);
      }
      objects.length = 0;
      grid.geometry.dispose();
      for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) material.dispose();
      for (const group of axes) for (const helper of group) {
        helper.geometry.dispose();
        for (const material of Array.isArray(helper.material) ? helper.material : [helper.material]) material.dispose();
        scene.remove(helper);
      }
      for (const blade of activeBlades) scene.remove(blade);
      scene.remove(inspectionBlade, path, contactNormal, projectileWitness, targetWitness);
      bladeGeometry.dispose();
      bladeMaterial.dispose();
      pathGeometry.dispose();
      pathMaterial.dispose();
      normalGeometry.dispose();
      normalMaterial.dispose();
      witnessGeometry.dispose();
      projectileWitnessMaterial.dispose();
      targetWitnessMaterial.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
