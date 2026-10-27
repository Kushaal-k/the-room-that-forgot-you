import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import Atmosphere from './Atmosphere';
import type { Haunt } from './Atmosphere';
import { isWalkable, nearbyInteraction } from './gameplay';
import type { Interaction } from './gameplay';
import * as THREE from 'three';
import { EVIDENCE, GALLERIES, isGalleryRestored } from './story';
import type { Evidence, GalleryId } from './story';

type V3 = [number, number, number];
interface Props { gallery: GalleryId; confirmed: string[]; discovered: string[]; exploring: boolean; blocked: boolean; reducedMotion: boolean; busy: boolean; walkthrough: boolean; ended: boolean; sensitivity: number; onInspect: (id: string) => void; onReady: () => void; onFailure: () => void; onFps: (fps: number) => void; flashlight: boolean; focusedId: string | null; onInteractionChange: (interaction: Interaction | null) => void; onEnterDoor: () => void; onFootstep: () => void; onHaunt: (event: Haunt) => void; }
const palettes = { departures: { cold: '#78918c', tint: '#0c1e21' }, shelter: { cold: '#839b98', tint: '#102127' }, names: { cold: '#879186', tint: '#182322' } };
function Box({ position, args, color, roughness = .65, metalness = 0 }: { position: V3; args: V3; color: string; roughness?: number; metalness?: number }) { return <mesh position={position} receiveShadow><boxGeometry args={args}/><meshStandardMaterial color={color} roughness={roughness} metalness={metalness}/></mesh>; }
function labelTexture(text: string, small?: string, dark = false) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const x = c.getContext('2d')!; x.fillStyle = dark ? '#1e2a29' : '#d5c8ac'; x.fillRect(0,0,1024,256);
  x.strokeStyle = dark ? '#6d7564' : '#9c8e70'; x.lineWidth = 2; x.strokeRect(14,14,996,228);
  x.textAlign = 'center'; x.fillStyle = dark ? '#cabd9c' : '#303c35'; x.font = '42px Georgia'; x.fillText(text,512,small ? 106 : 145);
  if (small) { x.font = '20px Georgia'; x.fillText(small,512,175); }
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function Label({ text, small, position, width = 2.5, dark = false, rotation }: { text: string; small?: string; position: V3; width?: number; dark?: boolean; rotation?: V3 }) {
  const texture = useMemo(() => labelTexture(text,small,dark),[text,small,dark]); useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh position={position} rotation={rotation}><planeGeometry args={[width,width/4]}/><meshBasicMaterial map={texture}/></mesh>;
}
function Arch({ width, height, depth = .15, color = '#3d4a40' }: { width: number; height: number; depth?: number; color?: string }) {
  const shape = useMemo(() => {
    const w = width/2, r = w, top = height-r;
    const wi = w-.15;
    const s = new THREE.Shape(); s.moveTo(-w,0); s.lineTo(-w,top); s.absarc(0,top,r,Math.PI,0,true); s.lineTo(w,0); s.lineTo(wi,0); s.lineTo(wi,top); s.absarc(0,top,wi,0,Math.PI,false); s.lineTo(-wi,0); s.closePath(); return s;
  },[width,height]);
  return <mesh><extrudeGeometry args={[shape,{depth,bevelEnabled:false,curveSegments:24}]}/><meshStandardMaterial color={color} roughness={.6}/></mesh>;
}
function Window({ z, restored }: { z: number; restored: boolean }) {
  return <group position={[-5.22,.75,z]} rotation={[0,Math.PI/2,0]}>
    <mesh position={[0,2.3,-.06]}><planeGeometry args={[2.65,4.6]}/><meshStandardMaterial color={restored ? '#9dbaad' : '#4e7a7a'} emissive={restored ? '#54716a' : '#24464e'} emissiveIntensity={.8} roughness={.2} metalness={.4}/></mesh>
    <Arch width={2.8} height={4.9} depth={.22} color="#343e36"/>
    <Box position={[0,2.3,.1]} args={[.055,4.6,.09]} color="#4a554a"/>
    {[1.2,2.5,3.6].map(y=><Box key={y} position={[0,y,.1]} args={[2.65,.055,.09]} color="#4a554a"/>)}
    <Box position={[0,0,.1]} args={[3,.18,.5]} color="#444f45"/>
    {Array.from({length:12},(_,i)=><mesh key={i} position={[-1.15+(i%6)*.42,.4+Math.floor(i/6)*1.7+(i%3)*.3,.075]} rotation={[0,0,-.12]}><planeGeometry args={[.008,.5+(i%3)*.2]}/><meshBasicMaterial color="#a0c2be" transparent opacity={.3}/></mesh>)}
  </group>;
}
function Bench({ position, rotation = 0, blankets = false, overturned = false }: { position: V3; rotation?: number; blankets?: boolean; overturned?: boolean }) {
  return <group position={position} rotation={[overturned ? -.8 : 0,rotation,overturned ? .4 : 0]}>
    <Box position={[0,.58,0]} args={[2.6,.16,.72]} color="#4b3929"/>
    {[.65,.9,1.15].map(y=><Box key={y} position={[0,y,-.35]} args={[2.6,.15,.1]} color="#4b3929"/>)}
    {[-1.04,1.04].map(x=><group key={x}><Box position={[x,.3,0]} args={[.1,.6,.5]} color="#26332f" metalness={.55}/><Box position={[x,.8,-.35]} args={[.08,.9,.08]} color="#26332f" metalness={.5}/></group>)}
    {blankets && <Box position={[.4,.69,.03]} args={[1.1,.07,.65]} color="#9b8b6d"/>}
  </group>;
}
function Clock({ running, position = [0,4.1,-7.3] }: { running: boolean; position?: V3 }) {
  const hand = useRef<THREE.Group>(null);
  useFrame(({clock}) => { if (hand.current) hand.current.rotation.z = running ? -clock.elapsedTime*.15 : -.7; });
  return <group position={position}>
    <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.64,.64,.12,48]}/><meshStandardMaterial color="#8c7953" metalness={.65} roughness={.4}/></mesh>
    <mesh position={[0,0,.07]}><circleGeometry args={[.56,48]}/><meshStandardMaterial color="#cfcaad"/></mesh>
    {Array.from({length:12},(_,i)=><mesh key={i} position={[Math.sin(i*Math.PI/6)*.46,Math.cos(i*Math.PI/6)*.46,.082]} rotation={[0,0,-i*Math.PI/6]}><boxGeometry args={[.025,.065,.012]}/><meshBasicMaterial color="#26332f"/></mesh>)}
    <group ref={hand} position={[0,0,.1]}><Box position={[0,.18,0]} args={[.035,.4,.015]} color="#26332f"/></group>
    <group rotation={[0,0,1.2]} position={[0,0,.11]}><Box position={[0,.12,0]} args={[.045,.3,.015]} color="#26332f"/></group>
  </group>;
}
function Cup({ position, color = '#5a848d' }: { position: V3; color?: string }) { return <group position={position}><mesh><cylinderGeometry args={[.105,.085,.2,24]}/><meshStandardMaterial color={color} roughness={.3} metalness={.25}/></mesh><mesh position={[.11,.01,0]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.065,.016,8,16]}/><meshStandardMaterial color={color}/></mesh><mesh position={[0,.102,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.085,24]}/><meshStandardMaterial color="#302e21"/></mesh></group>; }
function Artifact({ evidence, found, active, onInspect }: { evidence: Evidence; found: boolean; active: boolean; onInspect: (id:string)=>void }) {
  const [x,,z] = evidence.position;
  return <group position={[x,0,z]}>
    <Box position={[0,.55,0]} args={[.85,1.1,.7]} color="#2a3731"/>
    <Box position={[0,1.12,0]} args={[1,.08,.8]} color="#74664d" metalness={.4}/>
    <Box position={[0,.08,0]} args={[1,.12,.8]} color="#344338"/>
    <group position={[0,1.25,0]}>
      {evidence.prop === 'cup' ? <Cup position={[0,.04,0]}/> : evidence.prop === 'clock' ? <group rotation={[-.25,0,0]}><mesh><torusGeometry args={[.14,.035,10,24]}/><meshStandardMaterial color="#b79d66" metalness={.65}/></mesh><Box position={[.19,0,0]} args={[.25,.035,.035]} color="#b79d66"/><Box position={[.29,-.04,0]} args={[.035,.1,.035]} color="#b79d66"/></group> : <group rotation={[-.22,0,.07]}><Box position={[0,0,0]} args={[.48,evidence.prop === 'ledger' ? .09 : .015,.35]} color={evidence.prop === 'ledger' ? '#5c5040' : evidence.prop === 'photo' ? '#8b8980' : '#c1b28f'}/><Box position={[0,.05,0]} args={[.32,.006,.22]} color={evidence.prop === 'photo' ? '#465852' : '#b6a78a'}/></group>}
    </group>
    <mesh position={[0,1.45,0]} onClick={e=>{e.stopPropagation();if(active)onInspect(evidence.id);}}><boxGeometry args={[1.25,1.6,1.1]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <Label text={evidence.id.toUpperCase()} position={[0,.9,.36]} width={.45}/>

    {!found && <pointLight position={[0,1.7,0]} color="#ccae75" intensity={.35} distance={2}/>}
  </group>;
}
function Workroom() {
  return <group>
    <Box position={[0,1.7,-5.4]} args={[6.5,3.4,.16]} color="#56604b"/>
    <Box position={[-3.2,1.7,-1.3]} args={[.16,3.4,8.2]} color="#4c5a46"/>
    <Box position={[3.2,1.7,-1.3]} args={[.16,3.4,8.2]} color="#4c5a46"/>
    <Box position={[0,3.4,-1.3]} args={[6.5,.12,8.2]} color="#344936"/>
    <Box position={[0,.01,-1.3]} args={[6.5,.05,8.2]} color="#57543b"/>
    <mesh position={[-1.8,2.05,-5.28]}><planeGeometry args={[1.3,1.5]}/><meshStandardMaterial color="#8daca0" emissive="#536c58" emissiveIntensity={.5}/></mesh>
    <Box position={[-1.8,2.05,-5.15]} args={[.045,1.5,.07]} color="#8d8c69"/>
    <Box position={[-1.8,2.05,-5.15]} args={[1.3,.045,.07]} color="#8d8c69"/>
    <Clock running position={[.6,2.5,-5.25]}/>
    <Box position={[0,.75,-3]} args={[3,.14,1.5]} color="#614b32"/>
    {[-1.3,1.3].flatMap(x=>[-3.6,-2.4].map(z=><Box key={`${x}${z}`} position={[x,.38,z]} args={[.12,.75,.12]} color="#4b3b2a"/>))}
    <Box position={[0,.45,-1.6]} args={[.65,.1,.6]} color="#604930"/><Box position={[0,.85,-1.3]} args={[.65,.8,.09]} color="#604930"/>
    {[-.25,.25].flatMap(x=>[-1.85,-1.35].map(z=><Box key={`${x}${z}`} position={[x,.22,z]} args={[.07,.45,.07]} color="#4b3b2a"/>))}
    <Cup position={[.7,.94,-2.7]}/>
    <mesh position={[-.7,1.08,-3.2]}><sphereGeometry args={[.25,24,16]}/><meshStandardMaterial color="#7e8071" metalness={.7} roughness={.25}/></mesh>
    <mesh position={[-.7,1.27,-3.2]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.14,.025,8,24]}/><meshStandardMaterial color="#454b3c"/></mesh>
    <Box position={[-.65,1.1,-3.2]} args={[.6,.06,.08]} color="#7e8071" metalness={.6}/>
    <Box position={[-1.05,1.13,-3.55]} args={[.09,.7,.09]} color="#6a6444"/>
    <mesh position={[-1.05,1.5,-3.55]} rotation={[Math.PI,0,0]}><coneGeometry args={[.36,.28,32,1,true]}/><meshStandardMaterial color="#b9a772" side={THREE.DoubleSide}/></mesh>
    <pointLight position={[-1.05,1.35,-3.55]} color="#ffd69b" intensity={5} distance={8}/>
    <Label text="ADA VALE" small="KEEPER OF GREYHAVEN · 1951—1981" position={[.4,1.8,-5.25]} width={1.9}/>
  </group>;
}
function CameraRig({ exploring, blocked, reducedMotion, walkthrough, ended, sensitivity, gallery, confirmed,
  onInspect, onInteractionChange, onEnterDoor, onFootstep }: Props) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const yaw = useRef(0), pitch = useRef(0), started = useRef(false), time = useRef(0);
  const walked = useRef(0), stepDistance = useRef(0);
  const focused = useRef<Interaction | null>(null);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    started.current = false; time.current = 0; keys.current.clear();
    focused.current = null; onInteractionChange(null);
  }, [exploring, gallery, walkthrough, ended, onInteractionChange]);
  useEffect(() => { if (blocked) keys.current.clear(); }, [blocked]);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (!exploring || blocked || event.ctrlKey || event.metaKey || event.altKey ||
          (event.target as HTMLElement)?.closest('input, textarea, select, dialog')) return;
      if (event.code === 'KeyE' && !event.repeat && focused.current) {
        event.preventDefault();
        if (focused.current.kind === 'door') onEnterDoor();
        else onInspect(focused.current.id);
      }
      if (['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code)) {
        event.preventDefault(); keys.current.add(event.code);
      }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.code);
    const move = (event: MouseEvent) => {
      if (document.pointerLockElement === gl.domElement && !blocked) {
        yaw.current -= event.movementX * .0016 * sensitivity;
        pitch.current = Math.max(-.8, Math.min(.8, pitch.current - event.movementY * .0016 * sensitivity));
      }
    };
    const clear = () => keys.current.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    window.addEventListener('blur', clear); window.addEventListener('mousemove', move);
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear); window.removeEventListener('mousemove', move);
    };
  }, [gl, sensitivity, exploring, blocked, onInspect, onEnterDoor]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, .05);
    time.current += dt;
    if (!exploring || walkthrough) {
      const t = reducedMotion ? 0 : time.current;
      const desired = ended ? new THREE.Vector3(2.1,2.1,2.3) : new THREE.Vector3(3.8+Math.sin(t*.025)*.2,3.6,10.5);
      camera.position.lerp(desired, Math.min(1,dt*1.7));
      camera.lookAt(ended ? new THREE.Vector3(0,1.2,-3) : new THREE.Vector3(-.25,2.1,-3.5));
      started.current = false;
      return;
    }
    if (!started.current) { camera.position.set(0,1.7,6.7); yaw.current=0; pitch.current=0; started.current=true; }
    if (blocked) return;
    const k = keys.current;
    if (k.has('ArrowLeft')) yaw.current += dt * 1.4;
    if (k.has('ArrowRight')) yaw.current -= dt * 1.4;
    const moving = Number(k.has('KeyW')||k.has('ArrowUp')) - Number(k.has('KeyS')||k.has('ArrowDown'));
    const side = Number(k.has('KeyD')) - Number(k.has('KeyA'));
    direction.set(side,0,-moving).normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw.current).multiplyScalar(dt*2.5);
    const previousX=camera.position.x, previousZ=camera.position.z;
    if (isWalkable(camera.position.x+direction.x,camera.position.z,gallery)) camera.position.x+=direction.x;
    if (isWalkable(camera.position.x,camera.position.z+direction.z,gallery)) camera.position.z+=direction.z;
    const distance=Math.hypot(camera.position.x-previousX,camera.position.z-previousZ);
    walked.current+=distance; stepDistance.current+=distance;
    if (stepDistance.current>.95) { stepDistance.current=0; onFootstep(); }
    camera.position.y=1.7+(reducedMotion?0:Math.sin(walked.current*8)*.018);
    camera.rotation.set(pitch.current,yaw.current,0,'YXZ');
    camera.getWorldDirection(forward);
    const next=nearbyInteraction(camera.position.x,camera.position.z,forward.x,forward.z,gallery,isGalleryRestored(gallery,confirmed));
    if(next?.id!==focused.current?.id||next?.label!==focused.current?.label) {
      focused.current=next; onInteractionChange(next);
    }
  });
  return null;
}
function FrameBudget({ busy }: { busy:boolean }) {
  const { setFrameloop, invalidate } = useThree();
  useEffect(()=>{
    if(!busy){setFrameloop('always');return;}
    setFrameloop('demand');const timer=window.setInterval(()=>invalidate(),100);
    return()=>{window.clearInterval(timer);setFrameloop('always');};
  },[busy,setFrameloop,invalidate]);
  return null;
}
function Hall(props: Props) {
  const { gallery, confirmed, discovered, exploring, blocked, walkthrough, ended, onInspect, onReady, onFps } = props;
  const restored=isGalleryRestored(gallery,confirmed); const palette=palettes[gallery];
  const warmth=useRef(0); const fill=useRef<THREE.AmbientLight>(null); const fps=useRef({time:0,frames:0});
  useEffect(()=> { onReady(); },[onReady]);
  useFrame((_,dt)=>{
    warmth.current=THREE.MathUtils.lerp(warmth.current,restored||ended?1:0,Math.min(1,dt*.5));
    if(fill.current){fill.current.color.set(palette.cold).lerp(new THREE.Color('#e4c597'),warmth.current);fill.current.intensity=(exploring?.22:.95)+warmth.current*.65;}
    fps.current.time+=dt;fps.current.frames++;if(fps.current.time>2){onFps(Math.round(fps.current.frames/fps.current.time));fps.current={time:0,frames:0};}
  });
  const floorTexture=useMemo(()=>{
    const c=document.createElement('canvas');c.width=512;c.height=512;const x=c.getContext('2d')!;x.fillStyle='#404c43';x.fillRect(0,0,512,512);x.fillStyle='#34433d';x.fillRect(0,0,256,256);x.fillRect(256,256,256,256);x.strokeStyle='#253b32';x.lineWidth=4;[0,256,512].forEach(p=>{x.beginPath();x.moveTo(p,0);x.lineTo(p,512);x.stroke();x.beginPath();x.moveTo(0,p);x.lineTo(512,p);x.stroke();});const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,10);t.colorSpace=THREE.SRGBColorSpace;return t;
  },[]);
  useEffect(()=>()=>floorTexture.dispose(),[floorTexture]);
  return <>
    <color attach="background" args={[palette.tint]}/><fog attach="fog" args={[palette.tint,12,35]}/>
    <ambientLight ref={fill} intensity={1.05}/><hemisphereLight args={['#bad5cd','#2e3425',exploring?.35:1.5]}/>
    <directionalLight position={[-8,9,-1]} intensity={exploring?(restored?1.5:.5):2.1} color="#a1b9af"/>
    <pointLight position={[1,5.4,1]} color={restored||ended?'#f1c17e':'#abb99a'} intensity={exploring?(restored?30:7):45} distance={17} decay={2}/>
    <pointLight position={[-3,3,-5]} color="#d3b87a" intensity={restored?22:exploring?2:10} distance={10}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,0]} receiveShadow><planeGeometry args={[11,20]}/><meshStandardMaterial map={floorTexture} roughness={.37} metalness={.27}/></mesh>
    {[-4.9,4.9].map(x=><Box key={x} position={[x,.005,0]} args={[.035,.012,20]} color="#8f8463" metalness={.4}/>)}
    <Box position={[0,3.1,-7.65]} args={[11,6.2,.35]} color="#3d4940"/>
    <Box position={[5.55,3.1,0]} args={[.5,6.2,19]} color="#273a34"/>
    <Box position={[-5.55,3.1,0]} args={[.5,6.2,19]} color="#2d403a"/>
    {[-5,0,5].map(z=><Window key={z} z={z} restored={restored||ended}/>)}
    {[-6.9,-2.5,2.5,7].map(z=><group key={z}>
      {[-4.85,4.85].map(x=><group key={x}><Box position={[x,2.4,z]} args={[.28,4.8,.38]} color="#536052"/><Box position={[x,.15,z]} args={[.55,.3,.58]} color="#58604e"/><Box position={[x,4.7,z]} args={[.6,.3,.65]} color="#616b56"/><Box position={[x,1.3,z]} args={[.4,.08,.48]} color="#8b8060" metalness={.3}/></group>)}
      <group position={[0,1.6,z]}><Arch width={9.8} height={5.9} depth={.18} color="#546153"/></group>
      <Box position={[0,6.5,z]} args={[.13,.13,.45]} color="#a7976b" metalness={.5}/>
    </group>)}
    <mesh position={[0,2.6,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[5.1,5.1,19,48,1,true,Math.PI/2,Math.PI]}/><meshStandardMaterial color="#21382f" side={THREE.DoubleSide} roughness={.85}/></mesh>
    <Box position={[0,6.5,0]} args={[.16,.12,19]} color="#5d6550"/>
    <group position={[0,0,-7.4]}><Arch width={2.7} height={3.65} depth={.25} color="#7a7c5f"/><Box position={[0,1.4,-.06]} args={[2.4,2.8,.15]} color={restored?'#5b6250':'#192e29'}/><Box position={[.7,1.4,.08]} args={[.06,.16,.1]} color="#b8a371" metalness={.7}/></group>
    <Label text="GREYHAVEN" small={ended?'THE KEEPER’S ROOM':'RAILWAY MUSEUM · EST. 1984'} position={[0,5.55,-7.42]} width={4.6} dark/>
    <Clock running={confirmed.includes('clock')||ended}/>
    {!ended && <>
      {gallery==='departures'&&<group position={[0,3.05,1.5]}>
        <Box position={[-1.35,.9,0]} args={[.035,2,.035]} color="#7f8263" metalness={.5}/><Box position={[1.35,.9,0]} args={[.035,2,.035]} color="#7f8263" metalness={.5}/>
        <Box position={[0,0,0]} args={[3.05,.7,.15]} color="#28372b"/>
        <Label text={confirmed.includes('returns')?'ARRIVALS':'DEPARTURES'} small={confirmed.includes('returns')?'WINTER · SOMEONE IS EXPECTED':'LAST SERVICE · NOVEMBER 1968'} position={[0,0,.09]} width={2.9} dark/>
      </group>}
      {gallery==='departures'&&confirmed.includes('light')&&<>
        <pointLight position={[-4.6,2.1,-.1]} color="#ffce80" intensity={16} distance={9}/>
        <mesh position={[-4.95,2.1,0]}><sphereGeometry args={[.17,16,12]}/><meshBasicMaterial color="#f5d39a"/></mesh>
        {[-.7,.4].map((z,i)=><group key={z} position={[-5.06,1.1,z]} rotation={[0,Math.PI/2,0]}>
          <mesh position={[0,.55+i*.1,0]}><circleGeometry args={[.12,20]}/><meshBasicMaterial color="#c8d2b9" transparent opacity={.28}/></mesh>
          <mesh position={[0,.17+i*.1,0]}><planeGeometry args={[.28,.55]}/><meshBasicMaterial color="#bdc9ae" transparent opacity={.2}/></mesh>
        </group>)}
      </>}
      <Bench position={[-1.8,0,3.4]} rotation={-.08} blankets={gallery==='shelter'&&confirmed.includes('refuge')} overturned={gallery==='shelter'&&!confirmed.includes('care')}/>
      <Bench position={[1.7,0,-1.1]} rotation={Math.PI+.04} blankets={gallery==='shelter'&&confirmed.includes('refuge')}/>
      {EVIDENCE.filter(e=>e.gallery===gallery).map(e=><Artifact key={e.id} evidence={e} found={discovered.includes(e.id)} active={exploring&&!blocked&&!walkthrough&&props.focusedId===e.id} onInspect={onInspect}/>)}
      {[0,1].map(i=><group key={i} position={[5.26,2.8,-2-i*3.2]} rotation={[0,-Math.PI/2,0]}><Box position={[0,0,0]} args={[1.7,2.15,.1]} color="#807252" metalness={.4}/><Box position={[0,0,.07]} args={[1.47,1.92,.04]} color={gallery==='names'&&confirmed.includes('identity')?'#817b65':'#263d36'}/>{gallery==='names'&&confirmed.includes('identity')&&<group position={[0,0,.11]}><mesh position={[0,.4,0]}><circleGeometry args={[.24,20]}/><meshBasicMaterial color="#aca28a"/></mesh><mesh position={[0,-.2,0]}><planeGeometry args={[.65,.8]}/><meshBasicMaterial color="#48514a"/></mesh></group>}<Label text={i===0?(gallery==='names'&&confirmed.includes('identity')?'ADA VALE':'UNTITLED'):'THE EAST CROSSING'} position={[0,-1.25,.08]} width={1.6}/></group>)}
      {gallery==='names'&&<Label text={confirmed.includes('credit')?'ADA VALE · SHE KEPT THE DOORS OPEN':'THE GIFT OF COUNCILLOR EDWIN MARCH'} small={confirmed.includes('credit')?'EXHIBITION FUNDED BY EDWIN MARCH · 1984':'THE GREYHAVEN FLOOD COLLECTION · 1984'} position={[0,1.8,-7.1]} width={2.15}/>}
    </>}
    {ended&&<Workroom/>}
    {(gallery==='shelter'&&!confirmed.includes('refuge'))&&<mesh position={[0,.015,-2]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[8.5,8]}/><meshPhysicalMaterial color="#446466" transparent opacity={.35} roughness={.06} metalness={.65}/></mesh>}
    <Label text={GALLERIES.find(g=>g.id===gallery)!.title.toUpperCase()} position={[0,2.8,-7.1]} width={1.8}/>
    {[0,1,2].map(i=><mesh key={i} position={[-2+i*1.7,5.1,5-i*4]}><sphereGeometry args={[.09,12,8]}/><meshBasicMaterial color="#e7ce96"/></mesh>)}
    <CameraRig {...props}/>
    <Atmosphere active={exploring&&!blocked&&!walkthrough} restored={restored||ended} reducedMotion={props.reducedMotion} flashlight={props.flashlight} gallery={gallery} onHaunt={props.onHaunt}/>
    <FrameBudget busy={props.busy}/>
  </>;
}
export default function Museum(props: Props) {
  return <Canvas className="museum-canvas" camera={{position:[3.8,3.6,10.5],fov:47,near:.1,far:55}} dpr={[1,1.5]} gl={{ antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance' }} onCreated={({gl})=>{gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.32;gl.domElement.addEventListener('webglcontextlost',props.onFailure);}} onPointerMissed={(event)=>{ if(props.exploring&&!props.blocked&&!props.walkthrough&&event.type==='click') { const canvas=document.querySelector('canvas');canvas?.requestPointerLock()?.catch(()=>{}); } }}>
    <Suspense fallback={null}><Hall {...props}/></Suspense>
  </Canvas>;
}
