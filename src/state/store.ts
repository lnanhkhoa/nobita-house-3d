import { create } from 'zustand';

interface AppState {
  selectedCharacterId: string | null;
  /** Which model URLs actually exist on the server; missing → proxy geometry. */
  availableModels: Record<string, boolean>;
  preflightDone: boolean;
  autoRotate: boolean;
  /** Incremented to request a camera reset; camera rig subscribes. */
  resetToken: number;
  select: (id: string | null) => void;
  setAvailable: (map: Record<string, boolean>) => void;
  toggleAutoRotate: () => void;
  resetView: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedCharacterId: null,
  availableModels: {},
  preflightDone: false,
  autoRotate: false,
  resetToken: 0,
  select: (id) => set({ selectedCharacterId: id }),
  setAvailable: (map) => set({ availableModels: map, preflightDone: true }),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
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
