// ---------------------------------------------------------------------------
// Turning raw errors into a sentence a non-programmer can act on.
//
// Every message here was a real failure on this machine first — see PLAN.md's
// two traps (antivirus TLS, Piper's dropped sockets). Unknown errors pass
// through unchanged as `detail`, so nothing is ever hidden; it just gets a
// plain-English line on top.
// ---------------------------------------------------------------------------

import type { Step } from "../../store/useUiStore";

export interface FriendlyError {
  /** One sentence: what happened, in plain words. */
  message: string;
  /** What to do about it, if there is something. */
  hint?: string;
  /** A step that fixes it, for a "take me there" button. */
  step?: Step;
  /** The original text, shown folded under "Details". */
  detail: string;
}

interface Rule {
  test: RegExp;
  message: string;
  hint?: string;
  step?: Step;
}

const RULES: Rule[] = [
  {
    test: /ECONNRESET|socket hang up|ECONNREFUSED.*550\d|connect ECONNREFUSED 127\.0\.0\.1/i,
    message: "The voice engine dropped the connection.",
    hint: "Try again — it usually works the second time, once the engine has warmed up.",
  },
  {
    test: /unable to verify the first certificate|CERTIFICATE_VERIFY_FAILED|UnknownIssuer|self[- ]signed certificate/i,
    message: "Your antivirus is checking this internet connection, and the app can't confirm it's safe.",
    hint: "This is usually Avast or Kaspersky web scanning. Try again in a minute; if it keeps failing, see the antivirus section of PLAN.md.",
  },
  {
    test: /ETIMEDOUT|timed out|timeout/i,
    message: "The request took too long and was stopped.",
    hint: "Check the internet connection and try again. AI script drafts can take a few minutes.",
  },
  {
    test: /ENOTFOUND|getaddrinfo|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED/i,
    message: "The app couldn't reach the internet.",
    hint: "Check the connection and try again.",
  },
  {
    test: /\b401\b|\b403\b|unauthori[sz]ed|invalid api key|invalid_api_key|forbidden/i,
    message: "The service rejected the API key.",
    hint: "Open Setup, paste the key again and press Test.",
    step: "setup",
  },
  {
    test: /\b429\b|rate limit|quota|too many requests/i,
    message: "The free allowance for this service is used up for now.",
    hint: "Wait a while (often a minute, sometimes until tomorrow) and try again.",
  },
  {
    test: /python(\.exe)?.*(not found|ENOENT)|spawn .*ENOENT/i,
    message: "The free voice engine (Piper) isn't installed where the app expects it.",
    hint: "Open Setup and check the Piper folders.",
    step: "setup",
  },
  {
    test: /ENOSPC|no space left/i,
    message: "The disk is full.",
    hint: "Free some space (old renders are a good start) and try again.",
  },
  {
    test: /No handler registered/i,
    message: "Part of the app is running an older version.",
    hint: "Close the app completely and open it again.",
  },
];

export function friendlyError(e: unknown): FriendlyError {
  const detail = e instanceof Error ? e.message : String(e ?? "");
  const rule = RULES.find((r) => r.test.test(detail));
  if (rule) return { message: rule.message, hint: rule.hint, step: rule.step, detail };
  // A plain string is a message this app wrote on purpose — already meant for
  // a person — so it is shown as the message rather than buried in Details.
  if (typeof e === "string") return { message: e, detail: "" };
  return { message: "Something went wrong.", detail };
}
