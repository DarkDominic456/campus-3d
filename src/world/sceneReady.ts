import { create } from 'zustand'

/** Flips to true once physics has initialised and the first frame of the world rendered. */
export const useSceneReady = create<{ ready: boolean; setReady: () => void }>()((set) => ({
  ready: false,
  setReady: () => set({ ready: true }),
}))
