// The AI box (creator phase 3): Ak types plain words for one part or the whole character; the
// model may only change the OPEN fields (unlocked parts, never clothes, main colour or voice).
// The answer is checked again here against this screen's own locks, then shown on the stage as
// a preview: Keep or Throw away. Ak's own keys, through the app's key store (they never leave
// the main process); the model is picked from what his key can use.

import { useEffect, useState } from "react";
import { readPartsAnswer, keepLocked, type CharacterCard, type Locks } from "../../../characters/core/index.mjs";
import { plainError } from "../../lib/plainError";

type Change = { key: string; label: string; from: unknown; to: unknown };
const PREF = "vf.creator.ai";
const readPref = (): { provider?: string; model?: string } => { try { return JSON.parse(localStorage.getItem(PREF) || "{}"); } catch { return {}; } };
const writePref = (p: { provider?: string; model?: string }) => { try { localStorage.setItem(PREF, JSON.stringify(p)); } catch { /* private window */ } };

/** A provider's refusal in a sentence: its own message, without the JSON round it. */
function friendly(e: unknown): string {
  // the main process's message comes wrapped ("Error invoking remote method …: Error: …"): take the last part
  const text = (e instanceof Error ? e.message : String(e)).split("Error: ").pop() ?? "";
  const m = /"message":\s*"([^"]+)/.exec(text); // the provider's text may be cut short, without its closing quote
  const who = /^([^:]+?) [\w./-]+: HTTP (\d+)/.exec(text);
  if (m && who) return `${who[1]} said no (${who[2]}): ${m[1].split(/(?<=\.)\s/)[0]} Pick another service or model.`;
  return plainError(e, "Try again, or pick another model.");
}

/** A value as the change list shows it; colours get a swatch. */
function Val({ v }: { v: unknown }) {
  if (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) return <><i className="cr-ai-sw" style={{ background: v }} />{v}</>;
  return <>{show(v)}</>;
}

function show(v: unknown): string {
  if (Array.isArray(v)) return v.length ? `${v.length} mark${v.length > 1 ? "s" : ""}` : "none";
  if (v === "" || v === null || v === undefined) return "none";
  if (typeof v === "boolean") return v ? "on" : "off";
  if (typeof v === "number") return String(Math.round(v * 100) / 100);
  return String(v);
}

