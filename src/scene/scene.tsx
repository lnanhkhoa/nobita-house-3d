import { Sky } from '@react-three/drei';
import { characters } from '../data/characters';
import { useAppStore } from '../state/store';
import { CameraRig } from './camera-rig';
import { Character } from './character';
import { Environment } from './environment';
import { House } from './house';
import { Lighting } from './lighting';

export function Scene() {
  const select = useAppStore((s) => s.select);
  return (
    <>
      <color attach="background" args={['#BFE0FA']} />
      <fog attach="fog" args={['#CFE6FA', 40, 90]} />
      <Sky
        sunPosition={[9, 14, 10]}
        turbidity={4}
        rayleigh={1.2}
        mieCoefficient={0.004}
        mieDirectionalG={0.85}
      />
      <Lighting />
      <CameraRig />
      {/* click on empty space deselects */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onClick={() => select(null)}
        receiveShadow
      >
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#8DB26A" />
      </mesh>
      <House />
      <Environment />
      {characters.map((def) => (
        <Character key={def.id} def={def} />
      ))}
    </>
  );
}
