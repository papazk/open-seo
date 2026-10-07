import { beforeEach, expect, it, vi } from "vitest";
import { checkUpstreamRelease } from "./check-upstream-release.mjs";

const fetcher = vi.fn<typeof fetch>();
beforeEach(() => fetcher.mockReset());
const input = { repository: "owner/fork", token: "test-token", fetcher };

it("creates one review issue for a newer stable release", async () => {
  fetcher
    .mockResolvedValueOnce(
      Response.json({ tag_name: "v0.1.12", draft: false, prerelease: false }),
    )
    .mockResolvedValueOnce(Response.json([]))
    .mockResolvedValueOnce(
      Response.json(
        { html_url: "https://github.com/owner/fork/issues/1" },
        { status: 201 },
      ),
    );
  expect(await checkUpstreamRelease(input)).toBe("created");
  const body = JSON.parse(String(fetcher.mock.calls[2][1]?.body));
  expect(body.title).toBe("Review OpenSEO upstream v0.1.12");
  expect(body.body).toContain(
    "https://github.com/every-app/open-seo/compare/v0.1.11...v0.1.12",
  );
});

it("does not duplicate a previously reviewed release even if its issue is closed", async () => {
  fetcher
    .mockResolvedValueOnce(
      Response.json({ tag_name: "v0.1.12", draft: false, prerelease: false }),
    )
    .mockResolvedValueOnce(
      Response.json([
        { body: "<!-- openseo-upstream:v0.1.12 -->", state: "closed" },
      ]),
    );
  expect(await checkUpstreamRelease(input)).toBe("already_reviewed");
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("does not advertise a prerelease as a stable upgrade", async () => {
  fetcher.mockResolvedValueOnce(
    Response.json({ tag_name: "v0.1.12-rc.1", draft: false, prerelease: true }),
  );
  await expect(checkUpstreamRelease(input)).rejects.toThrow(
    "Invalid stable release",
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("treats an older numeric tag as current rather than opening an upgrade issue", async () => {
  fetcher.mockResolvedValueOnce(
    Response.json({ tag_name: "v0.1.9", draft: false, prerelease: false }),
  );
  expect(await checkUpstreamRelease(input)).toBe("current");
});

it("fails visibly when GitHub refuses the issue instead of claiming it was created", async () => {
  fetcher
    .mockResolvedValueOnce(
      Response.json({ tag_name: "v0.1.12", draft: false, prerelease: false }),
    )
    .mockResolvedValueOnce(Response.json([]))
    .mockResolvedValueOnce(new Response("denied", { status: 403 }));
  await expect(checkUpstreamRelease(input)).rejects.toThrow(
    "GitHub request failed (403)",
  );
});
