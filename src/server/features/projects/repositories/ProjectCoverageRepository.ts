import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  projects,
  gscConnections,
  ga4Connections,
  audits,
  backlinkSnapshots,
} from "@/db/schema";

async function listForOrganization(organizationId: string) {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      domain: projects.domain,
      gscProperty: gscConnections.siteUrl,
      ga4Property: ga4Connections.propertyId,
      auditStatus: sql<
        string | null
      >`(select ${audits.status} from ${audits} where ${audits.projectId} = ${projects.id} order by ${audits.startedAt} desc, ${audits.id} desc limit 1)`,
      auditCheckedAt: sql<
        string | null
      >`(select max(${audits.startedAt}) from ${audits} where ${audits.projectId} = ${projects.id})`,
      backlinkCapturedAt: sql<
        string | null
      >`(select max(${backlinkSnapshots.capturedAt}) from ${backlinkSnapshots} where ${backlinkSnapshots.projectId} = ${projects.id} and ${backlinkSnapshots.domain} = ${projects.domain})`,
    })
    .from(projects)
    .leftJoin(
      gscConnections,
      and(
        eq(gscConnections.projectId, projects.id),
        eq(gscConnections.organizationId, projects.organizationId),
      ),
    )
    .leftJoin(
      ga4Connections,
      and(
        eq(ga4Connections.projectId, projects.id),
        eq(ga4Connections.organizationId, projects.organizationId),
      ),
    )
    .where(
      and(
        eq(projects.organizationId, organizationId),
        isNull(projects.archivedAt),
      ),
    )
    .orderBy(desc(projects.createdAt), desc(projects.id));
}

export const ProjectCoverageRepository = { listForOrganization };
