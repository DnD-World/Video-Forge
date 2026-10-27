// Trim downloaded background clips when they pass the limit set in Settings —
// at start-up and after every render. See electron/media/mediaCache.ts.
import { useProjectStore } from "../../store/useProjectStore";
import { useSettingsStore } from "../../store/useSettingsStore";

/** Clips the open project uses: never removed. */
export function projectClipPaths(): string[] {
  const p = useProjectStore.getState();
  return (p.backgrounds ?? []).map((b) => b.filePath).filter((x): x is string => !!x);
}

export async function autoClean(): Promise<string | null> {
  const { mediaAutoClean, mediaLimitGb } = useSettingsStore.getState();
  if (!mediaAutoClean || !window.byok.mediaCache) return null;
  const r = await window.byok.mediaCache.cleanUp(mediaLimitGb * 1e9, projectClipPaths());
  return r.removed ? `Freed ${(r.freedBytes / 1e9).toFixed(1)} GB of old background clips (${r.removed} files).` : null;
}
