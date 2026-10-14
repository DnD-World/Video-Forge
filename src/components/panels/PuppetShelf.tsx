// ---------------------------------------------------------------------------
// Puppets from Image Forge, and ordering a new one (12 Oct 2026).
//
// Image Forge's puppet maker puts finished puppets on the Forge shelf
// (%APPDATA%\Forge\puppets, tools/lib/forgeShelf.mjs); they show here as a row
// of faces, one click to use. "Order a new puppet" writes an order on the same
// shelf and opens Image Forge, which picks it up within 20 seconds. With "make
// it without me" on, nobody needs to be there: the first face Image Forge's
// checker likes is used, and the puppet arrives here when it is done.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import { LiveFace } from "./LiveFace";
import { Picker } from "../ui/Picker";

type ShelfPuppet = Awaited<ReturnType<NonNullable<Window["byok"]>["forge"]["shelfPuppets"]>>[number];

const STYLES = [
  { value: "pixar", label: "3D animated" },
  { value: "lifelike", label: "Lifelike 3D (nearly real)" },
  { value: "photo", label: "Photoreal (experimental)" },
  { value: "flat", label: "Flat cartoon" },
  { value: "clay", label: "Claymation" },
  { value: "paper", label: "Paper cut-out" },
  { value: "anime", label: "Anime" },
  { value: "doodle", label: "Simple doodle" },
];

const fileUrl = (p: string) => `file:///${p.replace(/\\/g, "/").replace(/^\/+/, "")}`;

export function PuppetShelf({ current, onPick, startOrdering = false }: { current?: string; onPick: (rigPath: string, name: string) => void; startOrdering?: boolean }) {
  const [puppets, setPuppets] = useState<ShelfPuppet[]>([]);
  const [ordering, setOrdering] = useState(startOrdering);
  useEffect(() => {
    if (startOrdering) setOrdering(true);
  }, [startOrdering]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("pixar");
  const [framing, setFraming] = useState<"head" | "waist" | "full">("waist");
  const [auto, setAuto] = useState(true);
  const [pictures, setPictures] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [waiting, setWaiting] = useState<string | null>(null);
  // Delete asks twice: the first click arms it, the second does it.
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    void window.byok?.forge?.shelfPuppets().then(setPuppets).catch(() => setPuppets([]));
  }, []);
  useEffect(() => {
    load();
    // Image Forge may finish while this is open: look again when the window
    // comes back into focus, and every half minute while an order is out.
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [load]);
  useEffect(() => {
    if (!waiting) return;
    const t = window.setInterval(async () => {
      const r = await window.byok.forge.orderResult(waiting);
      if (!r) return;
      setWaiting(null);
      load();
      setNote(r.slug ? `Your puppet is ready — it is in the row above.` : `Image Forge could not make it: ${r.problem ?? "no reason given"}.`);
    }, 30000);
    return () => window.clearInterval(t);
  }, [waiting, load]);

  const order = async () => {
    setNote("");
    const r = await window.byok.forge.orderPuppet({ name: name.trim() || "puppet", description, style, framing, auto }, pictures);
    if (!r.ok) return setNote(`Could not place the order: ${r.problem}`);
    setWaiting(r.id ?? null);
    setOrdering(false);
    setNote(
      r.opened
        ? auto
          ? "Ordered. Image Forge is making it on its own — on this computer that takes about half an hour. It will appear above."
          : "Ordered. Image Forge is opening with your description filled in: pick the face there."
        : "Ordered, but Image Forge is not installed here. The order waits until it is."
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="label-etched" data-tip="Puppets made by Image Forge's puppet maker on this computer. Click one to give it to this speaker.">
          Puppets from Image Forge
        </span>
        <button className="btn" onClick={() => setOrdering((v) => !v)} data-tip="Describe a character (and add photos if you like); Image Forge makes it into a talking, blinking puppet.">
          {ordering ? "Never mind" : "Order a new puppet…"}
        </button>
      </div>

      {puppets.length > 0 ? (
        <div className="forge-shelf">
          {puppets.map((p) => (
            <div key={p.slug} className="relative">
              <button
                className={`shelf-face w-full ${current === p.rigPath ? "on" : ""}`}
                onClick={() => onPick(p.rigPath, p.name)}
                data-tip={`${p.name}${p.framing === "waist" ? " · waist up, with arms" : ""}. Click to use. Hover to hear-see them talk.`}
                aria-label={`Use ${p.name}`}
              >
                <LiveFace path={p.rigPath} label={p.name} />
                <span>{p.name}</span>
              </button>
              {deleting === p.slug ? (
                <button
                  className="shelf-del armed"
                  onClick={async () => {
                    await window.byok.forge.removePuppet(p.slug);
                    setDeleting(null);
                    load();
                  }}
                  onMouseLeave={() => setDeleting(null)}
                  data-tip={`Click again to delete ${p.name}. It is moved aside (Forge\puppets-deleted), not erased.`}
                >
                  delete?
                </button>
              ) : (
                <button className="shelf-del" onClick={() => setDeleting(p.slug)} data-tip={`Delete ${p.name} from the shelf — you will be asked once more.`} aria-label={`Delete ${p.name}`}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !ordering && <p className="text-sm text-neutral-500">None yet. Order one, or make one in Image Forge (Wizards → Make a puppet).</p>
      )}

      {ordering && (
        <div className="forge-sec space-y-3">
          <div className="grid grid-cols-[140px_1fr] gap-2">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full" data-tip="What the puppet is called." />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Who is it? e.g. a cheerful red fox chef with a white chef's hat"
              className="w-full"
              data-tip="One or two sentences: what they are, what they wear, their colours."
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div data-tip="The drawing style.">
              <Picker aria-label="Style" className="w-full" value={style} options={STYLES} onChange={setStyle} />
            </div>
            <div data-tip="Head and shoulders talks, blinks and moves its brows. Waist up adds arms: wave, point, shrug, explain.">
              <Picker
                aria-label="How much of them"
                className="w-full"
                value={framing}
                options={[
                  { value: "head", label: "Head and shoulders" },
                  { value: "waist", label: "Waist up, with arms" },
                  { value: "full", label: "Full body (standing, sitting)" },
                ]}
                onChange={(v) => setFraming(v as "head" | "waist" | "full")}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="btn"
              disabled={pictures.length >= 3}
              onClick={async () => {
                const p = await window.byok.dialog.openFile([{ name: "Pictures", extensions: ["png", "jpg", "jpeg", "webp"] }]);
                if (p) setPictures((x) => [...x, p].slice(0, 3));
              }}
              data-tip="Up to 3 photos or drawings to borrow the look from. They inspire; they are not copied."
            >
              Add an inspiration picture
            </button>
            {pictures.map((p) => (
              <button key={p} className="shelf-insp" onClick={() => setPictures((x) => x.filter((y) => y !== p))} data-tip="Click to take it out.">
                <img src={fileUrl(p)} alt="" />
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm" data-tip="On: Image Forge picks the best face itself and carries on — nobody needs to be there. Off: it waits for you to pick the face in Image Forge.">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Make it without me (Image Forge picks the face)
          </label>
          <button className="btn btn-primary" disabled={!description.trim()} onClick={() => void order()} data-tip={description.trim() ? "Send it: Image Forge opens and starts on it. The puppet appears in the row above when it is done." : "Describe who it is first, in the box above."}>
            Send the order to Image Forge
          </button>
        </div>
      )}
      {note && <p className="text-sm text-neutral-400">{note}</p>}
    </div>
  );
}
