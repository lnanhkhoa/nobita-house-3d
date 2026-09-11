import { config } from '../config';
import { layout } from '../data/scene';
import { ModelOrProxy } from './model-or-proxy';

const { house } = layout;
const CREAM = '#EFE3C6';
const ROOF = '#5E6B82';
const WOOD = '#A9763F';

/** Two-storey massing matching the canon facade: wide ground floor, narrower upper floor set left. */
function HouseProxy() {
  const w = house.footprint.width;
  const d = house.footprint.depth;
  const h = house.storeyHeight;
  const uw = w * house.upperWidthScale;
  const ud = d * 0.9;
  return (
    <group name="house-proxy">
      {/* ground floor */}
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={CREAM} />
      </mesh>
      {/* lower awning roof */}
      <mesh castShadow position={[0, h + 0.18, 0]}>
        <boxGeometry args={[w + 0.9, 0.36, d + 0.9]} />
        <meshStandardMaterial color={ROOF} />
      </mesh>
      {/* upper floor */}
      <mesh castShadow receiveShadow position={[house.upperOffsetX, h + 0.36 + h / 2, -0.2]}>
        <boxGeometry args={[uw, h, ud]} />
        <meshStandardMaterial color={CREAM} />
      </mesh>
      {/* hipped roof approximated with a 4-sided cone */}
      <mesh
        castShadow
        position={[house.upperOffsetX, h * 2 + 0.36 + house.roofHeight / 2, -0.2]}
        rotation={[0, Math.PI / 4, 0]}
      >
        <coneGeometry args={[Math.hypot(uw + 0.9, ud + 0.9) / 2, house.roofHeight, 4]} />
        <meshStandardMaterial color={ROOF} flatShading />
      </mesh>
      {/* entrance porch + door */}
      <mesh castShadow position={[2.2, 1.15, d / 2 + 0.35]}>
        <boxGeometry args={[1.6, 2.3, 0.7]} />
        <meshStandardMaterial color={CREAM} />
      </mesh>
      <mesh position={[2.2, 1.05, d / 2 + 0.71]}>
        <boxGeometry args={[0.9, 2.1, 0.06]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      {/* windows */}
      <mesh position={[-1.6, 1.6, d / 2 + 0.02]}>
        <boxGeometry args={[2.4, 1.3, 0.04]} />
        <meshStandardMaterial color="#9FC6E8" />
      </mesh>
      <mesh position={[house.upperOffsetX + 0.6, h + 0.36 + 1.7, ud / 2 - 0.2 + 0.02]}>
        <boxGeometry args={[2.2, 1.3, 0.04]} />
        <meshStandardMaterial color="#9FC6E8" />
      </mesh>
      <mesh position={[house.upperOffsetX - 1.2, h + 0.36 + 1.7, ud / 2 - 0.2 + 0.02]}>
        <boxGeometry args={[1.1, 1.3, 0.04]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
    </group>
  );
}

export function House() {
  return (
    // Named so `NightLights` can scope its material search here: material names are not
    // unique across the GLBs, and a scene-wide search lit the whole block.
    <group name="house-root">
      <ModelOrProxy url={config.models.house} proxy={<HouseProxy />}>
        {(gltf) => <primitive object={gltf.scene} />}
      </ModelOrProxy>
    </group>
  );
}
