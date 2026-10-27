// ---------------------------------------------------------------------------
// Which way a puppet faces (13 Oct 2026): to the camera, or — with a puppet
// made with Image Forge's side view — towards the other speaker, so two
// characters talk to each other rather than both to the viewer (Ak).
// Pure, shared by the preview and the render.
// ---------------------------------------------------------------------------
import type { Puppet, PuppetViewName } from "../../store/puppetTypes";

export type Facing = "camera" | "left" | "right" | "auto";

export function viewFor(
  sp: { id: string; x: number; facing?: Facing; sitting?: boolean },
  all: { id: string; x: number }[],
  puppet: Puppet | undefined
): { view?: PuppetViewName; mirror: boolean } {
  if (!puppet) return { mirror: false };
  if (sp.sitting && puppet.views?.sit) return { view: "sit", mirror: false };
  if (!puppet.views?.side) return { mirror: false };
  let f = sp.facing ?? "auto";
  if (f === "auto") {
    const others = all.filter((o) => o.id !== sp.id);
    if (!others.length) return { mirror: false };
    const nearest = others.reduce((a, b) => (Math.abs(b.x - sp.x) < Math.abs(a.x - sp.x) ? b : a));
    f = nearest.x < sp.x ? "left" : "right";
  }
  if (f === "camera") return { mirror: false };
  // The side view faces the viewer's left as made; mirrored for the right.
  return { view: "side", mirror: f === "right" };
}
