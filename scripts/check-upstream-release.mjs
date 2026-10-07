import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const baseline = JSON.parse(
  readFileSync(
    new URL("../deploy/upstream-baseline.json", import.meta.url),
    "utf8",
  ),
);

export async function checkUpstreamRelease({
  repository,
  token,
  fetcher = fetch,
}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "") || !token)
    throw new Error("Repository and token required");
  const request = async (path, options = {}) => {
    const response = await fetcher(`https://api.github.com/${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "OpenSEO-upstream-review",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new Error(`GitHub request failed (${response.status})`);
    return response.json();
  };
  const release = await request("repos/every-app/open-seo/releases/latest");
  if (
    !/^v\d+\.\d+\.\d+$/.test(release.tag_name ?? "") ||
    release.draft !== false ||
    release.prerelease !== false
  )
    throw new Error("Invalid stable release");
  const latest = release.tag_name.slice(1).split(".").map(Number);
  const current = baseline.tag.slice(1).split(".").map(Number);
  const difference =
    latest.map((value, i) => value - current[i]).find((value) => value !== 0) ??
    0;
  if (difference <= 0) return "current";
  const marker = `<!-- openseo-upstream:${release.tag_name} -->`;
  // Include closed issues, so deliberately skipped releases stay reviewed.
  for (let page = 1; ; page++) {
    const issues = await request(
      `repos/${repository}/issues?state=all&per_page=100&page=${page}`,
    );
    if (!Array.isArray(issues))
      throw new Error("Invalid GitHub issue response");
    if (issues.some((issue) => issue.body?.includes(marker)))
      return "already_reviewed";
    if (issues.length < 100) break;
    if (page >= 20) throw new Error("Could not safely finish duplicate check");
  }
  await request(`repos/${repository}/issues`, {
    method: "POST",
    body: JSON.stringify({
      title: `Review OpenSEO upstream ${release.tag_name}`,
      body: `${marker}\nA newer stable OpenSEO release is available.\n\n[Release notes](https://github.com/every-app/open-seo/releases/tag/${release.tag_name}) · [Source comparison](https://github.com/every-app/open-seo/compare/${baseline.tag}...${release.tag_name})\n\nBaseline: ${baseline.tag} (${baseline.sha}).\n\nReview migrations and security changes, preserve custom hosts and Google callback URLs, take a private database backup, validate in staging, and prepare a reviewed pull request. This workflow never merges or deploys updates.`,
    }),
  });
  return "created";
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  try {
    console.log(
      await checkUpstreamRelease({
        repository: process.env.GITHUB_REPOSITORY,
        token: process.env.GITHUB_TOKEN,
      }),
    );
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Release check failed",
    );
    process.exitCode = 1;
  }
}
