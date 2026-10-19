import { env } from "cloudflare:workers";
import { z } from "zod";
import { createGa4DataClient } from "@/server/lib/ga4Client";
import { Ga4ConnectionRepository } from "@/server/features/ga4/repositories/Ga4ConnectionRepository";
import {
  ga4DateInTimeZone,
  shiftGa4Date,
} from "@/server/features/ga4/services/Ga4Dates";
import { targets } from "./targets";

const countsSchema = z.record(z.string(), z.number().int().nonnegative());
const reportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  checkedAt: z.string(),
  timeZone: z.string(),
  counts: countsSchema,
  totals: countsSchema,
  pageViews: z.number(),
});
const stateSchema = z.object({
  domain: z.string(),
  projectId: z.string(),
  propertyId: z.string(),
  checkedAt: z.string(),
  report: reportSchema.nullable(),
  reportError: z.string().nullable(),
  installation: z.enum(["present", "missing", "unverified"]),
  highWater: countsSchema,
  newEvents: countsSchema,
  alert: z.string().nullable(),
  lastNotified: z.string().nullable(),
  delivery: z.string().default("idle"),
  failureEpisode: z.number().int().nonnegative().default(0),
});
type State = z.infer<typeof stateSchema>;
const key = (id: string) => `conversion-monitor:v1:${id}`;
const startDate = "2026-10-07";

async function getProject(projectId: string): Promise<State | null> {
  const parsed = stateSchema.safeParse(
    await env.KV.get(key(projectId), "json"),
  );
  return parsed.success ? parsed.data : null;
}

async function installation(domain: string): Promise<State["installation"]> {
  try {
    // Targets are a fixed reviewed allowlist; redirects never escape that origin.
    const response = await fetch(`https://${domain}/`, {
      redirect: "error",
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "OpenSEO-TrackingHealth/1.0" },
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("text/html") ||
      !response.body
    )
      return "unverified";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let html = "",
      bytes = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 1_000_000) return "unverified";
        html += decoder.decode(chunk.value, { stream: true });
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    // Installation evidence only, never a claim of successful event delivery.
    return /seo-analytics-loader|data-analytics-panel|analytics-consent|consent-analytics/.test(
      html,
    )
      ? "present"
      : "missing";
  } catch {
    return "unverified";
  }
}

async function checkProject(
  projectId: string,
  now = new Date(),
): Promise<State | null> {
  const target = targets.find((t) => t.projectId === projectId);
  if (!target) return null;
  const previous = await getProject(projectId);
  const result: State = {
    domain: target.domain,
    projectId,
    propertyId: target.propertyId,
    checkedAt: now.toISOString(),
    report: previous?.report ?? null,
    reportError: null,
    installation: await installation(target.domain),
    highWater: { ...previous?.highWater },
    newEvents: {},
    alert: previous?.alert ?? null,
    lastNotified: previous?.lastNotified ?? null,
    delivery: previous?.delivery ?? "idle",
    failureEpisode: previous?.failureEpisode ?? 0,
  };
  try {
    const connection = await Ga4ConnectionRepository.getByProjectId(projectId);
    if (!connection) throw new Error("not_connected");
    if (connection.propertyId !== `properties/${target.propertyId}`)
      throw new Error("property_mapping_changed");
    const endDate = shiftGa4Date(
      ga4DateInTimeZone(now, connection.propertyTimeZone),
      -1,
    );
    const client = createGa4DataClient({
      userId: connection.connectedByUserId,
      ga4AccountId: connection.ga4AccountId,
      propertyId: connection.propertyId,
    });
    const response = await client.runReport({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }, { name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          inListFilter: {
            values: [...target.expectedEvents, "page_view"],
            caseSensitive: true,
          },
        },
      },
      offset: "0",
      limit: "100000",
      orderBys: [],
      keepEmptyRows: false,
      returnPropertyQuota: true,
    });
    const rows = response.rows ?? [];
    if (
      (response.rowCount ?? 0) !== rows.length ||
      response.metadata?.dataLossFromOtherRow ||
      response.metadata?.subjectToThresholding ||
      response.metadata?.samplingMetadatas?.length ||
      response.metadata?.schemaRestrictionResponse?.activeMetricRestrictions
        ?.length
    )
      throw new Error("report_incomplete");
    if (
      response.dimensionHeaders?.map((h) => h.name).join(",") !==
        "date,eventName" ||
      response.metricHeaders?.map((h) => h.name).join(",") !== "eventCount"
    )
      throw new Error("report_incomplete");
    const counts: Record<string, number> = {},
      totals: Record<string, number> = Object.fromEntries(
        target.expectedEvents.map((e) => [e, 0]),
      );
    let pageViews = 0;
    for (const row of rows) {
      const date = row.dimensionValues?.[0]?.value,
        event = row.dimensionValues?.[1]?.value;
      const value = Number(row.metricValues?.[0]?.value);
      if (
        !date ||
        !/^\d{8}$/.test(date) ||
        date < startDate.replaceAll("-", "") ||
        date > endDate.replaceAll("-", "") ||
        !event ||
        ![...target.expectedEvents, "page_view"].includes(event) ||
        !Number.isSafeInteger(value) ||
        value < 0
      )
        throw new Error("report_incomplete");
      if (event === "page_view") {
        pageViews += value;
        continue;
      }
      const datedKey = `${date}/${event}`;
      if (datedKey in counts) throw new Error("report_incomplete");
      counts[datedKey] = value;
      totals[event] += value;
    }
    for (const [datedKey, value] of Object.entries(counts)) {
      const increase = Math.max(0, value - (result.highWater[datedKey] ?? 0));
      if (increase) {
        const event = datedKey.split("/")[1];
        result.newEvents[event] = (result.newEvents[event] ?? 0) + increase;
      }
      result.highWater[datedKey] = Math.max(
        result.highWater[datedKey] ?? 0,
        value,
      );
    }
    result.report = {
      startDate,
      endDate,
      checkedAt: now.toISOString(),
      timeZone: connection.propertyTimeZone,
      counts,
      totals,
      pageViews,
    };
  } catch (error) {
    const known = [
      "not_connected",
      "property_mapping_changed",
      "report_incomplete",
    ];
    result.reportError =
      error instanceof Error && known.includes(error.message)
        ? error.message
        : "report_failed";
  }
  const issues = [
    result.reportError,
    result.installation === "present"
      ? null
      : `tracking_${result.installation}`,
  ].filter(Boolean);
  let notifiedCounts: Record<string, number> = {};
  try {
    notifiedCounts = countsSchema.parse(
      JSON.parse(result.lastNotified ?? "{}").highWater ?? {},
    );
  } catch {
    /* Treat invalid notification state as unacknowledged. */
  }
  const unseen = Object.entries(result.highWater).some(
    ([date, count]) => count > (notifiedCounts[date] ?? 0),
  );
  const previousIssues = previous
    ? [
        previous.reportError,
        previous.installation === "present"
          ? null
          : `tracking_${previous.installation}`,
      ].filter(Boolean)
    : [];
  if (issues.length && !previousIssues.length) result.failureEpisode++;
  const fingerprint = JSON.stringify({
    issues,
    highWater: result.highWater,
    episode: result.failureEpisode,
  });
  result.alert =
    (issues.length || unseen) && fingerprint !== result.lastNotified
      ? fingerprint
      : null;
  await env.KV.put(key(projectId), JSON.stringify(result));
  await env.KV.put(
    `${key(projectId)}:${now.toISOString().slice(0, 10)}`,
    JSON.stringify(result),
    { expirationTtl: 90 * 86400 },
  );
  return result;
}

