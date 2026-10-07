import { ProjectCoverageRepository } from "../repositories/ProjectCoverageRepository";
import { IntegrationHealthService } from "@/server/features/google/IntegrationHealthService";

async function getCoverage(organizationId: string) {
  const projects =
    await ProjectCoverageRepository.listForOrganization(organizationId);
  return Promise.all(
    projects.map(async (project) => {
      const status = async (
        provider: "gsc" | "ga4",
        property: string | null,
      ) =>
        property
          ? {
              property,
              ...(await IntegrationHealthService.get(
                project.id,
                provider,
                property,
              )),
            }
          : {
              property: null,
              state: "not_connected" as const,
              checkedAt: null,
            };
      const [gsc, ga4] = await Promise.all([
        status("gsc", project.gscProperty),
        status("ga4", project.ga4Property),
      ]);
      return {
        id: project.id,
        name: project.name,
        domain: project.domain,
        gsc,
        ga4,
        audit: {
          status: project.auditStatus,
          checkedAt: project.auditCheckedAt,
        },
        backlinks: { capturedAt: project.backlinkCapturedAt },
      };
    }),
  );
}

export const ProjectCoverageService = { getCoverage };
