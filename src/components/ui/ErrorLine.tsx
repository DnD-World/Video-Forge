import { needsSettings } from "../../lib/plainError";
import { HudButton } from "./HudButton";

/**
 * One error message. The text says what happened and what to do (see
 * lib/plainError), it explains itself on hover, and when the problem is a
 * missing or refused key it offers a button that opens Settings.
 */
export function ErrorLine({ text, tip, className = "text-sm text-red-400" }: { text: string; tip: string; className?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p data-tip={tip} className={`${className} whitespace-pre-wrap break-words`}>{text}</p>
      {needsSettings(text) && (
        <HudButton data-tip="Opens Settings, where you paste or fix the key." onClick={() => window.dispatchEvent(new Event("forge:open-settings"))}>
          Open Settings
        </HudButton>
      )}
    </div>
  );
}
