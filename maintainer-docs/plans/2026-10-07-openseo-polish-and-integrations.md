# OpenSEO Polish and Google Integrations Plan

**Date:** 7 October 2026  
**Status:** Proposed roadmap; documentation only.  
**Goal:** Make the self-hosted OpenSEO installation a dependable multi-domain SEO workspace with visible source versions, reviewed upstream updates, and correctly scoped Search Console and GA4 data.

**Architecture:** Retain the upstream app and its existing Google OAuth, project mappings, reports, and services. Add a small portfolio overview and version-status feature using the established TanStack server function → service → repository pattern. Keep custom deployment changes separate and review updates before deployment.

**Stack:** TypeScript, React, TanStack Router/Query, Drizzle, Cloudflare Workers/D1/KV/R2, pnpm, Vitest and Playwright. Retain SQLite and Postgres compatibility.

## Evidence and scope

- Fork: [papazk/open-seo](https://github.com/papazk/open-seo).
- Original source: [every-app/open-seo](https://github.com/every-app/open-seo).
- Fork main inspected at `0ffff93101043aad7600a3b6a499a0cd2887ef49`; package version **0.1.9**.
- Upstream main inspected at `deb44913c2e345ec29ce6fb066a94ca428ebc681`; latest published release **v0.1.11**, 6 October 2026.
- The upstream head is **131 commits ahead** of that fork-main baseline. This is a source comparison, not evidence of what production currently runs.
- Existing branches `codex/openseo-custom-domain` and `codex/seo-google-public-pages` contain deployment and public information-page changes. Reconcile them with the deployment before updating.
- v0.1.11 adds AI visibility, JavaScript audit rendering, rank tracking shortcuts and fixes. Treat AI visibility as beta, as upstream does.
- Live inspection confirms per-project integration controls already exist. Connection labels alone do not prove every API grant is healthy or every site collects Analytics events.
- Detailed domain/account observations belong in a private local checklist, not this public repository.

This plan covers OpenSEO. Connecting another portfolio dashboard to the same projects is a later bridge, using stable project IDs and authorized server calls. Do not copy OAuth tokens into a second frontend.

## Recommended approach

**Extend the maintained fork** with a small custom layer. It keeps existing reports and receives upstream fixes with manageable review effort.

Alternatives: an external portfolio summary minimizes changes to OpenSEO but splits the workflow; a broad redesign offers more control but increases update conflicts. Start with the fork approach and reassess after the integration rollout.

## Global constraints

- Production access protection, OAuth encryption and existing project mappings must survive updates.
- Never commit Google secrets, tokens, account emails, private analytics exports or deployment environment files.
- Preserve project/organization authorization on reads, mappings and reports.
- Prefer existing Google integrations and reporting services; do not introduce a second OAuth implementation.
- Retain SQLite and Postgres schema compatibility for new persisted fields.
- Separate missing data, valid zero values, stale snapshots, loading, revoked grants and API errors.
- Show source, period and freshness for every metric. GSC clicks and GA4 sessions describe different measurements.
- Scope analytics to the mapped domain when a property includes multiple websites; property-wide totals must not be labelled as one site's data.
- Upstream checks may run automatically; merging and deployment require review.
- Changes to workflow/control-plane files need explicit maintainer review under repository guidance.

## Review focus

1. A grant is revoked after being connected: show reconnect and preserve existing mapping metadata.
2. A GA4 property contains several domains: prevent mixed-site totals and flag ambiguous mapping.
3. Google returns zero, withheld or incomplete data: preserve distinctions and suppress misleading percentage deltas.
4. Rapid project switching: query keys and responses must never display another project's reports.
5. An upstream update moves deployment files or adds database migrations: preserve custom settings and verify rollback with a database backup.

## Task 1 — Reconcile deployment and establish an update baseline

**Affected existing areas:** `docs/SELF_HOSTING_CLOUDFLARE.md`, `package.json`, deployment configuration, both custom branches. Upstream v0.1.11 relocates deployment files into `deploy/` and migrations into `drizzle/sqlite/` and `drizzle/pg/`; recheck paths on the selected release.

**Produces:** A recorded deployment baseline containing fork SHA, upstream baseline SHA/tag, Worker version, deployment date and required custom patches.

- [ ] Read the currently deployed Worker metadata and available release annotations; record unknowns explicitly.
- [ ] Compare both custom branches with main; identify which changes are actually deployed and required.
- [ ] Export a recoverable database backup and retain deployment configuration privately.
- [ ] Review v0.1.10/v0.1.11 changes, including migrations, renamed deployment paths, Access behavior and audit rendering prerequisites.
- [ ] Prepare an update branch from the real deployment baseline, incorporating the selected stable upstream release and retained patches.
- [ ] On that branch run the repository's current `pnpm build`, `pnpm test:ci` and applicable CI checks. Verify the existing Google integration and project tests.
- [ ] Validate a staging deployment: Access sign-in, Google callbacks, project switching, existing GSC reports, audit worker bindings and migrations.
- [ ] Record the recovery procedure. A Worker code rollback does not undo database migrations; restore or forward-repair must be verified separately.
- [ ] Submit the update for review before production deployment.

**Done when:** The deployment can be traced to a GitHub commit and upstream baseline, and existing functionality survives a tested update.

## Task 2 — Show GitHub and upstream versions

**Proposed new files:** `src/client/features/version/VersionStatusCard.tsx`, `src/server/features/version/VersionStatusService.ts`, `src/serverFunctions/version.ts`, service tests, a build-metadata generator in `scripts/`. Integrate into the existing Settings screen and dashboard footer.

**Interface:** `getVersionStatus()` returns `installed: { appVersion, forkSha, upstreamBaselineSha, upstreamTag, deployedAt }`, `upstream: { releaseTag, releaseUrl, commitSha, checkedAt } | null`, and `status: "current" | "update_available" | "diverged" | "unknown" | "check_failed"`.

- [ ] Inject immutable build metadata during deployment. Show “Unknown” for unrecorded historical deployment values.
- [ ] Fetch releases and commit comparisons from the fixed original-source repository on the server; cache results for 24 hours in existing KV.
- [ ] Show “Installed”, “Original source”, “Last checked”, “View changes” and “Check now”. Place technical details in Settings.
- [ ] Compare the recorded upstream baseline with the selected release; local custom commits alone must not imply an available update.
- [ ] On API failures retain the last successful result and show its age.
- [ ] Test divergence, absent build metadata, GitHub rate limiting and malformed responses.

**Done when:** The user can identify exactly what is installed and inspect relevant upstream changes without deploying them.

## Task 3 — Define periodic upstream review

**Proposed maintenance files:** a versioned update-review checklist and, after maintainer review, `.github/workflows/check-upstream.yml`.

**Consumes:** Task 1 baseline; Task 2 version fields.  
**Produces:** One deduplicated review item per newly detected stable release.

- [ ] Run a weekly check, Monday 08:00 UTC, plus a manual trigger.
- [ ] Prefer published stable releases; report newer main commits separately without treating them as releases.
- [ ] Create or update one tracking issue for an available release; remain quiet when unchanged.
- [ ] Include release notes, compare link, migrations and possible conflicts with custom deployment patches.
- [ ] Reuse the Task 1 staging and recovery gates for every proposed upgrade.
- [ ] Test duplicate prevention and GitHub API failure handling; review workflow permissions before enabling it.

**Done when:** New releases produce an actionable review item while unchanged checks stay quiet. No scheduler is enabled by this documentation change.

## Task 4 — Complete GSC and GA4 mapping for every domain

**Reuse:** `src/client/features/integrations/GooglePropertyPicker.tsx`, `src/client/features/gsc/SearchConsoleConnectionCard.tsx`, `src/client/features/ga4/GoogleAnalyticsConnectionCard.tsx`, existing GSC/GA4 services and repositories, `src/server/features/ga4/services/Ga4MeasurementHealthService.ts`.

**Produces:** A private coverage matrix: project ID, domain, canonical URL, GSC property, GA4 property, web stream/measurement ID, relevant hostname, timezone, connection health, last successful report, next action.

- [ ] Validate existing GSC mappings with a read-only report request. Preserve valid connections and URL-prefix mappings.
- [ ] Reuse the configured Google OAuth client; verify Search Console API, Analytics Admin API and Analytics Data API.
- [ ] Register both exact origin-specific callbacks: `/api/gsc/oauth/callback` and `/api/ga4/oauth/callback`. Add custom-domain callbacks only if that origin will run the flow.
- [ ] Preserve existing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `BETTER_AUTH_SECRET`. Changing the encryption key can invalidate stored grants.
- [ ] Obtain read-only Analytics consent for the accounts holding the properties; review the exact requested access at the consent step.
- [ ] Discover accessible GA4 properties and web streams. Match domains against stream URLs, not property display names alone.
- [ ] Present mapping suggestions for review; flag missing properties, redirects, aliases, shared properties and ambiguous matches. Never assign an arbitrary property.
- [ ] Save mappings through existing validated project server functions.
- [ ] Check measurement health and a real report for each mapped project. A saved connection without events is “Connected, no data”.
- [ ] For missing GA4 properties/tags, track site measurement setup as a separate rollout task. Connecting OpenSEO cannot create historical analytics.
- [ ] Test revoked grants, inaccessible properties, prefix/domain differences, multi-host properties and cross-project isolation.

**Done when:** Every domain is either verified connected with correctly scoped reports or has a specific recorded action. Sites without measurement are visibly identified.

Reference: [OpenSEO GA4 setup](https://github.com/papazk/open-seo/blob/main/docs/SELF_HOSTING_GOOGLE_ANALYTICS.md), [GSC setup](https://github.com/papazk/open-seo/blob/main/docs/SELF_HOSTING_GOOGLE_SEARCH_CONSOLE.md), [Google OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server).

## Task 5 — Add a useful portfolio overview

**Reuse/modify:** `src/routes/_app/projects.tsx`, project services/repositories and existing GSC/GA4 mappings.  
**Proposed files:** `src/client/features/projects/ProjectCoverageTable.tsx`, `src/server/features/projects/services/ProjectCoverageService.ts`, `src/serverFunctions/projectCoverage.ts`.

**Interface:** Authorized `getProjectCoverage()` returns visible project rows with domain, projectId, GSC/GA4 mapping status, cached freshness and next-action code; never credentials.

- [ ] Add searchable rows with GSC, GA4, recent data and audit status.
- [ ] Add filters: needs connection, reconnect, no recent data, no audit.
- [ ] Each row links directly to the right domain dashboard or integration step.
- [ ] Read status from existing mappings and cached summaries. Avoid fetching every Google report or paid backlink snapshot on page load.
- [ ] Support narrow screens and keyboard navigation.
- [ ] Test authorization, incomplete setup, rapid switching and partial provider failures.

**Done when:** The portfolio shows which domains need attention without opening every project.

## Task 6 — Polish each domain dashboard

**Modify:** `src/client/features/dashboard/DashboardPage.tsx`, `DashboardCards.tsx`, `Ga4Card.tsx`, `DashboardOnboarding.tsx`, existing dashboard server functions and schema.

**Consumes:** Correct mappings and health states from Tasks 4–5.

- [ ] Add the domain to the header, compact connection states and a visible data period.
- [ ] Keep a stable card order: search performance, organic traffic/key events, audit health, backlinks.
- [ ] Make onboarding compact after core setup; let users expand optional tasks.
- [ ] Introduce a shared 7/28/90-day range and equal-period comparison for date-based reports, extending server schemas as needed. Keep backlink/audit snapshot dates separate.
- [ ] Display small trend charts, readable number formatting, accessible contrast and concrete empty-state actions.
- [ ] Show source/property, freshness and partial-data warnings. Never imply GSC clicks should equal GA4 sessions.
- [ ] Audit the Analytics “Manage” link against the current integration route.
- [ ] Verify zero data, unavailable comparisons, pending/error states and rapid project switching; perform desktop/mobile/keyboard checks.

**Done when:** A domain's performance and next action can be understood at a glance.

## Task 7 — Surface business outcomes and existing opportunities

**Reuse:** `Ga4OrganicOverviewService.ts`, `Ga4MeasurementHealthService.ts`, `SearchOpportunityService.ts` and existing MCP tools.

- [ ] Show organic key events alongside sessions; separate recorded interactions from qualified leads.
- [ ] Choose meaningful events by site purpose: successful enquiries, booking actions or purchases. Track phone clicks as interactions unless a call system verifies completed calls.
- [ ] Surface the existing search-opportunity report in the UI before inventing another scoring system.
- [ ] Preserve aligned date ranges, host-aware page joins and missing/limited-data warnings.
- [ ] Group site types through existing project context initially; add schema only if real filtering needs it.
- [ ] Test mismatched hosts, redirects, missing landing-page rows and no configured key events.

**Done when:** The user can identify pages worth improving and relate search traffic to recorded business actions.

## Delivery order and verification

Deliver Tasks 1–3 first, then pilot Task 4 on two contrasting sites before completing the remaining domain mappings. Ship Task 5 next, then Tasks 6–7. Keep independent changes in small reviewed pull requests.

Before each release, use the current branch's scripts for build, targeted meaningful tests and CI; verify browser flows in staging. Before production rollout, preserve database/configuration recovery evidence and the prior Worker version. After rollout, verify Access, callbacks, project isolation, reports and displayed build metadata.

## Sources

- [Fork baseline](https://github.com/papazk/open-seo/commit/0ffff93101043aad7600a3b6a499a0cd2887ef49)
- [Original-source v0.1.11 release](https://github.com/every-app/open-seo/releases/tag/v0.1.11)
- [Upstream comparison](https://github.com/every-app/open-seo/compare/0ffff93101043aad7600a3b6a499a0cd2887ef49...deb44913c2e345ec29ce6fb066a94ca428ebc681)
- [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Search Console query semantics and limitations](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
