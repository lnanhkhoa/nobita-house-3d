import { useGLTF } from '@react-three/drei';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import type { AnimationClip, Group } from 'three';
import { useAppStore } from '../state/store';

export interface LoadedGltf {
  scene: Group;
  animations: AnimationClip[];
}

interface Props {
  url: string;
  /** Rendered when the GLB is missing (or until preflight finishes). */
  proxy: ReactNode;
  /** Receives the loaded scene; lets the caller add animation/handlers. */
  children: (gltf: LoadedGltf) => ReactNode;
}

/** Renders the real GLB when it exists on the server, otherwise a placeholder. Never throws on 404. */
export function ModelOrProxy({ url, proxy, children }: Props) {
  const available = useAppStore((s) => s.availableModels[url] === true);
  if (!available) return <>{proxy}</>;
  return (
    <Suspense fallback={proxy}>
      <Loaded url={url}>{children}</Loaded>
    </Suspense>
  );
}

function Loaded({ url, children }: Pick<Props, 'url' | 'children'>) {
  const gltf = useGLTF(url);
  // useGLTF is typed for string | string[]; a single url always yields a single result.
  return <>{children(gltf as LoadedGltf)}</>;
}
