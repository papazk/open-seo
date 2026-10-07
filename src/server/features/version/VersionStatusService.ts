import { env } from "cloudflare:workers";
import { z } from "zod";
import { buildInfo } from "@/lib/build-info";

const stableTag = z.string().regex(/^v\d+\.\d+\.\d+$/);
const cachedRelease = z.object({
  latestTag: stableTag,
  checkedAt: z.iso.datetime(),
});
const release = z.object({
  tag_name: stableTag,
  draft: z.literal(false),
  prerelease: z.literal(false),
});
const CACHE_KEY = "upstream:every-app/open-seo:latest-stable:v1";

type VersionStatus = {
  build: typeof buildInfo;
  latestTag: string | null;
  checkedAt: string | null;
  status:
    | "current"
    | "update_available"
    | "diverged"
    | "unknown"
    | "check_failed";
};

function compareTags(left: string, right: string): number {
  const a = left.slice(1).split(".").map(Number);
  const b = right.slice(1).split(".").map(Number);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}

async function getStatus(): Promise<VersionStatus> {
  const base = { build: buildInfo, latestTag: null, checkedAt: null };
  try {
    let cached: z.infer<typeof cachedRelease> | null = null;
    try {
      const result = cachedRelease.safeParse(
        await env.KV.get(CACHE_KEY, "json"),
      );
      if (result.success) cached = result.data;
    } catch {
      // A KV outage must not turn a known build version into a broken page.
    }
    if (!cached) {
      const response = await fetch(
        "https://api.github.com/repos/every-app/open-seo/releases/latest",
        {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "OpenSEO-selfhost-version-check",
          },
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!response.ok) throw new Error("Upstream release check failed");
      const latest = release.parse(await response.json());
      cached = {
        latestTag: latest.tag_name,
        checkedAt: new Date().toISOString(),
      };
      try {
        await env.KV.put(CACHE_KEY, JSON.stringify(cached), {
          expirationTtl: 86400,
        });
      } catch {
        // Still return this successful check when cache persistence fails.
      }
    }
    const baseline = stableTag.safeParse(buildInfo.upstreamTag);
    if (
      !baseline.success ||
      !buildInfo.upstreamBaselineSha ||
      !buildInfo.forkSha
    ) {
      return { ...base, ...cached, status: "unknown" };
    }
    const comparison = compareTags(cached.latestTag, baseline.data);
    return {
      ...base,
      ...cached,
      status:
        comparison > 0
          ? "update_available"
          : comparison < 0
            ? "diverged"
            : "current",
    };
  } catch {
    return { ...base, status: "check_failed" };
  }
}

export const VersionStatusService = { getStatus };
