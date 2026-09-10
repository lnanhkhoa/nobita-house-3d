import { useEffect, useRef, useState } from 'react';
import type { Group, Mesh } from 'three';
import { config } from '../config';
import type { CharacterDef } from '../data/characters';
import { useAppStore } from '../state/store';
import { type LoadedGltf, ModelOrProxy } from './model-or-proxy';
import { useCharacterMotion } from './use-character-motion';

/** Capsule body + sphere head, scaled to canon height, shown until the real GLB exists. */
function CharacterProxy({ def, hovered }: { def: CharacterDef; hovered: boolean }) {
  const bodyH = def.height * 0.62;
  const headR = def.height * 0.19;
  return (
    <group>
      <mesh castShadow position={[0, bodyH / 2, 0]}>
        <capsuleGeometry args={[def.height * 0.16, bodyH - def.height * 0.32, 6, 12]} />
        <meshStandardMaterial color={def.color} emissive={def.color} emissiveIntensity={hovered ? 0.35 : 0} />
      </mesh>
      <mesh castShadow position={[0, bodyH + headR * 0.9, 0]}>
        <sphereGeometry args={[headR, 16, 12]} />
        <meshStandardMaterial color="#F7D9B8" emissive="#F7D9B8" emissiveIntensity={hovered ? 0.35 : 0} />
      </mesh>
    </group>
  );
}

/** Rodin exports arrive without shadow flags; set them once per loaded scene. */
function LoadedCharacter({ gltf }: { gltf: LoadedGltf }) {
  useEffect(() => {
    gltf.scene.traverse((node) => {
      const mesh = node as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [gltf.scene]);
  return <primitive object={gltf.scene} />;
}

export function Character({ def, index }: { def: CharacterDef; index: number }) {
  const select = useAppStore((s) => s.select);
  const selected = useAppStore((s) => s.selectedCharacterId === def.id);
  const [hovered, setHovered] = useState(false);
  const motion = useRef<Group>(null);
  const url = `${config.models.characterDir}/${def.id}.glb`;

  useCharacterMotion(motion, { height: def.height, phase: index * 1.27, selected, hovered });

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);

  return (
    <group
      name={`character-${def.id}`}
      position={def.position}
      rotation={[0, def.rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        select(def.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <group ref={motion}>
        <ModelOrProxy url={url} proxy={<CharacterProxy def={def} hovered={hovered} />}>
          {(gltf) => <LoadedCharacter gltf={gltf} />}
        </ModelOrProxy>
      </group>
    </group>
  );
}
