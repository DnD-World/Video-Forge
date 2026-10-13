import { useEffect, useState } from "react";
import { useSettingsStore } from "../../store/useSettingsStore";
import { Toggle } from "../ui/Toggle";
import { HudButton } from "../ui/HudButton";
import TtsTestPanel from "./TtsTestPanel";
import { Slider } from "../ui/Slider";
import { projectClipPaths } from "../../lib/media/autoClean";

// Every provider carries its own plain-English explanation and a direct link
// to the page that issues the key. The `access` field is the important one:
// "instant" vs "approval" is the difference between a key you can have in two
// minutes and one you wait days for, and not knowing which is which is what
// makes this screen feel like a wall.
/** The shipped accent. Kept beside the picker rather than imported from the
 *  settings store's initial state, so "Default" means a stated value rather
 *  than whatever the store happened to be constructed with. */
const DEFAULT_ACCENT = "#76FFC2";

/** The Forge colours (stravelakis mint and navy, the logos' spark), offered as one click each.
 *  A freeform picker is still there — this is for the common case. */
const ACCENT_PRESETS = [
  { name: "Mint", hex: "#76FFC2" },
  { name: "Soft mint", hex: "#82D8B7" },
  { name: "Navy", hex: "#5562B8" },
  { name: "Spark", hex: "#FF8A30" },
  { name: "Ice", hex: "#9FC6D8" },
];

type Access = "instant" | "approval";

interface Provider {
  id: string;
  label: string;
  what: string;
  url: string;
  access: Access;
}

const PROVIDERS: Provider[] = [
  {
    id: "elevenlabs",
    label: "ElevenLabs",
    what:
      "Voices, charged by the character. A lesson is about 4,600 credits, so the " +
      "72-lesson course is roughly 334,000 — one month of Pro, or three of Creator " +
      "with nothing spare for re-renders. Paid — the app shows the cost before using it.",
    url: "https://elevenlabs.io/app/settings/api-keys",
    access: "instant",
  },
  {
    id: "gemini",
    label: "Gemini",
    what:
      "Plans the background footage for every line, and (soon) voices and pictures. " +
      "A Google AI Studio key — no Google Cloud project needed, and there is a free tier.",
    url: "https://aistudio.google.com/apikey",
    access: "instant",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    what: "Fish Audio, the voice with the funny foreign accent. Free model; the key is free too.",
    url: "https://openrouter.ai/keys",
    access: "instant",
  },
  {
    id: "nvidia",
    label: "NVIDIA",
    what: "Writes and polishes your script with GLM-5.2. Free to use.",
    url: "https://build.nvidia.com/",
    access: "instant",
  },
  {
    id: "pixabay",
    label: "Pixabay",
    what: "Background video clips and images.",
    url: "https://pixabay.com/api/docs/",
    access: "instant",
  },
  {
    id: "pexels",
    label: "Pexels",
    what: "Background video clips and images — a second source, so you're not stuck with one library's stock look.",
    url: "https://www.pexels.com/api/",
    access: "instant",
  },
  {
    id: "freesound",
    label: "Freesound",
    what: "Sound effects — barks, whistles, clickers. Searched CC0-only, so nothing needs crediting.",
    url: "https://freesound.org/apiv2/apply/",
    access: "approval",
  },
];

// REMOVED, and each for a different reason — none of them "not yet":
//
//   Jamendo    — rejected on licensing months ago, and still had a key box.
//                A field for a provider that was ruled out is an instruction to
//                go and sign up for something unusable.
//   Azure      — had a saved key AND a working Test button for an engine with
//                NO synthesis code anywhere in the app. It could pass its test
//                and still never speak, which is the most misleading state a
//                setting can be in.
//   Drive      — on the cut list as "stubs only, don't build". A COMING SOON
//                badge on something nobody intends to build is a promise.
//
// ElevenLabs was on that list too and came back on 20 Aug 2026, with the code
// behind it in the same change — which is the rule below, kept.
//
// If any of these is ever genuinely wanted, add it back WITH the code behind
// it, in the same change.

const ACCESS_BADGE: Record<Access, { text: string; className: string }> = {
  instant: {
    text: "FREE · INSTANT",
    className: "bg-emerald-500/15 text-emerald-300",
  },
  approval: {
    text: "NEEDS APPROVAL",
    className: "bg-amber-500/15 text-amber-300",
  },
};

interface TestState {
  busy: boolean;
  result?: { ok: boolean; message: string };
}

/** Downloaded background clips: size, limit, automatic clean-up, and a
 *  button for now. Ak, 12 Oct 2026: 450 clips / 2.7 GB had piled up. */
/** LocalAI on this computer — the free picture and sound models Image Forge
 *  also uses. Shows what is there, sorted by kind. */
