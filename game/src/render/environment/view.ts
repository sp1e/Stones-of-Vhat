import * as THREE from 'three';
import type { Environment } from '../../content/environment/index.ts';
import type { YardSnapshot } from '../../physics/yard.ts';
import { buildEnvironmentScene } from './sceneBuilder.ts';
import type { EnvironmentScene } from './sceneBuilder.ts';

// First-person view of the environment blockout. Reads snapshots only; never writes to physics.
// Overcast late-day light (DR-12): readable thresholds, restrained warmth, distance fog for depth.

const SKY = '#8f989b';
const SUN_OFFSET = new THREE.Vector3(-26, 30, 34);

export type EnvironmentView = ReturnType<typeof createEnvironmentView>;

export function createEnvironmentView(host: HTMLElement) {
  // Throws when WebGL is unavailable; the caller must create the view before physics, listeners or frames.
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', 'Förstapersonsvy genom miljöprovet från Rådhuset till S:t Per');
  canvas.tabIndex = -1;
  host.append(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 38, 190);
  const camera = new THREE.PerspectiveCamera(72, 1, 0.06, 420);
  camera.rotation.order = 'YXZ';
  // A warm ground bounce keeps undersides (portik lintel, eaves) readable instead of black.
  scene.add(new THREE.HemisphereLight('#c6cdce', '#7a6c58', 1.75));
  const sun = new THREE.DirectionalLight('#ffdcae', 2.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 140 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  let environment: EnvironmentScene | null = null;
  let disposed = false;
  const from = new THREE.Vector3(), to = new THREE.Vector3();

  function resize(): void {
    if (disposed) return;
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  return {
    canvas,
    setEnvironment(next: Environment): void {
      if (disposed) return;
      if (environment) {
        scene.remove(environment.root);
        environment.dispose();
      }
      environment = buildEnvironmentScene(next);
      scene.add(environment.root);
    },
    render(snapshot: YardSnapshot, alpha: number, yaw: number, pitch: number): void {
      if (disposed) return;
      from.set(snapshot.player.previousEye.x, snapshot.player.previousEye.y, snapshot.player.previousEye.z);
      to.set(snapshot.player.eye.x, snapshot.player.eye.y, snapshot.player.eye.z);
      camera.position.lerpVectors(from, to, THREE.MathUtils.clamp(alpha, 0, 1));
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
      // The shadow frustum follows the player so a 132 m route keeps sharp local shadows.
      sun.target.position.copy(camera.position);
      sun.position.copy(camera.position).add(SUN_OFFSET);
      sun.target.updateMatrixWorld();
      renderer.render(scene, camera);
    },
    diagnostics() {
      return {
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        scene: environment?.stats() ?? null,
      };
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      if (environment) {
        scene.remove(environment.root);
        environment.dispose();
        environment = null;
      }
      sun.shadow.map?.dispose();
      renderer.renderLists.dispose();
      renderer.dispose();
      scene.clear();
      canvas.remove();
    },
  };
}
