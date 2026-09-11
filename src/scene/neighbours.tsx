import { useLayoutEffect, useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, type Group } from 'three';
import { config } from '../config';
import { houseTransform, houseVariants, layout, type NeighbourLot, type Rect } from '../data/scene';
import { useAppStore } from '../state/store';
import { ModelOrProxy } from './model-or-proxy';

const YARD = '#8FA86A';
const CONCRETE = '#C9C2B6';
const COPING = '#ADA79C';
const GATE = '#8E9AA6';
const ASPHALT = '#54565C';
const BAY_LINE = '#E6E4DC';

const WALL_H = 1.4;
const WALL_T = 0.2;
/** Gate opening in a neighbour's front wall, centred on that house's front door. */
const GATE_W = 2.6;

const neighbours = layout.neighbours as readonly NeighbourLot[];

/**
 * Hip or gable roof as one buffer geometry: four eave corners plus a ridge line of length
 * `ridge`. A ridge as long as the roof degenerates the two hip triangles into vertical gable
 * ends, so the same six vertices cover every variant. Built with the ridge along X and
 * rotated a quarter turn when the variant runs it along Z.
 */
function roofGeometry(width: number, depth: number, height: number, ridge: number) {
  const hw = width / 2;
  const hd = depth / 2;
  const hr = Math.min(ridge, width) / 2;
  // 0..3 eaves anticlockwise from the back-left corner, 4..5 the ridge ends.
  const v = [
    [-hw, 0, -hd],
    [hw, 0, -hd],
    [hw, 0, hd],
    [-hw, 0, hd],
    [-hr, height, 0],
    [hr, height, 0],
  ];
  const faces = [
    [3, 2, 5],
    [3, 5, 4], // front slope
    [1, 0, 4],
    [1, 4, 5], // back slope
    [0, 3, 4], // left end
    [2, 1, 5], // right end
  ];
  const positions = new Float32Array(faces.length * 9);
  faces.forEach((face, f) => {
    face.forEach((index, k) => {
      const p = v[index] as number[];
      positions.set(p, f * 9 + k * 3);
    });
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function Roof({
  width,
  depth,
  height,
  ridge,
  ridgeAxis,
  y,
  color,
}: {
  width: number;
  depth: number;
  height: number;
  ridge: number;
  ridgeAxis: 'x' | 'z';
  y: number;
  color: string;
}) {
  const geometry = useMemo(
    () =>
      ridgeAxis === 'x'
        ? roofGeometry(width, depth, height, ridge)
        : roofGeometry(depth, width, height, ridge),
    [width, depth, height, ridge, ridgeAxis],
  );
  return (
    <mesh
      castShadow
      receiveShadow
      geometry={geometry}
      position={[0, y, 0]}
      rotation={[0, ridgeAxis === 'x' ? 0 : Math.PI / 2, 0]}
    >
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}

/** Block wall around a lot, opened for a gate on the side the house faces. */
function LotWall({ n }: { n: NeighbourLot }) {
  const { lot: r, facing } = n;
  const { centre } = houseTransform(n);
  const runs: { key: string; x: number; z: number; w: number; d: number }[] = [];
  const push = (key: string, x0: number, x1: number, z0: number, z1: number) => {
    if (x1 - x0 < 0.05 || z1 - z0 < 0.05) return;
    runs.push({ key, x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 });
  };
  // Sides that are not the facing side run solid from corner to corner.
  const gapAlongX = facing === '+z' || facing === '-z';
  const gapCentre = gapAlongX ? centre[0] : centre[1];
  const g0 = gapCentre - GATE_W / 2;
  const g1 = gapCentre + GATE_W / 2;
  const openZ = facing === '+z' ? r.z1 : facing === '-z' ? r.z0 : undefined;
  const openX = facing === '+x' ? r.x1 : undefined;

  for (const z of [r.z0, r.z1]) {
    if (z === openZ) {
      push(`x-${z}-a`, r.x0, Math.min(g0, r.x1), z - WALL_T / 2, z + WALL_T / 2);
      push(`x-${z}-b`, Math.max(g1, r.x0), r.x1, z - WALL_T / 2, z + WALL_T / 2);
    } else {
      push(`x-${z}`, r.x0, r.x1, z - WALL_T / 2, z + WALL_T / 2);
    }
  }
  for (const x of [r.x0, r.x1]) {
    if (x === openX) {
      push(`z-${x}-a`, x - WALL_T / 2, x + WALL_T / 2, r.z0, Math.min(g0, r.z1));
      push(`z-${x}-b`, x - WALL_T / 2, x + WALL_T / 2, Math.max(g1, r.z0), r.z1);
    } else {
      push(`z-${x}`, x - WALL_T / 2, x + WALL_T / 2, r.z0, r.z1);
    }
  }
  return (
    <group>
      {runs.map((run) => (
        <group key={run.key}>
          <mesh castShadow receiveShadow position={[run.x, WALL_H / 2, run.z]}>
            <boxGeometry args={[run.w, WALL_H, run.d]} />
            <meshStandardMaterial color={CONCRETE} />
          </mesh>
          <mesh position={[run.x, WALL_H + 0.03, run.z]}>
            <boxGeometry args={[run.w + 0.04, 0.06, run.d + 0.04]} />
            <meshStandardMaterial color={COPING} />
          </mesh>
        </group>
      ))}
      {/* gate leaf across the opening */}
      <mesh
        position={
          gapAlongX
            ? [gapCentre, 0.7, (openZ ?? r.z0) as number]
            : [(openX ?? r.x0) as number, 0.7, gapCentre]
        }
      >
        <boxGeometry args={gapAlongX ? [GATE_W, 1.3, 0.06] : [0.06, 1.3, GATE_W]} />
        <meshStandardMaterial color={GATE} />
      </mesh>
    </group>
  );
}

/** One neighbour lot: yard, wall with a gate, and a massing block under its roof. */
function NeighbourProxy({ n }: { n: NeighbourLot }) {
  const v = houseVariants[n.variant];
  const { centre, yaw } = houseTransform(n);
  const upperW = v.width - 2 * v.upperInset;
  const upperD = v.depth - 2 * v.upperInset;
  const upperH = v.eaveHeight - v.groundHeight;
  return (
    <group name={`lot-${n.id}`}>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[(n.lot.x0 + n.lot.x1) / 2, 0.005, (n.lot.z0 + n.lot.z1) / 2]}
      >
        <planeGeometry args={[n.lot.x1 - n.lot.x0, n.lot.z1 - n.lot.z0]} />
        <meshStandardMaterial color={YARD} />
      </mesh>
      <LotWall n={n} />
      <group position={[centre[0], 0, centre[1]]} rotation={[0, yaw, 0]}>
        <mesh castShadow receiveShadow position={[0, v.groundHeight / 2, 0]}>
          <boxGeometry args={[v.width, v.groundHeight, v.depth]} />
          <meshStandardMaterial color={n.wall} />
        </mesh>
        {v.storeys === 2 && (
          <mesh castShadow receiveShadow position={[0, v.groundHeight + upperH / 2, 0]}>
            <boxGeometry args={[upperW, upperH, upperD]} />
            <meshStandardMaterial color={n.wall} />
          </mesh>
        )}
        <Roof
          width={v.roof.width}
          depth={v.roof.depth}
          height={v.roof.height}
          ridge={v.roof.ridge}
          ridgeAxis={v.roof.ridgeAxis}
          y={v.eaveHeight}
          color={n.roof}
        />
      </group>
    </group>
  );
}

/** Coin parking across the road from the gate: asphalt, painted bays and wheel stops. */
function ParkingProxy({ r, bays }: { r: Rect; bays: number }) {
  const width = r.x1 - r.x0;
  const depth = r.z1 - r.z0;
  const pitch = width / bays;
  return (
    <group name="parking-proxy">
      <mesh receiveShadow position={[(r.x0 + r.x1) / 2, 0.03, (r.z0 + r.z1) / 2]}>
        <boxGeometry args={[width, 0.06, depth]} />
        <meshStandardMaterial color={ASPHALT} />
      </mesh>
      {Array.from({ length: bays + 1 }, (_, i) => r.x0 + i * pitch).map((x) => (
        <mesh key={x} position={[x, 0.065, r.z0 + depth * 0.35]}>
          <boxGeometry args={[0.12, 0.01, depth * 0.5]} />
          <meshStandardMaterial color={BAY_LINE} />
        </mesh>
      ))}
      {Array.from({ length: bays }, (_, i) => r.x0 + (i + 0.5) * pitch).map((x) => (
        <mesh key={x} castShadow position={[x, 0.11, r.z0 + depth * 0.1]}>
          <boxGeometry args={[pitch * 0.55, 0.16, 0.18]} />
          <meshStandardMaterial color={CONCRETE} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Invisible boxes the orbit camera bounces off. They render whether or not the GLB loaded,
 * because a camera that walks through a neighbour's living room is a bug in both states.
 * three.js raycasts invisible meshes, and R3F only dispatches pointer events to objects that
 * carry handlers, so these block the camera without stealing the ground-click deselect.
 */
function Colliders() {
  const group = useRef<Group>(null);
  const setCameraColliders = useAppStore((s) => s.setCameraColliders);
  useLayoutEffect(() => {
    setCameraColliders(group.current ? [...group.current.children] : []);
    return () => setCameraColliders([]);
  }, [setCameraColliders]);
  return (
    <group name="camera-colliders" ref={group}>
      {neighbours.map((n) => {
        const { bounds, height } = houseTransform(n);
        const v = houseVariants[n.variant];
        // Size the box from the roof, not the walls. The eaves overhang by 0.5 m, so a box
        // that only wrapped the ground storey let the fascia cross the near plane before the
        // camera was stopped. The extra 0.2 m a side keeps the gutter out of frame too.
        const turned = n.facing === '+x';
        const width = Math.max(bounds.x1 - bounds.x0, turned ? v.roof.depth : v.roof.width);
        const depth = Math.max(bounds.z1 - bounds.z0, turned ? v.roof.width : v.roof.depth);
        return (
          <mesh
            key={n.id}
            visible={false}
            position={[(bounds.x0 + bounds.x1) / 2, height / 2, (bounds.z0 + bounds.z1) / 2]}
          >
            <boxGeometry args={[width + 0.4, height, depth + 0.4]} />
          </mesh>
        );
      })}
    </group>
  );
}

function NeighboursProxy() {
  return (
    <group name="neighbours-proxy">
      {neighbours.map((n) => (
        <NeighbourProxy key={n.id} n={n} />
      ))}
      <ParkingProxy r={layout.parking.lot} bays={layout.parking.bays} />
    </group>
  );
}

/** The seven neighbour lots and the coin parking lot opposite the gate. */
export function Neighbours() {
  return (
    <>
      <ModelOrProxy url={config.models.neighbours} proxy={<NeighboursProxy />}>
        {(gltf) => <primitive object={gltf.scene} />}
      </ModelOrProxy>
      <Colliders />
    </>
  );
}
