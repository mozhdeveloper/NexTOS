import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";
import {
  fetchAllTimeWorkingMs,
  fetchDailyHistorySummary,
  fetchLastPosition,
  fetchRouteHistory,
} from "./lib/gps51-client";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.get(Paths.oauthCallback, createOAuthCallbackHandler());

function ensureGps51Configured() {
  if (!env.gps51Username || !env.gps51Password) {
    throw new Error("GPS51 backend credentials are missing");
  }

  return {
    username: env.gps51Username,
    password: env.gps51Password,
  };
}

app.get("/api/gps51/last-position", async (c) => {
  try {
    const { username, password } = ensureGps51Configured();
    const data = await fetchLastPosition(username, password);
    return c.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch GPS51 last position";
    return c.json({ error: message }, 500);
  }
});

app.get("/api/gps51/route-history", async (c) => {
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  if (!startDate || !endDate) {
    return c.json({ error: "startDate and endDate are required" }, 400);
  }

  try {
    const { username, password } = ensureGps51Configured();
    const data = await fetchRouteHistory(username, password, startDate, endDate);
    return c.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch GPS51 route history";
    return c.json({ error: message }, 500);
  }
});

app.get("/api/gps51/daily-history-summary", async (c) => {
  const day = c.req.query("day");
  if (!day) {
    return c.json({ error: "day is required" }, 400);
  }

  try {
    const { username, password } = ensureGps51Configured();
    const data = await fetchDailyHistorySummary(username, password, day);
    return c.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch GPS51 daily history summary";
    return c.json({ error: message }, 500);
  }
});

app.get("/api/gps51/all-time-working", async (c) => {
  const startDay = c.req.query("startDay") ?? "2000-01-01";
  const endDay = c.req.query("endDay") ?? undefined;

  try {
    const { username, password } = ensureGps51Configured();
    const totalMs = await fetchAllTimeWorkingMs(username, password, startDay, endDay);
    return c.json({ totalMs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch GPS51 total working time";
    return c.json({ error: message }, 500);
  }
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
