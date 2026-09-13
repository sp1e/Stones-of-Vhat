import * as THREE from 'three';
import type { ArmSnapshot } from '../physics/armFixture.ts';
import type { RigidTransform } from '../physics/poseBinding.ts';
import { armTraceFrame } from './armLabTrace.ts';

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

  let disposed = false;
  const setPose = (item: THREE.Object3D, pose: RigidTransform) => {
    item.position.set(pose.position.x, pose.position.y, pose.position.z);
    item.quaternion.set(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w);
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
    render(snapshot: ArmSnapshot, sampleIndex: number | null = null): void {
      if (disposed) return;
      const historical = sampleIndex === null ? null : armTraceFrame(snapshot, sampleIndex);
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
      renderer.render(scene, camera);
    },
    resources() {
      return {
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
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
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
