import { beforeEach, expect, test, vi } from "vitest";
import { targets } from "./targets";
import { ConversionMonitor } from "./ConversionMonitor";

const mocks = vi.hoisted(() => ({
  report: vi.fn(),
  connection: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  notify: vi.fn(),
}));
vi.mock("cloudflare:workers", () => ({
  env: {
    KV: { get: mocks.get, put: mocks.put },
    MONITOR_ALERTS: { notify: mocks.notify },
  },
}));
vi.mock("@/server/lib/ga4Client", () => ({
  createGa4DataClient: () => ({ runReport: mocks.report }),
}));
vi.mock("@/server/features/ga4/repositories/Ga4ConnectionRepository", () => ({
  Ga4ConnectionRepository: { getByProjectId: mocks.connection },
}));
beforeEach(() => {
  mocks.get.mockResolvedValue(null);
  mocks.put.mockResolvedValue(undefined);
  mocks.notify.mockResolvedValue({ status: "accepted" });
  mocks.connection.mockResolvedValue({
    propertyId: "properties/557901299",
    propertyTimeZone: "Europe/Skopje",
    connectedByUserId: "owner",
    ga4AccountId: "account",
  });
  mocks.report.mockResolvedValue({
    dimensionHeaders: [{ name: "date" }, { name: "eventName" }],
    metricHeaders: [{ name: "eventCount" }],
    rows: [],
    rowCount: 0,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(
      async () =>
        new Response('<script src="/analytics-consent.js"></script>', {
          headers: { "content-type": "text/html" },
        }),
    ),
  );
});
test("records explicit zero counts only after a complete successful report", async () => {
  const r = await ConversionMonitor.checkProject(
    "6d029846-db91-4430-86f1-2b53efd2302f",
    new Date("2026-10-20T08:00:00Z"),
  );
  expect(r?.report?.totals).toEqual({ booking_confirmed: 0 });
  expect(r?.report?.endDate).toBe("2026-10-19");
  expect(mocks.report.mock.calls[0][0].dimensions).toEqual([
    { name: "date" },
    { name: "eventName" },
  ]);
});
test("failed reports preserve previous successful totals instead of inventing zero", async () => {
  const previous = await ConversionMonitor.checkProject(
    "6d029846-db91-4430-86f1-2b53efd2302f",
    new Date("2026-10-19T08:00:00Z"),
  );
  previous!.report!.totals.booking_confirmed = 2;
  previous!.report!.counts = { "20261018/booking_confirmed": 2 };
  previous!.highWater = { "20261018/booking_confirmed": 2 };
  mocks.get.mockResolvedValue(previous);
  mocks.report.mockRejectedValue(
    new Error("private token must never be returned"),
  );
  const r = await ConversionMonitor.checkProject(
    "6d029846-db91-4430-86f1-2b53efd2302f",
  );
  expect(r?.report?.totals.booking_confirmed).toBe(2);
  expect(r?.reportError).toBe("report_failed");
  expect(JSON.stringify(r)).not.toContain("private token");
});
test("rejects a changed property mapping before requesting data", async () => {
  mocks.connection.mockResolvedValue({ propertyId: "properties/123" });
  const r = await ConversionMonitor.checkProject(
    "6d029846-db91-4430-86f1-2b53efd2302f",
  );
  expect(r?.reportError).toBe("property_mapping_changed");
  expect(mocks.report).not.toHaveBeenCalled();
});
test("does not turn partial reports into a successful zero baseline", async () => {
  mocks.report.mockResolvedValue({ rows: [], rowCount: 2 });
  expect(
    (
      await ConversionMonitor.checkProject(
        "6d029846-db91-4430-86f1-2b53efd2302f",
      )
    )?.reportError,
  ).toBe("report_incomplete");
});

const projectId = "6d029846-db91-4430-86f1-2b53efd2302f";
function eventReport(count: number) {
  return {
    dimensionHeaders: [{ name: "date" }, { name: "eventName" }],
    metricHeaders: [{ name: "eventCount" }],
    rows: [
      {
        dimensionValues: [
          { value: "20261018" },
          { value: "booking_confirmed" },
        ],
        metricValues: [{ value: String(count) }],
      },
    ],
    rowCount: 1,
  };
}
test("counts late corrections once and does not alert again after a temporary decrease", async () => {
  mocks.report.mockResolvedValue(eventReport(2));
  const first = await ConversionMonitor.checkProject(
    projectId,
    new Date("2026-10-20T08:00:00Z"),
  );
  expect(first?.newEvents).toEqual({ booking_confirmed: 2 });
  mocks.get.mockResolvedValue(first);
  mocks.report.mockResolvedValue(eventReport(1));
  const lower = await ConversionMonitor.checkProject(
    projectId,
    new Date("2026-10-21T08:00:00Z"),
  );
  expect(lower?.newEvents).toEqual({});
  mocks.get.mockResolvedValue(lower);
  mocks.report.mockResolvedValue(eventReport(3));
  expect(
    (
      await ConversionMonitor.checkProject(
        projectId,
        new Date("2026-10-22T08:00:00Z"),
      )
    )?.newEvents,
  ).toEqual({ booking_confirmed: 1 });
});
test("missing installation is distinct from successful zero reports", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("<html>Site</html>", {
        headers: { "content-type": "text/html" },
      }),
    ),
  );
  const r = await ConversionMonitor.checkProject(projectId);
  expect(r?.installation).toBe("missing");
  expect(r?.reportError).toBeNull();
  expect(r?.report?.totals.booking_confirmed).toBe(0);
});
test("unknown and excluded projects cannot initiate checks", async () => {
  expect(await ConversionMonitor.checkProject("nulela.com")).toBeNull();
  expect(mocks.report).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

test("daily schedule stays quiet on healthy zero reports and skips a completed day", async () => {
  const stored = new Map<string, unknown>();
  mocks.get.mockImplementation(async (k: string) => stored.get(k) ?? null);
  mocks.put.mockImplementation(async (k: string, v: string) => {
    try {
      stored.set(k, JSON.parse(v));
    } catch {
      stored.set(k, v);
    }
  });
  mocks.connection.mockImplementation(async (id: string) => ({
    propertyId:
      "properties/" + targets.find((t) => t.projectId === id)!.propertyId,
    propertyTimeZone: "Europe/Berlin",
    connectedByUserId: "owner",
    ga4AccountId: "account",
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(
      async () =>
        new Response('<script src="analytics-consent.js"></script>', {
          headers: { "content-type": "text/html" },
        }),
    ),
  );
  const now = new Date("2026-10-20T08:23:00Z");
  await ConversionMonitor.run(now);
  await ConversionMonitor.run(now);
  expect(mocks.report).toHaveBeenCalledTimes(11);
  expect(mocks.notify).not.toHaveBeenCalled();
});
test("unacknowledged alert survives the next check even when event totals do not change", async () => {
  mocks.report.mockResolvedValue(eventReport(1));
  const first = await ConversionMonitor.checkProject(
    projectId,
    new Date("2026-10-20T08:00:00Z"),
  );
  mocks.get.mockResolvedValue(first);
  const next = await ConversionMonitor.checkProject(
    projectId,
    new Date("2026-10-21T08:00:00Z"),
  );
  expect(next?.newEvents).toEqual({});
  expect(next?.alert).toBe(first?.alert);
  mocks.get.mockResolvedValue({ ...next, lastNotified: next?.alert });
  expect(
    (
      await ConversionMonitor.checkProject(
        projectId,
        new Date("2026-10-21T08:00:00Z"),
      )
    )?.alert,
  ).toBeNull();
});

test("failed checks notify once after acceptance, without inventing conversions", async () => {
  const stored = new Map<string, unknown>();
  mocks.get.mockImplementation(async (k: string) => stored.get(k) ?? null);
  mocks.put.mockImplementation(async (k: string, v: string) => {
    try {
      stored.set(k, JSON.parse(v));
    } catch {
      stored.set(k, v);
    }
  });
  mocks.connection.mockResolvedValue(null);
  await ConversionMonitor.run(new Date("2026-10-20T08:23:00Z"));
  await ConversionMonitor.run(new Date("2026-10-20T09:23:00Z"));
  expect(mocks.notify).toHaveBeenCalledTimes(11);
  expect(mocks.notify.mock.calls[0][0].issues).toEqual(["not_connected"]);
  expect(mocks.notify.mock.calls[0][0].totals).toEqual({});
});

test("a recovered outage can alert again while retries within an outage stay quiet", async () => {
  const stored = new Map<string, unknown>();
  mocks.get.mockImplementation(async (k: string) => stored.get(k) ?? null);
  mocks.put.mockImplementation(async (k: string, v: string) => {
    try {
      stored.set(k, JSON.parse(v));
    } catch {
      stored.set(k, v);
    }
  });
  mocks.connection.mockResolvedValue(null);
  await ConversionMonitor.run(new Date("2026-10-20T08:23:00Z"));
  expect(mocks.notify).toHaveBeenCalledTimes(11);
  const firstId = mocks.notify.mock.calls[0][0].id;
  mocks.connection.mockImplementation(async (id: string) => ({
    propertyId:
      "properties/" + targets.find((t) => t.projectId === id)!.propertyId,
    propertyTimeZone: "Europe/Berlin",
    connectedByUserId: "owner",
    ga4AccountId: "account",
  }));
  await ConversionMonitor.run(new Date("2026-10-21T08:23:00Z"));
  expect(mocks.notify).toHaveBeenCalledTimes(11);
  mocks.connection.mockResolvedValue(null);
  await ConversionMonitor.run(new Date("2026-10-22T08:23:00Z"));
  expect(mocks.notify).toHaveBeenCalledTimes(22);
  expect(mocks.notify.mock.calls[11][0].id).not.toBe(firstId);
});

test("bootstrap test sends no conversion counts and is skipped after provider acceptance", async () => {
  expect(await ConversionMonitor.testAlerts()).toBe("accepted");
  expect(mocks.notify.mock.calls[0][0]).toMatchObject({
    setup: true,
    totals: {},
    issues: [],
  });
  expect(mocks.put).toHaveBeenCalledWith(
    "conversion-monitor:setup-test:v1",
    "accepted",
  );
  mocks.get.mockResolvedValue("accepted");
  await ConversionMonitor.testAlerts();
  expect(mocks.notify).toHaveBeenCalledTimes(1);
});
