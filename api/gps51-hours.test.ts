import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAllTimeWorkingMs } from "../src/features/fleet/gps51";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchAllTimeWorkingMs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses yearly fallback and parses duration strings for non-zero totals", async () => {
    let wideRangeCalled = false;

    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("action=login")) {
        return jsonResponse({ status: 0, token: "token-1", serverid: 1 });
      }

      if (url.includes("action=reportmileagedetail")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          startday?: string;
          endday?: string;
        };

        if (!wideRangeCalled) {
          wideRangeCalled = true;
          return jsonResponse({ status: 0, records: [] });
        }

        if (body.startday === "2026-01-01" && body.endday === "2026-12-31") {
          return jsonResponse({
            status: 0,
            records: [
              { statisticsday: "2026-05-07", totalaccstr: "5 H 30 M" },
              { statisticsday: "2026-05-08", workingduration: 7_200_000 },
            ],
          });
        }

        return jsonResponse({ status: 0, records: [] });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const totalWorkingMs = await fetchAllTimeWorkingMs(
      "demo-user",
      "demo-password",
      "2026-01-01",
      "2026-12-31"
    );

    expect(totalWorkingMs).toBe(27_000_000);
    expect(wideRangeCalled).toBe(true);
  });
});
