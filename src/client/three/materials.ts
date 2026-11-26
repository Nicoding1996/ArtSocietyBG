import * as THREE from 'three';
import { feltTexture, marbleTexture, toTexture, woodTexture } from './textures';

// Metals stay fairly rough: the chandelier and the picture lights sit almost straight in front of each wall,
// so a mirror-like finish throws their reflections back at the camera as glare over the art.
export const gold = new THREE.MeshStandardMaterial({ color: '#d9b25f', metalness: 1, roughness: 0.38 });
/** Satin gilt for the frames and decor hung on the walls. Polished gold flares where the chandelier reflects off frames that face the camera. */
export const gilt = new THREE.MeshStandardMaterial({ color: '#d9b25f', metalness: 1, roughness: 0.5 });
export const darkGold = new THREE.MeshStandardMaterial({ color: '#a77d32', metalness: 1, roughness: 0.44 });
export const brass = new THREE.MeshStandardMaterial({ color: '#c9a25a', metalness: 0.9, roughness: 0.4 });
export const silver = new THREE.MeshStandardMaterial({ color: '#bfc6cf', metalness: 1, roughness: 0.48 });
export const ivory = new THREE.MeshPhysicalMaterial({ color: '#efe5cf', roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.4 });
export const blackLacquer = new THREE.MeshPhysicalMaterial({ color: '#1a1513', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
export const mirror = new THREE.MeshStandardMaterial({ color: '#cfd8de', metalness: 1, roughness: 0.04 });
// Brighter than white on purpose, so the bloom pass gives each flame a small halo.
export const flame = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(4) });
export const candleWax = new THREE.MeshStandardMaterial({ color: '#f4ecd8', roughness: 0.6, emissive: '#3a2a10', emissiveIntensity: 0.3 });

function lazy<T>(make: () => T): () => T {
  let v: T | null = null;
  return () => (v ??= make());
}

export const walnut = lazy(() => new THREE.MeshStandardMaterial({ map: toTexture(woodTexture(512, '#2a160c', '#6b3f22', 3, 26)), roughness: 0.42 }));
export const mahogany = lazy(() => new THREE.MeshStandardMaterial({ map: toTexture(woodTexture(512, '#2b0f0a', '#6e2c1c', 8, 22)), roughness: 0.38 }));
export const marble = lazy(
  () => new THREE.MeshPhysicalMaterial({ map: toTexture(marbleTexture(512, 11)), color: '#c9c0b2', roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.18 }),
);
export const baize = lazy(() => new THREE.MeshStandardMaterial({ map: toTexture(feltTexture(512, '#1f4a35', 4), true, 3), roughness: 0.92 }));
