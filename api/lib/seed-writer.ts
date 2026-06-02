import { promises as fs } from "node:fs";
import path from "node:path";

export function getSeedDataPath(): string {
  return path.resolve(process.cwd(), "src/data/seed-data.json");
}

// ── Shared serialised queue ───────────────────────────────────────────────────
// Every read, write, and read-modify-write of seed-data.json is chained onto a
// single promise queue so operations can never interleave.
//
// This matters because the tRPC client batches calls (httpBatchLink): when
// submitFinalReport fires several inventory mutations in a loop they arrive in
// ONE request and tRPC runs the procedures in parallel. If "read" and "write"
// were separate queue steps, each parallel mutation would read the same stale
// snapshot, then writes would clobber each other (last write wins). Bundling the
// whole read-modify-write into one queued task via updateSeedData() prevents that.
let queue: Promise<unknown> = Promise.resolve();

async function readParsed(): Promise<Record<string, unknown>> {
  const raw = await fs.readFile(getSeedDataPath(), "utf-8");
  // U+FEFF (BOM) at position 0 causes JSON.parse to throw - strip it defensively.
  const stripped = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  return JSON.parse(stripped) as Record<string, unknown>;
}

async function writeParsed(parsed: Record<string, unknown>): Promise<void> {
  await fs.writeFile(getSeedDataPath(), `${JSON.stringify(parsed, null, 4)}\n`, "utf-8");
}

/** Keep the queue chain alive regardless of whether a task resolved or rejected. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

/**
 * Atomically read seed-data.json, apply `mutator` (which mutates `parsed` in
 * place and may return a value), then write it back — all as a single queued
 * task. This is the ONLY race-free way to update the file; prefer it over
 * readSeedData()+writeSeedData() for any read-modify-write.
 */
export function updateSeedData<T>(
  mutator: (parsed: Record<string, unknown>) => T | Promise<T>
): Promise<T> {
  return enqueue(async () => {
    const parsed = await readParsed();
    const result = await mutator(parsed);
    await writeParsed(parsed);
    return result;
  });
}

/** Queued whole-file write. Prefer updateSeedData() for read-modify-write. */
export function writeSeedData(parsed: Record<string, unknown>): Promise<void> {
  return enqueue(() => writeParsed(parsed));
}

/** Queued read so callers observe all prior writes. */
export function readSeedData(): Promise<Record<string, unknown>> {
  return enqueue(() => readParsed());
}
