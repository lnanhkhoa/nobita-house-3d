import { useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { Group } from 'three';
import { LoopOnce, LoopRepeat } from 'three';
import { config } from '../config';
import type { CharacterDef } from '../data/characters';
import { useAppStore } from '../state/store';
import { type LoadedGltf, ModelOrProxy } from './model-or-proxy';

const IDLE = 'idle';
const WAVE = 'wave';

/** Capsule body + sphere head, scaled to canon height. Breathes with a sine bob so the proxy already "lives". */
function CharacterProxy({ def, hovered }: { def: CharacterDef; hovered: boolean }) {
  const body = useRef<Group>(null);
  const bodyH = def.height * 0.62;
  const headR = def.height * 0.19;
  useFrame(({ clock }) => {
    if (body.current) body.current.position.y = Math.sin(clock.elapsedTime * 1.6 + def.position[0]) * 0.015;
  });
  return (
    <group ref={body}>
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

function RiggedCharacter({ def, gltf }: { def: CharacterDef; gltf: LoadedGltf }) {
  const group = useRef<Group>(null);
  const { actions, mixer } = useAnimations(gltf.animations, group);
  const selected = useAppStore((s) => s.selectedCharacterId === def.id);

  useEffect(() => {
    const idle = actions[IDLE];
    if (idle) idle.reset().setLoop(LoopRepeat, Number.POSITIVE_INFINITY).fadeIn(0.3).play();
    return () => {
      idle?.fadeOut(0.2);
    };
  }, [actions]);

  // Selecting the character plays one wave, then crossfades back to idle.
  useEffect(() => {
    const wave = actions[WAVE];
    const idle = actions[IDLE];
    if (!selected || !wave) return;
    wave.reset().setLoop(LoopOnce, 1);
    wave.clampWhenFinished = true;
    if (idle) idle.crossFadeTo(wave, 0.25, false);
    wave.play();
    const onFinished = () => {
      if (idle) wave.crossFadeTo(idle.reset().play(), 0.3, false);
    };
    mixer.addEventListener('finished', onFinished);
    return () => mixer.removeEventListener('finished', onFinished);
  }, [selected, actions, mixer]);

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
    </group>
  );
}

export function Character({ def }: { def: CharacterDef }) {
  const select = useAppStore((s) => s.select);
  const [hovered, setHovered] = useState(false);
  const url = `${config.models.characterDir}/${def.id}.glb`;

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : '';
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
      <ModelOrProxy url={url} proxy={<CharacterProxy def={def} hovered={hovered} />}>
        {(gltf) => <RiggedCharacter def={def} gltf={gltf} />}
      </ModelOrProxy>
    </group>
  );
}
