import { promises as fs } from "node:fs";
import path from "node:path";

export function getSeedDataPath(): string {
  return path.resolve(process.cwd(), "src/data/seed-data.json");
}

// ── Shared write queue ────────────────────────────────────────────────────────
// This module is the single source of truth for all writes to seed-data.json.
// Both router.ts mutations and seed-status-watcher.ts recalculations must go
// through writeSeedData() so that all writes are serialised on one queue and
// can never race each other and corrupt the file.
let writeQueue: Promise<void> = Promise.resolve();

export function writeSeedData(parsed: Record<string, unknown>): Promise<void> {
  const seedDataPath = getSeedDataPath();
  writeQueue = writeQueue.then(() =>
    fs.writeFile(seedDataPath, `${JSON.stringify(parsed, null, 4)}\n`, "utf-8")
  );
  return writeQueue;
}
