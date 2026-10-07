import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Input } from "@/client/components/ui/input";
import { QueryState } from "@/client/components/QueryState";
import { getProjectCoverage } from "@/serverFunctions/projects";

const labels = {
  not_connected: "Not connected",
  unchecked: "Property saved · not checked",
  healthy: "Healthy",
  no_data: "Connected · no data",
  reconnect_required: "Reconnect required",
  error: "Check failed",
  stale: "Last check is stale",
};
const needsAttention = (state: string) =>
  state !== "healthy" && state !== "no_data";

export function ProjectCoverage({
  currentProjectId,
}: {
  currentProjectId: string | null;
}) {
  const [search, setSearch] = useState("");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const query = useQuery({
    queryKey: ["projects", "coverage"],
    queryFn: () => getProjectCoverage(),
    staleTime: 60000,
  });
  return (
    <section className="space-y-3" aria-label="Domain integration coverage">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          aria-label="Search projects or domains"
          placeholder="Search projects or domains"
          className="max-w-sm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={attentionOnly}
            onChange={(event) => setAttentionOnly(event.target.checked)}
          />
          Needs attention
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Status comes from the last dashboard report check. Saved properties are
        verified when you open their dashboard.
      </p>
      <QueryState
        query={query}
        errorFallback="Could not load integration coverage"
      >
        {(data) => {
          const rows = data.filter(
            (project) =>
              `${project.name} ${project.domain ?? ""}`
                .toLowerCase()
                .includes(search.trim().toLowerCase()) &&
              (!attentionOnly ||
                needsAttention(project.gsc.state) ||
                needsAttention(project.ga4.state)),
          );
          return rows.length ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th scope="col" className="p-3">
                      Domain
                    </th>
                    <th scope="col" className="p-3">
                      Search Console
                    </th>
                    <th scope="col" className="p-3">
                      Analytics
                    </th>
                    <th scope="col" className="p-3">
                      Site audit
                    </th>
                    <th scope="col" className="p-3">
                      Backlinks
                    </th>
                    <th scope="col" className="p-3">
                      Next action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((project) => (
                    <tr key={project.id}>
                      <th scope="row" className="p-3 font-normal">
                        <Link
                          to="/p/$projectId"
                          params={{ projectId: project.id }}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {project.name}
                        </Link>
                        {project.id === currentProjectId ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            Current
                          </span>
                        ) : null}
                        <div className="text-xs text-muted-foreground">
                          {project.domain ?? "No domain set"}
                        </div>
                      </th>
                      {[project.gsc, project.ga4].map((integration, index) => (
                        <td key={index} className="p-3 align-top">
                          <span
                            className={
                              integration.state === "reconnect_required" ||
                              integration.state === "error"
                                ? "text-destructive"
                                : ""
                            }
                          >
                            {labels[integration.state]}
                          </span>
                          <div className="mt-1 max-w-xs break-all text-xs text-muted-foreground">
                            {integration.property ?? "Choose a property"}
                          </div>
                          {integration.checkedAt ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Checked{" "}
                              {integration.checkedAt
                                .slice(0, 16)
                                .replace("T", " ")}{" "}
                              UTC
                            </div>
                          ) : null}
                        </td>
                      ))}
                      <td className="p-3 align-top">
                        <Link
                          to="/p/$projectId/audit"
                          params={{ projectId: project.id }}
                          className="underline underline-offset-4"
                        >
                          {project.audit.status ?? "Not run"}
                        </Link>
                        {project.audit.checkedAt ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {project.audit.checkedAt.slice(0, 10)}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3 align-top">
                        <Link
                          to="/p/$projectId/backlinks"
                          params={{ projectId: project.id }}
                          className="underline underline-offset-4"
                        >
                          {project.backlinks.capturedAt
                            ? Date.now() -
                                Date.parse(
                                  project.backlinks.capturedAt +
                                    (project.backlinks.capturedAt.endsWith("Z")
                                      ? ""
                                      : "Z"),
                                ) >
                              86400000
                              ? "Snapshot stale"
                              : "Snapshot saved"
                            : "No snapshot"}
                        </Link>
                        {project.backlinks.capturedAt ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {project.backlinks.capturedAt.slice(0, 10)}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3">
                        <Link
                          to={
                            project.gsc.state === "unchecked" ||
                            project.ga4.state === "unchecked" ||
                            project.gsc.state === "stale" ||
                            project.ga4.state === "stale"
                              ? "/p/$projectId"
                              : "/p/$projectId/settings/integrations"
                          }
                          params={{ projectId: project.id }}
                          className="whitespace-nowrap underline underline-offset-4"
                        >
                          {project.gsc.state === "unchecked" ||
                          project.ga4.state === "unchecked" ||
                          project.gsc.state === "stale" ||
                          project.ga4.state === "stale"
                            ? "Check dashboard"
                            : "Manage integrations"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">
              No projects match these filters.
            </p>
          );
        }}
      </QueryState>
    </section>
  );
}
