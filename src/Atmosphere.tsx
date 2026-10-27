import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EVIDENCE } from './story';
import type { Evidence, GalleryId } from './story';
import { createPresence, stepPresence } from './presence';

export type Haunt = { caption: string; sound: 'creak' | 'knocks' | 'presence' | 'recede' | 'footstep'; side: number; veil?: boolean };

function RainAndDust({ reducedMotion }: { reducedMotion: boolean }) {
  const rain = useRef<THREE.InstancedMesh>(null);
  const dust = useRef<THREE.Points>(null);
  const transform = useMemo(() => new THREE.Object3D(), []);
  const positions = useMemo(() => {
    const result = new Float32Array(100 * 3);
    for (let i = 0; i < 100; i++) {
      result[i * 3] = Math.sin(i * 127.1) * 4.6;
      result[i * 3 + 1] = .5 + (Math.sin(i * 311.7) * .5 + .5) * 5;
      result[i * 3 + 2] = Math.cos(i * 74.7) * 7;
    }
    return result;
  }, []);
  useFrame(({ clock }) => {
    const time = reducedMotion ? 0 : clock.elapsedTime;
    if (rain.current) {
      for (let i = 0; i < 54; i++) {
        const window = Math.floor(i / 18);
        const phase = (i * 1.719 + time * (1.1 + i % 3 * .18)) % 4.3;
        transform.position.set(-5.16, 5.2 - phase, -5 + window * 5 + (i % 6 - 2.5) * .39);
        transform.rotation.set(0, Math.PI / 2, -.12);
        transform.updateMatrix();
        rain.current.setMatrixAt(i, transform.matrix);
      }
      rain.current.instanceMatrix.needsUpdate = true;
    }
    if (dust.current) dust.current.rotation.y = Math.sin(time * .012) * .05;
  });
  return <>
    <instancedMesh ref={rain} args={[undefined, undefined, 54]} frustumCulled={false}>
      <planeGeometry args={[.008, .38]}/><meshBasicMaterial color="#a3c1bc" transparent opacity={.23} depthWrite={false}/>
    </instancedMesh>
    <points ref={dust}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]}/></bufferGeometry>
      <pointsMaterial color="#a4b4a0" size={.012} transparent opacity={.35} depthWrite={false}/></points>
  </>;
}
function Footprints({ evidence, material }: { evidence: Evidence; material: THREE.MeshBasicMaterial }) {
  const sign = evidence.position[0] < 0 ? 1 : -1;
  return <group>{Array.from({ length: 6 }, (_, index) => <group key={index}
    position={[evidence.position[0] + sign * (.8 + index * .27), .027, evidence.position[2] + index * .09]}
    rotation={[0, sign * Math.PI / 2, 0]}>
    <mesh position={[index % 2 ? .075 : -.075, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={[.14, .32]}/>
    </mesh>
  </group>)}</group>;
}

export default function Atmosphere({ active, restored, reducedMotion, flashlight, gallery, onHaunt, discovered, confirmedCount }: {
  active: boolean; restored: boolean; reducedMotion: boolean; flashlight: boolean;
  gallery: GalleryId; onHaunt: (event: Haunt) => void; discovered: string[]; confirmedCount: number;
}) {
  const { camera } = useThree();
  const beam = useRef<THREE.SpotLight>(null), bulb = useRef<THREE.PointLight>(null);
  const figure = useRef<THREE.Group>(null), leftArm = useRef<THREE.Group>(null), rightArm = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Object3D(), []), direction = useMemo(() => new THREE.Vector3(), []);
  const progress = discovered.length + confirmedCount * 2;
  const presence = useRef(createPresence(progress));
  const time = useRef(0), lastArrival = useRef(-10), lastStep = useRef(0), trailUntil = useRef(0);
  const [trail, setTrail] = useState<Evidence | null>(null);
  const materials = useMemo(() => {
    const cloth = new THREE.MeshStandardMaterial({ color: '#17211d', roughness: 1, transparent: true });
    const face = new THREE.MeshStandardMaterial({ color: '#7d8676', roughness: 1, transparent: true, emissive: '#18211b', emissiveIntensity: .25 });
    const imprint = document.createElement('canvas'); imprint.width = 64; imprint.height = 128;
    const context = imprint.getContext('2d')!;
    context.fillStyle = '#b2c9b4';
    context.beginPath(); context.ellipse(32, 43, 19, 31, -.1, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.ellipse(32, 100, 15, 18, 0, 0, Math.PI * 2); context.fill();
    const texture = new THREE.CanvasTexture(imprint);
    const prints = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, color: '#a7bba2' });
    return { cloth, face, prints, texture };
  }, []);
  useEffect(() => () => { materials.cloth.dispose(); materials.face.dispose(); materials.prints.dispose(); materials.texture.dispose(); }, [materials]);
  useEffect(() => {
    presence.current = createPresence(progress); time.current = 0; lastArrival.current = -10;
    lastStep.current = 0; trailUntil.current = 0; setTrail(null);
  // Discovery changes deliberately accelerate the current encounter instead of restarting it.
  }, [gallery]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, .1);
    if (active) time.current += dt;
    camera.getWorldDirection(direction);
    if (beam.current) {
      beam.current.position.copy(camera.position); beam.current.position.y -= .12;
      target.position.copy(camera.position).addScaledVector(direction, 12); target.updateMatrixWorld();
      beam.current.intensity = active && flashlight ? 95 : 0;
    }
    const result = stepPresence(presence.current, { dt, active, restored, flashlight, reducedMotion, progress,
      x: camera.position.x, z: camera.position.z, forwardX: direction.x, forwardZ: direction.z });
    presence.current = result.state;
    const state = result.state;
    const relativeX = state.x - camera.position.x, relativeZ = state.z - camera.position.z;
    const side = THREE.MathUtils.clamp((relativeX * -direction.z + relativeZ * direction.x) / 5, -.9, .9);
    if (result.event === 'arrival') {
      lastArrival.current = time.current;
      onHaunt({ caption: '[Other footsteps. Turn your light toward them.]', sound: 'presence', side });
    } else if (result.event === 'noticed') {
      onHaunt({ caption: '[It recoils from the light. Keep the beam steady.]', sound: 'creak', side });
    } else if (result.event === 'repelled') {
      const record = EVIDENCE.filter(record => record.gallery === gallery && !discovered.includes(record.id))
        .sort((a, b) => Math.hypot(a.position[0] - camera.position.x, a.position[2] - camera.position.z)
          - Math.hypot(b.position[0] - camera.position.x, b.position[2] - camera.position.z))[0];
      setTrail(record ?? null); trailUntil.current = time.current + 11;
      onHaunt({ caption: record ? '[The shadow gives way. Wet footprints lead toward an unexamined object.]' : '[The shadow gives way. The room exhales.]', sound: 'recede', side });
    } else if (result.event === 'close') {
      onHaunt({ caption: '[Cold passes through you. Your records are still in your hands.]', sound: 'presence', side, veil: true });
    }
    if (active && state.phase === 'approaching' && time.current - lastStep.current > 1.1) {
      lastStep.current = time.current;
      onHaunt({ caption: '', sound: 'footstep', side });
    }
    if (figure.current) {
      figure.current.visible = active && !restored && state.phase !== 'quiet';
      figure.current.position.set(state.x, 0, state.z);
      figure.current.rotation.y = Math.atan2(camera.position.x - state.x, camera.position.z - state.z);
      const fade = state.phase === 'retreating' ? Math.max(0, 1 - state.age / 1.8) : Math.min(1, state.age / .7) * (1 - state.exposure * .45);
      materials.cloth.opacity = fade * .94; materials.face.opacity = fade * .75;
      const swing = reducedMotion ? 0 : Math.sin(time.current * 2.5) * .13;
      if (leftArm.current) leftArm.current.rotation.x = swing;
      if (rightArm.current) rightArm.current.rotation.x = -swing;
    }
    materials.prints.opacity = active && flashlight && !restored ? .35 * Math.max(0, Math.min(1, (trailUntil.current - time.current) / 2)) : 0;
    if (bulb.current) {
      const age = time.current - lastArrival.current;
      const dip = active && !restored && !reducedMotion && age < 1.8 ? 1 - .8 * Math.sin(Math.PI * Math.max(0, age) / 1.8) : 1;
      bulb.current.intensity = (restored ? 28 : 5) * dip;
    }
  });
  return <>
    <RainAndDust reducedMotion={reducedMotion}/>
    <primitive object={target}/>
    <spotLight ref={beam} target={target} color="#e9ddbd" angle={.39} penumbra={.78} distance={19} decay={1.7}/>
    <pointLight ref={bulb} position={[1, 4.9, -3]} color={restored ? '#f1c17e' : '#a8b5a0'} distance={13} decay={2}/>
    {trail && <Footprints evidence={trail} material={materials.prints}/>}
    <group ref={figure} visible={false}>
      <mesh position={[0, 2.13, 0]} scale={[.8, 1.13, .85]} material={materials.face}><sphereGeometry args={[.18, 16, 14]}/></mesh>
      <mesh position={[0, 1.1, 0]} material={materials.cloth}><cylinderGeometry args={[.24, .36, 1.5, 12]}/></mesh>
      <mesh position={[0, 1.73, 0]} scale={[1, .6, .65]} material={materials.cloth}><sphereGeometry args={[.33, 16, 12]}/></mesh>
      <group ref={leftArm} position={[-.29, 1.68, 0]} rotation={[0, 0, -.12]}>
        <mesh position={[0, -.49, 0]} material={materials.cloth}><capsuleGeometry args={[.075, .85, 4, 8]}/></mesh>
        <mesh position={[0, -1.03, .01]} material={materials.face}><sphereGeometry args={[.065, 10, 8]}/></mesh>
      </group>
      <group ref={rightArm} position={[.29, 1.68, 0]} rotation={[0, 0, .12]}>
        <mesh position={[0, -.49, 0]} material={materials.cloth}><capsuleGeometry args={[.075, .85, 4, 8]}/></mesh>
        <mesh position={[0, -1.03, .01]} material={materials.face}><sphereGeometry args={[.065, 10, 8]}/></mesh>
      </group>
      {[-.13, .13].map(x => <mesh key={x} position={[x, .22, .03]} material={materials.cloth}><capsuleGeometry args={[.08, .29, 4, 8]}/></mesh>)}
    </group>
  </>;
}
