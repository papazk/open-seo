import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CardShell } from "@/client/components/CardShell";
import { Button } from "@/client/components/ui/button";
import {
  getDashboardMeasurement,
  getDashboardOpportunities,
} from "@/serverFunctions/dashboardInsights";
import type { DashboardDays } from "@/shared/dashboard-period";

export function DashboardInsights({
  projectId,
  days,
  gscConnected,
}: {
  projectId: string;
  days: DashboardDays;
  gscConnected: boolean;
}) {
  const [measurementEnabled, setMeasurementEnabled] = useState(false);
  const [opportunitiesEnabled, setOpportunitiesEnabled] = useState(false);
  const measurement = useQuery({
    queryKey: ["dashboardMeasurement", projectId],
    queryFn: () => getDashboardMeasurement({ data: { projectId, days } }),
    enabled: measurementEnabled,
    staleTime: 3600000,
    retry: false,
  });
  const opportunities = useQuery({
    queryKey: ["dashboardOpportunities", projectId, days],
    queryFn: () => getDashboardOpportunities({ data: { projectId, days } }),
    enabled: opportunitiesEnabled && gscConnected,
    staleTime: 3600000,
    retry: false,
  });
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <CardShell
        title="Measurement health"
        stamp="Google Analytics configuration"
      >
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Check the domain’s web stream and configured key events before
            judging conversions.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={measurement.isFetching}
            onClick={() => {
              setMeasurementEnabled(true);
              if (measurementEnabled) void measurement.refetch();
            }}
          >
            {measurement.isFetching
              ? "Checking…"
              : measurementEnabled
                ? "Check again"
                : "Check measurement"}
          </Button>
          {measurement.isError ? (
            <p role="alert">
              Measurement could not be checked. Verify Analytics access and the
              Admin API, then retry.
            </p>
          ) : null}
          {measurement.data ? (
            <div className="space-y-2" aria-live="polite">
              <p>
                {measurement.data.matchingStreams
                  ? `${measurement.data.matchingStreams} matching web stream${measurement.data.matchingStreams > 1 ? "s" : ""}`
                  : "No web stream matches this domain. Check the selected property."}
              </p>
              <p>
                {measurement.data.keyEvents.length
                  ? `Configured key events: ${measurement.data.keyEvents.join(", ")}`
                  : "No key events configured. Define the lead or purchase events that matter for this site in Analytics."}
              </p>
              {measurement.data.issues.includes(
                "enhanced_measurement_disabled",
              ) ? (
                <p className="text-muted-foreground">
                  Enhanced measurement is disabled.
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Checked{" "}
                {measurement.data.checkedAt.slice(0, 16).replace("T", " ")} UTC.
                Configuration alone does not confirm the website is sending
                events.
              </p>
            </div>
          ) : null}
        </div>
      </CardShell>
      <CardShell
        title="Search opportunities"
        stamp={`Search Console + Analytics · ${days} days`}
      >
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Find pages near the first page of search results and compare their
            measured business value.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={!gscConnected || opportunities.isFetching}
            onClick={() => {
              setOpportunitiesEnabled(true);
              if (opportunitiesEnabled) void opportunities.refetch();
            }}
          >
            {opportunities.isFetching
              ? "Finding pages…"
              : opportunitiesEnabled
                ? "Refresh opportunities"
                : "Find opportunities"}
          </Button>
          {!gscConnected ? (
            <p>Connect Search Console to combine both sources.</p>
          ) : null}
          {opportunities.isError ? (
            <p role="alert">
              Could not compare the sources. Check both integrations and try
              again.
            </p>
          ) : null}
          {opportunities.data ? (
            <div className="space-y-3" aria-live="polite">
              {opportunities.data.rows.length ? (
                <ul className="divide-y divide-border">
                  {opportunities.data.rows.map((row) => (
                    <li key={row.page} className="space-y-1 py-2">
                      <a
                        href={row.page}
                        target="_blank"
                        rel="noreferrer"
                        className="block break-all underline underline-offset-4"
                      >
                        {row.page}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {row.impressions.toLocaleString()} impressions ·
                        position {row.position.toFixed(1)} ·{" "}
                        {row.keyEvents === null
                          ? "Analytics page not matched"
                          : `${row.keyEvents.toLocaleString()} key events`}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  No matching pages in the opportunity range for this domain and
                  period.
                </p>
              )}
              {opportunities.data.engagementFallback ? (
                <p className="text-xs text-muted-foreground">
                  Ranking uses engagement because meaningful key-event data is
                  missing.
                </p>
              ) : null}
              {opportunities.data.limited ? (
                <p className="text-xs text-muted-foreground">
                  Google limited the source data; treat these opportunities as
                  provisional.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardShell>
    </div>
  );
}
