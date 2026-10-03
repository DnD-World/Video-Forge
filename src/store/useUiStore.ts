import { create } from "zustand";

// ---------------------------------------------------------------------------
// Where the user is in the app — which view, which rail, which tab.
//
// This used to be local state inside App and ScenePanel, which meant only the
// header could move the user anywhere. A message like "this speaker has no
// voice — set it in Cast" is only half useful without a button that takes you
// there, so the navigation lives here where any panel can reach it.
//
// Not persisted: the app always opens on the canvas.
// ---------------------------------------------------------------------------

export type View = "canvas" | "settings" | "narration";
export type SceneTab = "frame" | "background" | "subtitles" | "render" | "presets";
export type Step = "setup" | "cast" | "script" | "look" | "render";

interface UiState {
  view: View;
  castOpen: boolean;
  sceneOpen: boolean;
  sceneTab: SceneTab;
  /** Path of the last video finished in this session, so the Render step can
   *  show as done. */
  lastRenderPath: string | null;
  /** Welcome screen open. Starts closed; App opens it on first launch. */
  welcomeOpen: boolean;

  setView: (v: View) => void;
  setCastOpen: (v: boolean) => void;
  setSceneOpen: (v: boolean) => void;
  setSceneTab: (t: SceneTab) => void;
  setLastRenderPath: (p: string | null) => void;
  setWelcomeOpen: (v: boolean) => void;
  /** Go to one of the five steps: opens the right view, rail and tab. */
  goTo: (step: Step) => void;
}

export const useUiStore = create<UiState>((set) => ({
  view: "canvas",
  castOpen: true,
  sceneOpen: true,
  sceneTab: "frame",
  lastRenderPath: null,
  welcomeOpen: false,

  setView: (view) => set({ view }),
  setCastOpen: (castOpen) => set({ castOpen }),
  setSceneOpen: (sceneOpen) => set({ sceneOpen }),
  setSceneTab: (sceneTab) => set({ sceneTab }),
  setLastRenderPath: (lastRenderPath) => set({ lastRenderPath }),
  setWelcomeOpen: (welcomeOpen) => set({ welcomeOpen }),

  goTo: (step) => {
    switch (step) {
      case "setup":
        set({ view: "settings" });
        break;
      case "cast":
        set({ view: "canvas", castOpen: true });
        break;
      case "script":
        set({ view: "narration" });
        break;
      case "look":
        set({ view: "canvas", sceneOpen: true, sceneTab: "frame" });
        break;
      case "render":
        set({ view: "canvas", sceneOpen: true, sceneTab: "render" });
        break;
    }
  },
}));
