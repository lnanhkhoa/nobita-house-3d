import { useMemo } from 'react';
import { Box3, type Group } from 'three';
import { config } from '../config';
import { layout } from '../data/scene';
import { type LoadedGltf, ModelOrProxy } from './model-or-proxy';

/**
 * Trees and shrubs, placed per instance rather than baked into the environment mesh, so a
 * Hyper3D Rodin model can replace the placeholder without re-exporting the whole yard.
 * Each instance gets a deterministic yaw and scale jitter; identical copies read as clones.
 */

/** Deterministic pseudo-random in [0,1) from an integer seed. */
function jitter(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

type TreeKind = 'tree' | 'sakura';

const CANOPY: Record<TreeKind, string> = { tree: '#4E9A3B', sakura: '#F0A9BF' };

function TreeProxy({ height, radius, kind }: { height: number; radius: number; kind: TreeKind }) {
  return (
    <group>
      <mesh castShadow position={[0, height * 0.25, 0]}>
        <cylinderGeometry args={[0.16, 0.24, height * 0.5, 8]} />
        <meshStandardMaterial color="#6B4A2B" />
      </mesh>
      <mesh castShadow position={[0, height * 0.5 + radius * 0.8, 0]}>
        <sphereGeometry args={[radius, 12, 10]} />
        <meshStandardMaterial color={CANOPY[kind]} flatShading />
      </mesh>
    </group>
  );
}

function ShrubProxy({ height }: { height: number }) {
  return (
    <mesh castShadow position={[0, height * 0.5, 0]}>
      <sphereGeometry args={[height * 0.62, 10, 8]} />
      <meshStandardMaterial color="#4F8F3C" flatShading />
    </mesh>
  );
}

/** Clones the loaded scene so several instances of one GLB can coexist. */
function Instance({ gltf, scale }: { gltf: LoadedGltf; scale: number }) {
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true) as Group;
    clone.traverse((node) => {
      const mesh = node as {
        isMesh?: boolean;
        castShadow?: boolean;
        receiveShadow?: boolean;
        material?: { name?: string };
      };
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      // Leaf and blossom cards cast shadows but do not receive them: hundreds of overlapping
      // alpha-tested quads self-shadow into a muddy dark mass otherwise.
      mesh.receiveShadow = !(mesh.material?.name ?? '').includes('card');
    });
    return clone;
  }, [gltf.scene]);
  return <primitive object={scene} scale={scale} />;
}

/** Scales a loaded model so its own height matches the placement's target height. */
function useUnitScale(gltf: LoadedGltf, target: number) {
  return useMemo(() => {
    // Measure in world space: meshopt quantisation stores positions in integer units and
    // puts the real scale on the node, so geometry-space bounds are meaningless here.
    const box = new Box3().setFromObject(gltf.scene);
    const height = box.max.y - box.min.y;
    return height > 0.01 ? target / height : 1;
  }, [gltf.scene, target]);
}

function Tree({
  index,
  position,
  height,
  radius,
  kind,
}: {
  index: number;
  position: readonly [number, number, number];
  height: number;
  radius: number;
  kind: TreeKind;
}) {
  const yaw = jitter(index + 1) * Math.PI * 2;
  const size = 1 + (jitter(index + 7) - 0.5) * 0.16;
  const url = kind === 'sakura' ? config.models.sakura : config.models.tree;
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <ModelOrProxy url={url} proxy={<TreeProxy height={height} radius={radius} kind={kind} />}>
        {(gltf) => <ScaledInstance gltf={gltf} target={height * size} />}
      </ModelOrProxy>
    </group>
  );
}

function ScaledInstance({ gltf, target }: { gltf: LoadedGltf; target: number }) {
  const scale = useUnitScale(gltf, target);
  return <Instance gltf={gltf} scale={scale} />;
}

export function Foliage() {
  const shrubs = layout.hedges.flatMap((row, rowIndex) =>
    Array.from({ length: row.count }, (_, i) => ({
      key: `${rowIndex}-${i}`,
      seed: rowIndex * 31 + i,
      position: [row.start[0] + i * row.spacing, row.start[1], row.start[2]] as const,
      height: row.height,
    })),
  );

  return (
    <group name="foliage">
      {layout.trees.map((tree, index) => (
        <Tree
          key={`${tree.position[0]}-${tree.position[2]}`}
          index={index}
          position={tree.position}
          height={tree.height}
          radius={tree.radius}
          kind={tree.kind}
        />
      ))}
      {shrubs.map((shrub) => (
        <group
          key={shrub.key}
          position={shrub.position}
          rotation={[0, jitter(shrub.seed + 3) * Math.PI * 2, 0]}
        >
          <ModelOrProxy url={config.models.hedge} proxy={<ShrubProxy height={shrub.height} />}>
            {(gltf) => (
              <ScaledInstance
                gltf={gltf}
                target={shrub.height * (1 + (jitter(shrub.seed + 11) - 0.5) * 0.18)}
              />
            )}
          </ModelOrProxy>
        </group>
      ))}
    </group>
  );
}
