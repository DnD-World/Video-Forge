// ---------------------------------------------------------------------------
// Pick a set (characters/sets/sets.mjs): a news desk, a conference room, a
// stage, a podcast (facing or split screen), a game show. Each tile is the set
// itself, drawn live. With a set the speakers are seated in it and the
// furniture hides them from the waist down; "No set" puts them back where they
// were placed.
// ---------------------------------------------------------------------------

import { useLayoutEffect, useRef } from "react";
import { SETS, SET_IDS } from "../../../characters/sets/sets.mjs";
import { useProjectStore } from "../../store/useProjectStore";

function Tile({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    cv.width = 320; cv.height = 180;
    const ctx = cv.getContext("2d")!;
    SETS[id].back(ctx, 320, 180, { title: id === "news" ? "NEWS" : id === "stage" ? "TALK" : "", names: ["A", "B"] });
    SETS[id].front(ctx, 320, 180, { names: ["A", "B"] });
  }, [id]);
  return <canvas ref={ref} style={{ width: "100%", aspectRatio: "16 / 9", display: "block", borderRadius: 10 }} />;
}

export function SetPicker() {
  const scene = useProjectStore((s) => s.scene);
  const setScene = useProjectStore((s) => s.setScene);
  const speakers = useProjectStore((s) => s.speakers);
  const cur = scene ? SETS[scene.id] : null;
  return (
    <section className="space-y-2 mb-5">
      <div className="label-etched" data-tip="A place for your speakers to sit: they are seated in it and the furniture hides them from the waist down.">Set</div>
      <div className="grid grid-cols-2 gap-2">
        <button
          className={`forge-set-tile ${!scene ? "on" : ""}`}
          onClick={() => setScene(null)}
          data-tip="No set: the speakers stand where you placed them, over the background."
        >
          <div className="none">No set</div>
        </button>
        {SET_IDS.map((id) => (
          <button
            key={id}
            className={`forge-set-tile ${scene?.id === id ? "on" : ""}`}
            onClick={() => setScene({ id, title: scene?.id === id ? scene.title : "", names: scene?.names ?? [] })}
            data-tip={`${SETS[id].help} Seats up to ${SETS[id].max}.`}
          >
            <Tile id={id} />
            <span>{SETS[id].label}</span>
          </button>
        ))}
      </div>
      {cur && (
        <>
          {speakers.length > cur.max && (
            <p className="text-sm text-amber-300" data-tip="The set has fewer seats than you have speakers.">
              This set seats {cur.max}; the first {cur.max} speakers are shown.
            </p>
          )}
          {(scene!.id === "news" || scene!.id === "stage") && (
            <label className="block" data-tip="The words on the set: under the news desk, or on the big screen behind the stage.">
              <span className="label-etched">Title on the set</span>
              <input type="text" className="w-full mt-1" maxLength={40} placeholder="MORNING BRIEF" value={scene!.title ?? ""} onChange={(e) => setScene({ ...scene!, title: e.target.value.toUpperCase() })} />
            </label>
          )}
          {scene!.id === "podcastSplit" && (
            <label className="block" data-tip="The name tags under each host, left then right, separated by a comma.">
              <span className="label-etched">Name tags</span>
              <input type="text" className="w-full mt-1" maxLength={40} placeholder="NIKOS, MAYA" value={(scene!.names ?? []).join(", ")} onChange={(e) => setScene({ ...scene!, names: e.target.value.toUpperCase().split(",").map((x) => x.trim()).filter(Boolean).slice(0, 2) })} />
            </label>
          )}
        </>
      )}
    </section>
  );
}