async function deliver(result: State, now: Date) {
  if (!result.alert) return;
  const notifier = Reflect.get(env, "MONITOR_ALERTS") as
    | { notify: (input: unknown) => Promise<{ status: string }> }
    | undefined;
  if (!notifier) {
    result.delivery = "unconfigured";
  } else {
    try {
      const bytes = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(result.domain + result.alert),
      );
      const id = Array.from(new Uint8Array(bytes), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      const issues = [
        result.reportError,
        result.installation === "present"
          ? null
          : `tracking_${result.installation}`,
      ].filter(Boolean);
      const response = await notifier.notify({
        id,
        domain: result.domain,
        propertyId: result.propertyId,
        startDate,
        endDate:
          result.report?.endDate ??
          shiftGa4Date(ga4DateInTimeZone(now, "Europe/Berlin"), -1),
        totals: result.report?.totals ?? {},
        issues,
      });
      result.delivery = [
        "accepted",
        "uncertain",
        "rejected",
        "retry",
        "sending",
        "unconfigured",
      ].includes(response.status)
        ? response.status
        : "unavailable";
      if (result.delivery === "accepted") {
        result.lastNotified = result.alert;
        result.alert = null;
      }
    } catch {
      result.delivery = "unavailable";
    }
  }
  await env.KV.put(key(result.projectId), JSON.stringify(result));
}
async function run(now = new Date()) {
  // Hourly trigger permits retry after failure; a successful daily run is skipped.
  const local = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now);
  if (Number(local) < 10) return;
  const day = ga4DateInTimeZone(now, "Europe/Berlin");
  if (await env.KV.get(`conversion-monitor:completed:${day}`)) return;
  const results: State[] = [];
  for (const target of targets) {
    const r = await checkProject(target.projectId, now);
    if (r) {
      await deliver(r, now);
      results.push(r);
    }
  }
  const complete =
    results.length === targets.length &&
    results.every(
      (r) => !r.reportError && r.installation === "present" && !r.alert,
    );
  await env.KV.put(
    "conversion-monitor:last-run",
    JSON.stringify({
      checkedAt: now.toISOString(),
      complete,
      projects: results.length,
    }),
  );
  if (complete)
    await env.KV.put(`conversion-monitor:completed:${day}`, "1", {
      expirationTtl: 3 * 86400,
    });
  return results;
}
export const ConversionMonitor = { getProject, checkProject, run };
