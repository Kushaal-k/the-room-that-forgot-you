import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { GalleryId } from './story';

export type Haunt = { caption: string; sound: 'creak' | 'knocks'; side: number };
export default function Atmosphere({ active, restored, reducedMotion, flashlight, gallery, onHaunt }: {
  active: boolean; restored: boolean; reducedMotion: boolean; flashlight: boolean;
  gallery: GalleryId; onHaunt: (event: Haunt) => void;
}) {
  const { camera } = useThree();
  const beam = useRef<THREE.SpotLight>(null);
  const bulb = useRef<THREE.PointLight>(null);
  const figure = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const schedule = useRef({ elapsed: 0, next: 11, glimpse: -10, count: 0 });
  useEffect(() => { schedule.current = { elapsed: 0, next: 11, glimpse: -10, count: 0 }; }, [gallery]);
  useFrame((_, delta) => {
    const state = schedule.current;
    if (active) state.elapsed += Math.min(delta, .1);
    camera.getWorldDirection(direction);
    if (beam.current) {
      beam.current.position.copy(camera.position);
      beam.current.position.y -= .12;
      target.position.copy(camera.position).addScaledVector(direction, 12);
      target.updateMatrixWorld();
      beam.current.intensity = active && flashlight ? 95 : 0;
    }
    if (active && !restored && state.elapsed > state.next) {
      state.count++;
      state.glimpse = state.elapsed;
      state.next += 24 + (state.count % 3) * 7;
      onHaunt({ caption: state.count % 2 ? '[A floorboard creaks behind you.]' : '[Three knocks from the other side of the wall.]',
        sound: state.count % 2 ? 'creak' : 'knocks', side: state.count % 2 ? -.8 : .8 });
    }
    const age = state.elapsed - state.glimpse;
    if (bulb.current) {
      // A single slow dip, never repeated flashes. Reduced motion removes the dip.
      const dip = active && !restored && !reducedMotion && age < 1.8
        ? 1 - .85 * Math.sin(Math.PI * Math.max(0, age) / 1.8) : 1;
      bulb.current.intensity = (restored ? 28 : 5) * dip;
    }
    if (figure.current) {
      const distance = camera.position.distanceTo(figure.current.position);
      figure.current.visible = active && !restored && !reducedMotion && age > .35 && age < 2.3 && distance > 3.5;
      figure.current.position.x = state.count % 2 ? 1.1 : -1.1;
    }
  });
  return <>
    <primitive object={target}/>
    <spotLight ref={beam} target={target} color="#e9ddbd" angle={.39} penumbra={.78} distance={19} decay={1.7}/>
    <pointLight ref={bulb} position={[1, 4.9, -3]} color={restored ? '#f1c17e' : '#a8b5a0'} distance={13} decay={2}/>
    <group ref={figure} position={[1.1, 0, -6.6]} visible={false}>
      <mesh position={[0, 1.72, 0]}><sphereGeometry args={[.14, 12, 10]}/><meshBasicMaterial color="#060a09"/></mesh>
      <mesh position={[0, .96, 0]}><coneGeometry args={[.36, 1.42, 12]}/><meshBasicMaterial color="#060a09"/></mesh>
    </group>
  </>;
}
