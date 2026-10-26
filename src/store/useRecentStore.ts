import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type RecentProject, addRecent, removeRecent, cleanRecent } from "../lib/project/recentProjects";

/** The last few project files saved or opened. Kept between sessions. */
export const useRecentStore = create<{
  items: RecentProject[];
  add: (path: string) => void;
  remove: (path: string) => void;
}>()(
  persist(
    (set) => ({
      items: [],
      add: (path) => set((s) => ({ items: addRecent(s.items, path, Date.now()) })),
      remove: (path) => set((s) => ({ items: removeRecent(s.items, path) })),
    }),
    {
      name: "byok-recent-projects",
      version: 1,
      partialize: (s) => ({ items: s.items }),
      merge: (persisted, current) => ({ ...current, items: cleanRecent((persisted as { items?: unknown } | null)?.items) }),
    }
  )
);
