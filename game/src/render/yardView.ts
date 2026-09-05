import * as THREE from 'three';
import type { BodyDefinition } from '../content/yardLayout.ts';
import type { YardSnapshot } from '../physics/yard.ts';

export type YardView = ReturnType<typeof createYardView>;

function createStoneTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Kunde inte skapa gårdens stentextur.');
  context.fillStyle = '#77766b';
  context.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row += 1) {
    const width = 64;
    const height = 32;
    const offset = row % 2 === 0 ? 0 : -width / 2;
    for (let column = -1; column < 5; column += 1) {
      const x = offset + column * width;
      const tone = 108 + ((row * 19 + column * 11 + 29) % 17);
      context.fillStyle = `rgb(${tone + 5} ${tone + 4} ${tone - 2})`;
      context.fillRect(x + 2, row * height + 2, width - 4, height - 4);
      context.strokeStyle = 'rgb(65 68 62 / 42%)';
      context.strokeRect(x + 1.5, row * height + 1.5, width - 3, height - 3);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function geometryFor(definition: BodyDefinition): THREE.BufferGeometry {
  switch (definition.shape.kind) {
    case 'box': return new THREE.BoxGeometry(...definition.shape.size);
    case 'cylinder': return new THREE.CylinderGeometry(definition.shape.radius, definition.shape.radius, definition.shape.height, 20);
    case 'ball': return new THREE.IcosahedronGeometry(definition.shape.radius, 2);
  }
}

export function createYardView(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', 'Tredimensionell teknikgård i förstapersonsvy');
  canvas.tabIndex = -1;
  host.append(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#53625c');
  scene.fog = new THREE.Fog('#53625c', 20, 60);
  const camera = new THREE.PerspectiveCamera(75, 1, 0.06, 80);
  camera.rotation.order = 'YXZ';
  scene.add(new THREE.HemisphereLight('#b9c9c3', '#3e3b32', 1.25));
  const sun = new THREE.DirectionalLight('#ffe0a8', 2.6);
  sun.position.set(-8, 18, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 45;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);

  const texture = createStoneTexture(renderer);
  const worldRoot = new THREE.Group();
  const meshes = new Map<string, THREE.Mesh>();
  scene.add(worldRoot);
  let disposed = false;

  function disposeWorldMeshes(): void {
    for (const mesh of meshes.values()) {
      worldRoot.remove(mesh);
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) material.dispose();
    }
    meshes.clear();
  }

  function resize(): void {
    if (disposed) return;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function reset(layout: readonly BodyDefinition[]): void {
    if (disposed) return;
    disposeWorldMeshes();
    for (const definition of layout) {
      const material = new THREE.MeshStandardMaterial({
        color: definition.color,
        roughness: 0.92,
        metalness: 0.02,
        map: definition.id === 'floor' ? texture : null,
      });
      const mesh = new THREE.Mesh(geometryFor(definition), material);
      mesh.name = definition.id;
      mesh.position.set(definition.position.x, definition.position.y, definition.position.z);
      const rotation = definition.rotation ?? { x: 0, y: 0, z: 0, w: 1 };
      mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      mesh.castShadow = definition.id !== 'floor';
      mesh.receiveShadow = true;
      meshes.set(definition.id, mesh);
      worldRoot.add(mesh);
    }
  }

  const oldPosition = new THREE.Vector3();
  const currentPosition = new THREE.Vector3();
  const oldRotation = new THREE.Quaternion();
  const currentRotation = new THREE.Quaternion();
  function render(snapshot: YardSnapshot, alpha: number, yaw: number, pitch: number): void {
    if (disposed) return;
    const blend = THREE.MathUtils.clamp(alpha, 0, 1);
    for (const pose of snapshot.bodies) {
      const mesh = meshes.get(pose.id);
      if (!mesh) continue;
      oldPosition.set(pose.previousPosition.x, pose.previousPosition.y, pose.previousPosition.z);
      currentPosition.set(pose.position.x, pose.position.y, pose.position.z);
      mesh.position.lerpVectors(oldPosition, currentPosition, blend);
      oldRotation.set(pose.previousRotation.x, pose.previousRotation.y, pose.previousRotation.z, pose.previousRotation.w);
      currentRotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w);
      mesh.quaternion.slerpQuaternions(oldRotation, currentRotation, blend);
    }
    oldPosition.set(snapshot.player.previousEye.x, snapshot.player.previousEye.y, snapshot.player.previousEye.z);
    currentPosition.set(snapshot.player.eye.x, snapshot.player.eye.y, snapshot.player.eye.z);
    camera.position.lerpVectors(oldPosition, currentPosition, blend);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    renderer.render(scene, camera);
  }

  function diagnostics(): { geometries: number; textures: number; programs: number } {
    return { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs?.length ?? 0 };
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    disposeWorldMeshes();
    texture.dispose();
    sun.shadow.map?.dispose();
    renderer.renderLists.dispose();
    renderer.dispose();
    scene.clear();
    canvas.remove();
  }

  resize();
  return { canvas, reset, render, resize, diagnostics, dispose };
}