function LocalAiCard() {
  const base = useSettingsStore((s) => s.localAiBase);
  const setBase = useSettingsStore((s) => s.setLocalAiBase);
  const [state, setState] = useState<{ ok: boolean; models?: string[]; problem?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const test = async () => {
    setBusy(true);
    setState(await window.byok.local.models(base));
    setBusy(false);
  };
  useEffect(() => {
    void test();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const kind = (id: string) =>
    /image|flux|sdxl|stable-diffusion|dreamshaper|kontext/i.test(id) && !/audio|sfx/i.test(id)
      ? "Pictures"
      : /audio|sfx|tts|whisper|piper|bark|voice/i.test(id)
        ? "Sound and voice"
        : "Text";
  const groups = (state?.models ?? []).reduce<Record<string, string[]>>((g, id) => ((g[kind(id)] ??= []).push(id), g), {});
  return (
    <div className="forge-sec space-y-3">
      <div className="label-etched" data-tip="Free models running on this computer (LocalAI, in Docker). Image Forge's puppet maker draws with them; nothing is sent to the internet.">
        Your own machine (LocalAI)
      </div>
      <div className="flex gap-2">
        <input type="text" value={base} onChange={(e) => setBase(e.target.value)} className="flex-1 min-w-0" data-tip="Where LocalAI answers. Usually http://127.0.0.1:8080." />
        <button className="btn" onClick={() => void test()} disabled={busy} data-tip="Ask LocalAI what it has.">
          {busy ? "Testing…" : "Test"}
        </button>
      </div>
      {state && !state.ok && <p className="text-sm text-amber-300">{state.problem}</p>}
      {state?.ok && (
        <div className="space-y-1 text-sm">
          <p className="text-emerald-300">✓ Answering · {state.models?.length ?? 0} models</p>
          {Object.entries(groups).map(([k, ids]) => (
            <p key={k} className="text-neutral-400">
              <b className="text-neutral-200 font-medium">{k}:</b> {ids.join(", ")}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ClipStorage() {
  const limit = useSettingsStore((s) => s.mediaLimitGb);
  const setLimit = useSettingsStore((s) => s.setMediaLimitGb);
  const auto = useSettingsStore((s) => s.mediaAutoClean);
  const setAuto = useSettingsStore((s) => s.setMediaAutoClean);
  const [stats, setStats] = useState<{ files: number; bytes: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const refresh = () => void window.byok.mediaCache.stats().then(setStats);
  useEffect(refresh, []);
  const gb = (b: number) => `${(b / 1e9).toFixed(1)} GB`;
  const over = stats && stats.bytes > limit * 1e9;
  return (
    <div className="border border-accent/25 bg-metal-800/60 p-4 space-y-3">
      <h3 className="label-lit text-sm">Downloaded background clips</h3>
      <p className="text-sm text-neutral-400" title="Stock clips are downloaded for each video's background and kept so re-renders are fast.">
        {stats ? `${stats.files} clips, ${gb(stats.bytes)}` : "Counting…"}
        {over && !auto ? " — over your limit. Clean up, or switch on automatic clean-up." : ""}
      </p>
      <Slider
        label="Keep at most"
        data-tip="The most disk space the downloaded background clips may use. Past this, the oldest ones can be cleaned away."
        value={limit}
        min={0.5} max={20} step={0.5}
        format={(v) => `${v} GB`}
        onChange={setLimit}
      />
      <div className="flex items-center gap-3" title="After every render and when the app starts, the clips used longest ago are removed until the folder is under this limit. Clips your open project uses are kept. A removed clip downloads again if a video needs it.">
        <Toggle label="Clean up automatically" checked={auto} onChange={setAuto} />
      </div>
      <div className="flex items-center gap-3">
        <HudButton
          data-tip="Deletes the stock clips this app downloaded, except ones your open project uses. They download again if needed."
          onClick={async () => {
            if (!window.confirm("Remove every downloaded background clip except the ones this project uses? They download again if a video needs them.")) return;
            const r = await window.byok.mediaCache.cleanUp(0, projectClipPaths());
            setNote(`Removed ${r.removed} clips, freed ${gb(r.freedBytes)}.`);
            refresh();
          }}
        >
          Clean up now
        </HudButton>
        {note && <span className="text-sm text-neutral-400">{note}</span>}
      </div>
    </div>
  );
}

export default function BackendPanel() {
  const [saved, setSaved] = useState<string[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [encryptionAvailable, setEncryptionAvailable] = useState(true);

  const setDefault = useSettingsStore((s) => s.setDefault);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const motionEnabled = useSettingsStore((s) => s.motionEnabled);
  const setMotionEnabled = useSettingsStore((s) => s.setMotionEnabled);

  const refresh = () => window.byok.keys.list().then(setSaved);
  useEffect(() => {
    refresh();
    // Optional-chained: `window.byok` exists only inside Electron. An unguarded
    // call here throws during mount and takes the WHOLE app down, which is a
    // blank window that looks like a styling fault rather than a missing bridge.
    window.byok?.keys?.encryptionAvailable().then(setEncryptionAvailable);
  }, []);

  const save = async (id: string) => {
    if (!draft[id]) return;
    await window.byok.keys.set(id, draft[id]);
    setDraft((d) => ({ ...d, [id]: "" }));
    // A previous test result describes the old key, so drop it.
    setTests((t) => ({ ...t, [id]: { busy: false } }));
    refresh();
  };

  const remove = async (id: string) => {
    await window.byok.keys.remove(id);
    setTests((t) => ({ ...t, [id]: { busy: false } }));
    refresh();
  };

  const test = async (id: string) => {
    setTests((t) => ({ ...t, [id]: { busy: true } }));
    try {
      const result = await window.byok.keys.test(id);
      setTests((t) => ({ ...t, [id]: { busy: false, result } }));
    } catch (e) {
      // Without this the button sticks on "Testing…" forever and the real
      // problem stays invisible. The common cause is the Electron main
      // process still running older code that has no keys:test handler —
      // the UI hot-reloads, main does not.
      const msg = e instanceof Error ? e.message : String(e);
      setTests((t) => ({
        ...t,
        [id]: {
          busy: false,
          result: {
            ok: false,
            message: msg.includes("No handler registered")
              ? "This build of the app doesn't have the connectivity test yet — fully quit and restart the app (Ctrl+C the dev server and run npm run dev again)."
              : `Test couldn't run — ${msg}`,
          },
        },
      }));
    }
  };

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <h2 className="label-lit text-base">API Keys &amp; Backend</h2>
      <p className="text-sm">
        Keys are encrypted with your OS keychain and never leave this machine.
        Paste a key, press Save, then press Test to confirm it actually works —
        Test makes one real call to the provider.
      </p>

      <LocalAiCard />
      <ClipStorage />

      {/* Appearance was here — removed 13 Oct 2026 (Ak): the Forge look is the
          look, and motion is always on (the system's reduced-motion setting is
          still respected). */}
      {!encryptionAvailable && (
        <p className="text-sm text-accent-bright border border-accent-deep/40 bg-accent-deep/10 px-3 py-2">
          Your OS keychain isn't available, so keys are being saved to a
          local file instead of encrypted storage. They still never leave
          this machine, but consider unlocking your OS keychain for
          stronger protection.
        </p>
      )}

      {PROVIDERS.map((p) => {
        const isSaved = saved.includes(p.id);
        const badge = ACCESS_BADGE[p.access];
        const state = tests[p.id];
        return (
          <div
            key={p.id}
            className="border p-4 border-accent/25 bg-metal-800/60"
          >
            <div className="flex items-center justify-between mb-1 gap-3">
              <span className="text-base text-neutral-200">
                {p.label}
                <span className={`ml-2 px-2 py-0.5 text-sm ${badge.className}`}>
                  {badge.text}
                </span>
              </span>
              {isSaved && (
                <span className="text-sm text-emerald-400 shrink-0">saved ✓</span>
              )}
            </div>

            <p className="text-sm mb-2">{p.what}</p>

            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-accent-bright underline hover:text-accent inline-block mb-3"
              data-tip={`Opens the ${p.label} website where you can get your own key. A key is like a password that lets this app use the service.`}
            >
              Get a key →
            </a>

                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder={isSaved ? "Replace key…" : "Paste key…"}
                    data-tip={`Paste your ${p.label} key here. It stays on this computer.`}
                    value={draft[p.id] ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [p.id]: e.target.value }))
                    }
                    className="flex-1 bg-metal-900 border border-accent/25 px-3 py-2 text-base text-neutral-100 outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => save(p.id)}
                    data-tip={`Keeps the key you pasted for ${p.label}.`}
                    className="btn cut-sm btn-primary px-4 py-2 text-sm font-display font-semibold uppercase tracking-[0.1em]"
                  >
                    Save
                  </button>
                  {isSaved && (
                    <>
                      <button
                        onClick={() => test(p.id)}
                        data-tip={`Checks that your ${p.label} key really works.`}
                        disabled={state?.busy}
                        className="btn cut-sm px-4 py-2 text-sm font-display uppercase tracking-[0.1em] hover:text-accent-bright disabled:opacity-40"
                      >
                        {state?.busy ? "Testing…" : "Test"}
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        data-tip={`Forgets your ${p.label} key. You can paste it again later.`}
                        className="btn cut-sm px-4 py-2 text-sm font-display uppercase tracking-[0.1em] hover:text-red-400"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>

                {state?.result && (
                  <p
                    className={`text-sm mt-2 ${
                      state.result.ok ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {state.result.ok ? "✓ " : "✕ "}
                    {state.result.message}
                  </p>
                )}
          </div>
        );
      })}

      <div className="border border-accent/25 bg-metal-800/60 p-4">
        <h3 className="label-lit text-sm mb-2">Voice Engines — no API key needed</h3>
        <p className="text-sm">
          Piper runs entirely on your own machine, so there's nothing to sign up
          for and nothing to paste. What it asks for below are{" "}
          <em>folder paths</em> on this computer — where you installed it — not
          keys. Piper is the fast local voice, correct and flat, and it is right
          for checking timing. DramaBox is the one that acts, and it generates on
          a rented GPU rather than here — the app writes its files from the
          Narration tab.
        </p>
      </div>


      <TtsTestPanel />
    </div>
  );
}
