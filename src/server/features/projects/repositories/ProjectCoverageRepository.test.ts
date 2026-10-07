import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { ProjectCoverageRepository } from "./ProjectCoverageRepository";

const state = vi.hoisted(() => {
  const value: { db?: ReturnType<typeof drizzle> } = {};
  return value;
});
vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/db", () => ({
  get db() {
    if (!state.db) throw new Error("Test database not initialized");
    return state.db;
  },
}));
const client = createClient({ url: ":memory:" });
beforeAll(async () => {
  state.db = drizzle(client);
  await client.executeMultiple(`
    CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT, domain TEXT, organization_id TEXT, archived_at TEXT, created_at TEXT);
    CREATE TABLE gsc_connections (project_id TEXT, organization_id TEXT, site_url TEXT);
    CREATE TABLE ga4_connections (project_id TEXT, organization_id TEXT, property_id TEXT);
    CREATE TABLE audits (id TEXT, project_id TEXT, status TEXT, started_at TEXT);
    CREATE TABLE backlink_snapshots (project_id TEXT, domain TEXT, captured_at TEXT);
    INSERT INTO projects VALUES ('p1','A','a.test','org1',NULL,'2026-10-01'), ('p2','B','b.test','org2',NULL,'2026-10-02'), ('p3','Archived','c.test','org1','2026-10-03','2026-10-01'), ('p4','New',NULL,'org1',NULL,'2026-10-02');
    INSERT INTO gsc_connections VALUES ('p1','org1','sc-domain:a.test'), ('p4','org2','sc-domain:private.test');
    INSERT INTO ga4_connections VALUES ('p1','org1','properties/123');
    INSERT INTO audits VALUES ('a1','p1','completed','2026-10-01'), ('a2','p1','failed','2026-10-02'), ('a3','p2','running','2026-10-03');
    INSERT INTO backlink_snapshots VALUES ('p1','old.test','2026-10-03'), ('p1','a.test','2026-10-02');
  `);
});
afterAll(() => client.close());

it("limits coverage to active projects in the current organization and preserves projects without integrations", async () => {
  expect(await ProjectCoverageRepository.listForOrganization("org1")).toEqual([
    {
      id: "p4",
      name: "New",
      domain: null,
      gscProperty: null,
      ga4Property: null,
      auditStatus: null,
      auditCheckedAt: null,
      backlinkCapturedAt: null,
    },
    {
      id: "p1",
      name: "A",
      domain: "a.test",
      gscProperty: "sc-domain:a.test",
      ga4Property: "properties/123",
      auditStatus: "failed",
      auditCheckedAt: "2026-10-02",
      backlinkCapturedAt: "2026-10-02",
    },
  ]);
});

it("does not expose another organization's selected properties through a malformed join", async () => {
  const rows = await ProjectCoverageRepository.listForOrganization("org2");
  expect(rows).toEqual([
    {
      id: "p2",
      name: "B",
      domain: "b.test",
      gscProperty: null,
      ga4Property: null,
      auditStatus: "running",
      auditCheckedAt: "2026-10-03",
      backlinkCapturedAt: null,
    },
  ]);
});
