import { execFileSync } from "node:child_process";
import { version } from "../package.json";
import baseline from "../deploy/upstream-baseline.json";
import type { BuildInfo } from "../src/lib/build-info";

export function getBuildInfo(): BuildInfo {
  let forkSha: string | null = null;
  try {
    forkSha = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const changes = execFileSync("git", ["status", "--porcelain"], {
      encoding: "utf8",
    }).trim();
    if (changes || !/^[a-f0-9]{40}$/.test(forkSha)) forkSha = null;
  } catch {
    // Source archives have no Git checkout; never invent a deployed revision.
    forkSha = null;
  }
  return {
    appVersion: version,
    forkSha,
    upstreamBaselineSha: baseline.sha,
    upstreamTag: baseline.tag,
    deployedAt: new Date().toISOString(),
  };
}
