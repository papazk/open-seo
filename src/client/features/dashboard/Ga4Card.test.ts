import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { Ga4Card } from "./Ga4Card";

const state = vi.hoisted(() => ({ sessions: 0, limited: true }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      connected: true,
      hasLimitedData: state.limited,
      totals: {
        sessions: state.sessions,
        activeUsers: state.sessions,
        engagementRate: 0.5,
        keyEvents: state.sessions,
      },
      prevTotals: {
        sessions: 10,
        activeUsers: 10,
        engagementRate: 0.5,
        keyEvents: 10,
      },
      trend: [],
    },
  }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) =>
    createElement("a", null, children),
}));
vi.mock("@/serverFunctions/ga4", () => ({ getGa4DashboardReport: vi.fn() }));
vi.mock("./Ga4ConnectCard", () => ({ Ga4ConnectCard: () => null }));
beforeEach(() => {
  state.sessions = 0;
  state.limited = true;
});

it("does not declare zero traffic from a limited empty report", () => {
  const html = renderToStaticMarkup(
    createElement(Ga4Card, { projectId: "p1", connected: true }),
  );
  expect(html).toContain("Google applied reporting limits");
  expect(html).not.toContain("No organic search traffic recorded");
});

it("omits percentage comparisons when Google limits either period", () => {
  state.sessions = 100;
  const html = renderToStaticMarkup(
    createElement(Ga4Card, { projectId: "p1", connected: true }),
  );
  expect(html).not.toContain("900%");
  expect(html).toContain("Google applied reporting limits");
});
