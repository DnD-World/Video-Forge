// ---------------------------------------------------------------------------
// Downloading to a file so that a half-finished download can never be mistaken
// for a finished one.
//
// What used to happen: the clip was written straight to its final name. A
// dropped connection left a broken video there, and every later render found
// "the file is there" and used it — black or missing backgrounds, no message.
//
// Now the bytes go to <name>.part. Only when the download ended cleanly AND the
// size matches what the server promised does the file take its real name. Any
// failure deletes the .part. The final name therefore always means "whole".
//
// No electron import on purpose: tools/lib/partFile.test.mjs runs this file.
// ---------------------------------------------------------------------------

import fs from "node:fs";

export const partName = (dest: string) => `${dest}.part`;

export interface PartWriter {
  /** Write a chunk. False means "the disk is behind: wait for drain()". */
  write(chunk: Buffer): boolean;
  /** Resolves once the writer can take more. */
  drain(): Promise<void>;
  /** The download ended cleanly: check the size, then give the file its name. */
  finish(): Promise<void>;
  /** Anything went wrong: close and delete the partial file. Never throws. */
  abort(): Promise<void>;
}

/**
 * @param expectedBytes what the server said it would send (Content-Length), or
 *        null when it did not say or the body is compressed in transit.
 */
export function openPartWriter(dest: string, expectedBytes: number | null): PartWriter {
  const part = partName(dest);
  try {
    fs.rmSync(part, { force: true }); // a leftover from a crash
  } catch {
    /* the open below reports a real problem */
  }
  const out = fs.createWriteStream(part);
  let written = 0;
  let failed: Error | null = null;
  out.on("error", (e) => {
    failed = e;
  });

  // Wait for "close" (the file handle is released), not just "finish": on
  // Windows a file still open cannot be renamed.
  const closed = () =>
    new Promise<void>((resolve) => {
      if (out.closed) return resolve();
      out.once("close", () => resolve());
      out.end();
    });

  return {
    write(chunk) {
      written += chunk.length;
      return out.write(chunk);
    },
    drain() {
      return new Promise<void>((resolve) => out.once("drain", () => resolve()));
    },
    async finish() {
      await closed();
      if (failed) {
        await this.abort();
        throw failed;
      }
      if (written === 0) {
        await this.abort();
        throw new Error("The download was empty.");
      }
      if (expectedBytes !== null && written !== expectedBytes) {
        await this.abort();
        throw new Error(`The download stopped early (${written} of ${expectedBytes} bytes).`);
      }
      fs.renameSync(part, dest);
    },
    async abort() {
      try {
        out.destroy();
        await new Promise<void>((r) => (out.closed ? r() : out.once("close", () => r())));
      } catch {
        /* closing a broken stream may complain; the delete below is what counts */
      }
      try {
        fs.rmSync(part, { force: true });
      } catch {
        /* nothing more to do */
      }
    },
  };
}

/** Is there a finished file at this name? A zero-byte file is not one. */
export function haveFile(dest: string): boolean {
  try {
    return fs.statSync(dest).size > 0;
  } catch {
    return false;
  }
}