export function AiBox({ scope, keys, card, locks, example, onPreview, onKeep, compact = false }: {
  scope: string; keys: string[]; card: CharacterCard; locks: Locks; example: string;
  onPreview: (c: CharacterCard | null) => void; onKeep: (changes: Change[]) => void; compact?: boolean;
}) {
  const [providers, setProviders] = useState<{ id: string; label: string }[] | null>(null);
  const [provider, setProvider] = useState(readPref().provider ?? "");
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState(readPref().model ?? "");
  const [words, setWords] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ changes: Change[]; problems: string[]; note: string; model: string; ms: number } | null>(null);

  useEffect(() => {
    void window.byok?.characters?.providers().then((list) => {
      const ok = list.filter((p) => p.hasKey);
      setProviders(ok);
      if (!ok.some((p) => p.id === provider) && ok[0]) setProvider(ok[0].id);
    }).catch(() => setProviders([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!provider) return;
    setModels([]);
    void window.byok.characters.models(provider).then(({ models: ms, usual }) => {
      setModels(ms);
      setModel((m) => (m && ms.includes(m) ? m : usual || ms[0] || ""));
    }).catch((e) => setError(plainError(e, "Check the key in Settings.")));
  }, [provider]);
  useEffect(() => { if (provider) writePref({ provider, model }); }, [provider, model]);
  // a different character or part: the old answer no longer applies
  useEffect(() => { setResult(null); onPreview(null); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [scope, card.name]);

  const ask = async () => {
    setBusy(true); setError(null); setResult(null); onPreview(null);
    try {
      const r = await window.byok.characters.askParts({ card, keys, request: words, scope, provider, model: model || undefined });
      // checked again here, against this screen's own locks
      const mine = readPartsAnswer(r.text, card, keys);
      const kept = keepLocked(card, mine.card, locks);
      const changes = mine.changes.filter((c) => JSON.stringify((kept as unknown as Record<string, unknown>)[c.key]) === JSON.stringify(c.to));
      setResult({ changes, problems: mine.problems, note: mine.note, model: r.model, ms: r.ms });
      if (changes.length) onPreview(kept);
    } catch (e) {
      setError(friendly(e));
    } finally { setBusy(false); }
  };

  if (providers && !providers.length) {
    return <p className="cr-ai-none" data-tip="The AI box uses your own keys. Add one in Settings (the gear, top right).">No AI key is saved yet. Add one in Settings (the gear), then come back.</p>;
  }
  return (
    <div className={`cr-ai ${compact ? "compact" : ""} ${busy ? "busy" : ""}`} data-tip={`Say what you want for ${scope} in plain words. Only unlocked parts can change; you see it first and keep it or throw it away.`}>
      <textarea
        className="cr-ai-words"
        value={words}
        onChange={(e) => setWords(e.target.value)}
        placeholder={example}
        rows={compact ? 2 : 2}
        aria-label={`What to change for ${scope}`}
        data-tip={`For example: ${example} (left and right as you look at them).`}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && words.trim() && !busy) void ask(); }}
      />
      <div className="cr-ai-row">
        <select className="cr-ai-pick" value={provider} onChange={(e) => setProvider(e.target.value)} aria-label="Which AI service" data-tip="Which of your AI services to ask (only ones with a key saved).">
          {(providers ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select className="cr-ai-pick model" value={model} onChange={(e) => setModel(e.target.value)} aria-label="Which model" data-tip="Which model to ask: every text model your key can use.">
          {!models.length && <option value="">{provider ? "Listing models…" : "—"}</option>}
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {busy ? (
          <button className="btn" onClick={() => void window.byok.characters.cancel()} data-tip="Stop asking.">Stop</button>
        ) : (
          <button className="btn btn-primary cr-ai-go" disabled={!words.trim() || !provider} onClick={() => void ask()} data-tip="Ask the model (Ctrl+Enter). Nothing changes until you press Keep.">✦ Ask</button>
        )}
      </div>
      {busy && <div className="cr-ai-wait" data-tip="Waiting for the model's answer."><i /><i /><i /> Thinking…</div>}
      {error && <p className="cr-warn" data-tip="What went wrong.">{error}</p>}
      {result && (
        <div className="cr-ai-result" data-tip="What the model would change. The stage shows it now; nothing is changed until you press Keep.">
          {result.note && <p className="cr-ai-note" data-tip="What the model said about it.">“{result.note}”</p>}
          {result.changes.length ? (
            <ul className="cr-ai-changes">
              {result.changes.map((c) => (
                <li key={c.key} data-tip={`${c.label}: from ${show(c.from)} to ${show(c.to)}.`}>
                  <b>{c.label}</b> <span><Val v={c.from} /></span> → <em><Val v={c.to} /></em>
                </li>
              ))}
            </ul>
          ) : <p className="cr-ai-note" data-tip="The answer had nothing that could be used.">Nothing to change.</p>}
          {result.problems.length > 0 && (
            <details className="cr-adv" data-tip="Parts of the answer that were left out or fixed.">
              <summary data-tip="Show what was left out.">{result.problems.length} thing{result.problems.length > 1 ? "s" : ""} left out or fixed</summary>
              <ul className="cr-ai-problems">{result.problems.map((p, i) => <li key={i} data-tip={p}>{p}</li>)}</ul>
            </details>
          )}
          <div className="cr-ai-row">
            {result.changes.length > 0 && <button className="btn btn-primary" onClick={() => { onKeep(result.changes); onPreview(null); setResult(null); setWords(""); }} data-tip="Keep these changes (Undo takes them back).">Keep</button>}
            <button className="btn" onClick={() => { onPreview(null); setResult(null); }} data-tip="Throw this answer away; nothing changes.">Throw away</button>
            <span className="cr-ai-meta" data-tip="Which model answered, and how long it took.">{result.model} · {(result.ms / 1000).toFixed(1)} s</span>
          </div>
        </div>
      )}
    </div>
  );
}
