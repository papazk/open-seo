import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { SectionHeader } from "@/client/components/PageHeader";
import { buildInfo } from "@/lib/build-info";
import { getVersionStatus } from "@/serverFunctions/version";

const statusLabels = {
  current: "Up to date with the latest stable release",
  update_available: "Stable update available",
  diverged: "Baseline is ahead of the latest published release",
  unknown: "Build revision unavailable",
  check_failed: "Could not check for updates",
};

export function VersionStatus({ compact = false }: { compact?: boolean }) {
  const query = useQuery({
    queryKey: ["versionStatus"],
    queryFn: () => getVersionStatus(),
    staleTime: 86400000,
    retry: false,
  });
  if (compact) {
    return (
      <p className="text-xs text-muted-foreground">
        <Link to="/settings" className="underline underline-offset-4">
          OpenSEO{" "}
          {buildInfo.appVersion
            ? `v${buildInfo.appVersion}`
            : "version unknown"}
        </Link>
        {query.data?.status === "update_available" ? " · Update available" : ""}
      </p>
    );
  }
  const data = query.data;
  return (
    <section className="space-y-3">
      <SectionHeader title="Version and updates" />
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt>Installed</dt>
        <dd>v{buildInfo.appVersion ?? "unknown"}</dd>
        <dt>Fork revision</dt>
        <dd className="break-all font-mono text-xs">
          {buildInfo.forkSha ?? "Unknown"}
        </dd>
        <dt>Original source</dt>
        <dd>
          <a
            className="underline underline-offset-4"
            href={`https://github.com/every-app/open-seo/releases/tag/${buildInfo.upstreamTag ?? ""}`}
            target="_blank"
            rel="noreferrer"
          >
            {buildInfo.upstreamTag ?? "Unknown"}
          </a>
        </dd>
        <dt>Source revision</dt>
        <dd className="break-all font-mono text-xs">
          {buildInfo.upstreamBaselineSha ?? "Unknown"}
        </dd>
        <dt>Built at</dt>
        <dd>
          {buildInfo.deployedAt
            ? `${buildInfo.deployedAt.slice(0, 16).replace("T", " ")} UTC`
            : "Unknown"}
        </dd>
      </dl>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {data
          ? statusLabels[data.status]
          : query.isError
            ? "Could not check for updates"
            : "Checking for stable updates…"}
        {data?.latestTag ? ` (${data.latestTag})` : ""}
      </p>
      {data?.checkedAt ? (
        <p className="text-xs text-muted-foreground">
          Checked {data.checkedAt.slice(0, 16).replace("T", " ")} UTC
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Updates are reviewed before deployment. Your domain configuration and
        integrations stay part of the fork.
      </p>
      {query.isError || data?.status === "check_failed" ? (
        <button
          type="button"
          className="text-sm underline underline-offset-4"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          {query.isFetching ? "Checking…" : "Retry update check"}
        </button>
      ) : null}
    </section>
  );
}
