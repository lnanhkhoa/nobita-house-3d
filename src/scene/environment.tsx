import { config } from '../config';
import { layout } from '../data/scene';
import { ModelOrProxy } from './model-or-proxy';

const { lot, wall, sidewalk, road, trees, pole } = layout;
const CONCRETE = '#C9C2B6';
const GRASS = '#7FB25A';
const ASPHALT = '#4C4F55';

/** Ground, block wall with a gate opening, sidewalk, road, trees and a utility pole. */
function EnvironmentProxy() {
  const halfW = lot.width / 2;
  const halfD = lot.depth / 2;
  const backZ = wall.frontZ - lot.depth;
  const t = lot.wallThickness;
  const h = lot.wallHeight;
  // Front wall is split around the gate opening.
  const leftLen = wall.gateX - wall.gateWidth / 2 + halfW;
  const rightLen = halfW - (wall.gateX + wall.gateWidth / 2);
  return (
    <group name="environment-proxy">
      {/* yard */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, wall.frontZ - halfD]}>
        <planeGeometry args={[lot.width, lot.depth]} />
        <meshStandardMaterial color={GRASS} />
      </mesh>
      {/* sidewalk */}
      <mesh receiveShadow position={[0, sidewalk.height / 2, wall.frontZ + sidewalk.depth / 2]}>
        <boxGeometry args={[lot.width + 6, sidewalk.height, sidewalk.depth]} />
        <meshStandardMaterial color="#BDB8AE" />
      </mesh>
      {/* road */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, road.startZ + road.depth / 2]}>
        <planeGeometry args={[lot.width + 6, road.depth]} />
        <meshStandardMaterial color={ASPHALT} />
      </mesh>
      {/* front wall, two segments */}
      <mesh castShadow receiveShadow position={[-halfW + leftLen / 2, h / 2, wall.frontZ]}>
        <boxGeometry args={[leftLen, h, t]} />
        <meshStandardMaterial color={CONCRETE} />
      </mesh>
      <mesh castShadow receiveShadow position={[halfW - rightLen / 2, h / 2, wall.frontZ]}>
        <boxGeometry args={[rightLen, h, t]} />
        <meshStandardMaterial color={CONCRETE} />
      </mesh>
      {/* gate */}
      <mesh position={[wall.gateX, 0.9, wall.frontZ]}>
        <boxGeometry args={[wall.gateWidth, 1.8, 0.06]} />
        <meshStandardMaterial color="#A9763F" />
      </mesh>
      {/* side + back walls */}
      <mesh castShadow receiveShadow position={[-halfW, h / 2, wall.frontZ - halfD]}>
        <boxGeometry args={[t, h, lot.depth]} />
        <meshStandardMaterial color={CONCRETE} />
      </mesh>
      <mesh castShadow receiveShadow position={[halfW, h / 2, wall.frontZ - halfD]}>
        <boxGeometry args={[t, h, lot.depth]} />
        <meshStandardMaterial color={CONCRETE} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, h / 2, backZ]}>
        <boxGeometry args={[lot.width, h, t]} />
        <meshStandardMaterial color={CONCRETE} />
      </mesh>
      {/* trees */}
      {trees.map((tree) => (
        <group key={`${tree.position[0]}-${tree.position[2]}`} position={tree.position}>
          <mesh castShadow position={[0, tree.height * 0.25, 0]}>
            <cylinderGeometry args={[0.16, 0.24, tree.height * 0.5, 8]} />
            <meshStandardMaterial color="#6B4A2B" />
          </mesh>
          <mesh castShadow position={[0, tree.height * 0.5 + tree.radius * 0.8, 0]}>
            <sphereGeometry args={[tree.radius, 12, 10]} />
            <meshStandardMaterial color="#4E9A3B" />
          </mesh>
        </group>
      ))}
      {/* utility pole */}
      <mesh castShadow position={[pole.position[0], pole.height / 2, pole.position[2]]}>
        <cylinderGeometry args={[0.14, 0.18, pole.height, 10]} />
        <meshStandardMaterial color="#8E8A82" />
      </mesh>
    </group>
  );
}

export function Environment() {
  return (
    <ModelOrProxy url={config.models.environment} proxy={<EnvironmentProxy />}>
      {(gltf) => <primitive object={gltf.scene} />}
    </ModelOrProxy>
  );
}
