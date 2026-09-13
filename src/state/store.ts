import type { Object3D } from 'three';
import { create } from 'zustand';
import { DEFAULT_TIME_OF_DAY, type TimeOfDayId } from '../data/time-of-day';

interface AppState {
  selectedCharacterId: string | null;
  /** Which model URLs actually exist on the server; missing → proxy geometry. */
  availableModels: Record<string, boolean>;
  preflightDone: boolean;
  autoRotate: boolean;
  /** The six characters stroll round the block; off, they walk back to their spots. */
  walkMode: boolean;
  /** Incremented to request a camera reset; camera rig subscribes. */
  resetToken: number;
  /** Boxes the orbit camera collides with, published by `Neighbours`. */
  cameraColliders: Object3D[];
  /** Which lighting/sky preset the scene eases toward. */
  timeOfDay: TimeOfDayId;
  select: (id: string | null) => void;
  setAvailable: (map: Record<string, boolean>) => void;
  setCameraColliders: (meshes: Object3D[]) => void;
  setTimeOfDay: (id: TimeOfDayId) => void;
  toggleAutoRotate: () => void;
  toggleWalkMode: () => void;
  resetView: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedCharacterId: null,
  availableModels: {},
  preflightDone: false,
  autoRotate: false,
  walkMode: false,
  resetToken: 0,
  cameraColliders: [],
  timeOfDay: DEFAULT_TIME_OF_DAY,
  select: (id) => set({ selectedCharacterId: id }),
  setAvailable: (map) => set({ availableModels: map, preflightDone: true }),
  setCameraColliders: (meshes) => set({ cameraColliders: meshes }),
  setTimeOfDay: (id) => set({ timeOfDay: id }),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  toggleWalkMode: () => set((s) => ({ walkMode: !s.walkMode })),
  resetView: () => set((s) => ({ resetToken: s.resetToken + 1, selectedCharacterId: null })),
}));

/** HEAD-check every model once so Suspense never hits a 404 and proxies render instead. */
export async function preflightModels(urls: string[]) {
  const entries = await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        const type = res.headers.get('content-type') ?? '';
        // Vite dev serves index.html for unknown paths → treat html as missing.
        return [url, res.ok && !type.includes('text/html')] as const;
      } catch {
        return [url, false] as const;
      }
    }),
  );
  useAppStore.getState().setAvailable(Object.fromEntries(entries));
}
