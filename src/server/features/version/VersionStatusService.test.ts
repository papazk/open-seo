import { beforeEach, expect, it, vi } from "vitest";
import { VersionStatusService } from "./VersionStatusService";

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("cloudflare:workers", () => ({ env: { KV: mocks } }));
vi.mock("@/lib/build-info", () => ({
  buildInfo: {
    appVersion: "0.1.11",
    forkSha: "1111111111111111111111111111111111111111",
    upstreamBaselineSha: "deb44913c2e345ec29ce6fb066a94ca428ebc681",
    upstreamTag: "v0.1.11",
    deployedAt: "2026-10-07T12:00:00.000Z",
  },
}));

beforeEach(() => {
  mocks.get.mockResolvedValue(null);
  mocks.put.mockResolvedValue(undefined);
});

it("compares stable releases numerically instead of treating 0.1.9 as newer than 0.1.11", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      Response.json({ tag_name: "v0.1.9", draft: false, prerelease: false }),
    );
  const status = await VersionStatusService.getStatus();
  expect(status.status).toBe("diverged");
  expect(status.latestTag).toBe("v0.1.9");
  expect(fetcher.mock.calls[0][0]).toBe(
    "https://api.github.com/repos/every-app/open-seo/releases/latest",
  );
});

it("reports a stable update and persists the check timestamp", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({ tag_name: "v0.1.12", draft: false, prerelease: false }),
  );
  const result = await VersionStatusService.getStatus();
  expect(result.status).toBe("update_available");
  expect(result.checkedAt).toEqual(expect.any(String));
  expect(mocks.put).toHaveBeenCalledWith(
    expect.any(String),
    expect.any(String),
    { expirationTtl: 86400 },
  );
});

it("uses the cached release across builds but compares it to the running baseline", async () => {
  mocks.get.mockResolvedValue({
    latestTag: "v0.1.11",
    checkedAt: "2026-10-07T10:00:00.000Z",
  });
  const fetcher = vi.spyOn(globalThis, "fetch");
  const result = await VersionStatusService.getStatus();
  expect(result.status).toBe("current");
  expect(result.checkedAt).toBe("2026-10-07T10:00:00.000Z");
  expect(fetcher).not.toHaveBeenCalled();
});

it("does not call a rate-limit failure current or cache it for a full day", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("rate limited", { status: 403 }),
  );
  expect((await VersionStatusService.getStatus()).status).toBe("check_failed");
  expect(mocks.put).not.toHaveBeenCalled();
});

it("rejects malformed or prerelease tags instead of advertising them as stable updates", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({ tag_name: "v9.0.0-rc.1", draft: false, prerelease: true }),
  );
  expect((await VersionStatusService.getStatus()).status).toBe("check_failed");
});

it("ignores malformed cached values and recovers with a stable release check", async () => {
  mocks.get.mockResolvedValue({ latestTag: "broken", checkedAt: "not a date" });
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({ tag_name: "v0.1.11", draft: false, prerelease: false }),
  );
  expect((await VersionStatusService.getStatus()).status).toBe("current");
});
