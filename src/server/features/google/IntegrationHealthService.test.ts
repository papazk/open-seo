import { beforeEach, expect, it, vi } from "vitest";
import { IntegrationHealthService } from "./IntegrationHealthService";
const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("cloudflare:workers", () => ({ env: { KV: mocks } }));
beforeEach(() => {
  mocks.get.mockResolvedValue(null);
});

it("never calls a saved mapping healthy before a real report check", async () => {
  expect(
    await IntegrationHealthService.get("p1", "ga4", "properties/123"),
  ).toEqual({ state: "unchecked", checkedAt: null });
});
it("ignores health cached for a different property", async () => {
  mocks.get.mockResolvedValue({
    property: "properties/999",
    state: "healthy",
    checkedAt: new Date().toISOString(),
  });
  expect(
    (await IntegrationHealthService.get("p1", "ga4", "properties/123")).state,
  ).toBe("unchecked");
});
it("does not call an old successful report healthy", async () => {
  mocks.get.mockResolvedValue({
    property: "properties/123",
    state: "healthy",
    checkedAt: "2020-01-01T00:00:00.000Z",
  });
  expect(
    (await IntegrationHealthService.get("p1", "ga4", "properties/123")).state,
  ).toBe("stale");
});
it("preserves actionable reconnect status with a verified timestamp", async () => {
  const checkedAt = new Date().toISOString();
  mocks.get.mockResolvedValue({
    property: "properties/123",
    state: "reconnect_required",
    checkedAt,
  });
  expect(
    await IntegrationHealthService.get("p1", "ga4", "properties/123"),
  ).toEqual({ state: "reconnect_required", checkedAt });
});
it("tolerates KV outages instead of breaking portfolio navigation", async () => {
  mocks.get.mockRejectedValue(new Error("offline"));
  expect(
    (await IntegrationHealthService.get("p1", "ga4", "properties/123")).state,
  ).toBe("unchecked");
});
