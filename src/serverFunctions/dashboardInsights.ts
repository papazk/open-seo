import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProjectContext } from "./middleware";
import { Ga4MeasurementHealthService } from "@/server/features/ga4/services/Ga4MeasurementHealthService";
import { SearchOpportunityService } from "@/server/features/ga4/services/SearchOpportunityService";
import { dashboardPeriod } from "@/shared/dashboard-period";
import { domainHost, matchingWebStreams } from "@/shared/domain-host";

const inputSchema = z.object({
  projectId: z.string().min(1),
  days: z.union([z.literal(7), z.literal(28), z.literal(90)]).default(28),
});

export const getDashboardMeasurement = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(inputSchema)
  .handler(async ({ context }) => {
    const health = await Ga4MeasurementHealthService.getMeasurementHealth(
      context.projectId,
    );
    const streams = context.project.domain
      ? matchingWebStreams(
          context.project.domain,
          health.webStreams.map((stream) => ({
            ...stream,
            type: "WEB_DATA_STREAM",
            webStreamData: { defaultUri: stream.defaultUri ?? undefined },
          })),
        )
      : [];
    return {
      matchingStreams: streams.length,
      keyEvents: health.keyEvents.map((event) => event.eventName),
      issues: health.issues,
      checkedAt: new Date().toISOString(),
    };
  });

export const getDashboardOpportunities = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(inputSchema)
  .handler(async ({ data, context }) => {
    const result = await SearchOpportunityService.getOpportunities({
      projectId: context.projectId,
      ...dashboardPeriod(data.days),
      limit: 100,
    });
    const host = context.project.domain
      ? domainHost(context.project.domain)
      : null;
    return {
      rows: result.rows
        .filter((row) => host && domainHost(row.page) === host)
        .slice(0, 5)
        .map((row) => ({
          page: row.page,
          impressions: row.impressions,
          position: row.position,
          keyEvents: row.ga4?.keyEvents ?? null,
          joinStatus: row.joinStatus,
          score: row.score,
        })),
      limited: result.scoring.scoreDataLimited,
      engagementFallback: result.scoring.engagementFallback,
    };
  });
