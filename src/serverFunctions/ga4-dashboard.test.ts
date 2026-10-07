import { beforeEach, expect, it, vi } from "vitest";
import { getGa4DashboardReport } from "./ga4";
const state = vi.hoisted(() => ({
  domain: null as string | null,
  limited: false,
  overview: vi.fn(),
  record: vi.fn(),
}));
vi.mock("cloudflare:workers", () => ({ env: {}, waitUntil: () => undefined }));
vi.mock("@/serverFunctions/middleware", () => ({
  requireProjectContext: [],
  requireAuthenticatedContext: [],
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      validator: () => builder,
      handler:
        (
          fn: (input: {
            data: { days: 28 };
            context: { projectId: string; project: { domain: string | null } };
          }) => unknown,
        ) =>
        () =>
          fn({
            data: { days: 28 },
            context: { projectId: "p1", project: { domain: state.domain } },
          }),
    };
    return builder;
  },
}));
vi.mock("@/server/features/ga4/services/Ga4OrganicOverviewService", () => ({
  Ga4OrganicOverviewService: { getOrganicOverview: state.overview },
}));
vi.mock("@/server/features/ga4/services/Ga4Service", () => ({
  Ga4Service: { getConnection: async () => null },
}));
vi.mock("@/server/features/google/IntegrationHealthService", () => ({
  IntegrationHealthService: { record: state.record },
}));
vi.mock("@/server/features/google/googleOAuth", () => ({
  GA4_INTEGRATION: {},
  createGoogleAuthorizationUrl: vi.fn(),
}));
vi.mock("@/server/auth/org-gate", () => ({ requireOrgPermission: vi.fn() }));
vi.mock("@/server/lib/posthog", () => ({ captureServerEvent: vi.fn() }));

beforeEach(() => {
  state.domain = null;
  state.limited = false;
  state.record.mockResolvedValue(undefined);
  state.overview.mockResolvedValue({
    source: { propertyId: "properties/1" },
    current: null,
    previous: null,
    trend: [],
    request: {
      resolvedDateRange: { startDate: "2026-09-01", endDate: "2026-09-28" },
    },
    reportMetadata: { hasLimitedData: true },
  });
});

it.each([null, "invalid", "https://user:password@example.com"])(
  "requires a project domain instead of fetching a property-wide report for %s",
  async (domain) => {
    state.domain = domain;
    expect(
      await getGa4DashboardReport({ data: { projectId: "p1" } }),
    ).toMatchObject({ connected: true, domainRequired: true });
    expect(state.overview).not.toHaveBeenCalled();
    expect(state.record).not.toHaveBeenCalled();
  },
);

it("preserves limited availability instead of recording an empty limited response as no data", async () => {
  state.domain = "example.com";
  await getGa4DashboardReport({ data: { projectId: "p1" } });
  expect(state.record).toHaveBeenCalledWith(
    "p1",
    "ga4",
    "properties/1",
    "limited",
  );
});
