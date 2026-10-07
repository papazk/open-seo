# Self-hosted updates and Google integrations

This fork records its upstream baseline in `deploy/upstream-baseline.json`.
Settings displays the package version, immutable fork commit, upstream tag and
commit, build time, and the most recent successful release check. Source archives
and builds with uncommitted changes display an unknown fork revision.

The dashboard uses complete 7, 28, or 90-day periods ending three days ago for
both Search Console and Analytics. The previous period has the same length.

## Release review

After merging to the default branch, `upstream-release-check.yml` runs weekly
and can be run manually. A newer stable official release creates one review
issue. Previously reviewed releases, including closed issues, are deduplicated.
The workflow never merges changes or deploys them.

1. Fetch `every-app/open-seo` and review the stable release, migration changes,
   deployment bindings, and custom host and Google OAuth changes.
2. Preserve the current fork commit and Worker deployment version.
3. Export the production database to private storage. Never commit database
   dumps, OAuth grants, local configuration, portfolio inventories, or credentials.
4. Restore the export in a private rehearsal environment. Apply migrations and
   verify foreign keys, project and integration mappings, sign-in, and reports.
5. Run tests, type checking, lint, and a build from a clean committed checkout.
6. Deploy through the configured Alchemy self-host deployment path. Preserve
   the existing database and KV bindings and Cloudflare Access protection.
7. Verify Settings provenance, existing projects, Google reports, custom host,
   and audit behavior. Retain the prior deployment and backup for recovery.

The Alchemy D1 migration tracker can require an explicit `applied_at` value.
Do not switch to Wrangler's migration helper without checking tracker
compatibility. A Worker rollback does not revert database migrations. Review
backward compatibility before rollout; a database restore also needs a plan to
preserve writes made after the backup.

## Google setup per project

Enable Search Console API, Google Analytics Admin API and Google Analytics Data
API in the Google Cloud project used by the OAuth client. Register the exact
HTTPS callback for every app origin in that client:

- `/api/gsc/oauth/callback`
- `/api/ga4/oauth/callback`

Keep OAuth client secrets only in the deployment's secret storage. Complete
Google's read-only consent in the browser. Testing-mode OAuth grants may need
renewal; production app verification and publishing should be reviewed separately.

Choose the correct Google account and Search Console property for each project.
For Analytics, the selected property must contain a web stream whose configured
default URL matches the project's domain. The dashboard filters organic reports
to the domain and its `www` host; neighboring domains and unrelated streams are
not a match. Confirm the property time zone and key-event configuration.

The Projects coverage table uses saved mappings and cached report checks. It
does not fetch external reports or paid backlink data for the portfolio. A saved
property is unchecked until a real dashboard report succeeds. Successful reports
with no rows show “Connected · no data”; expired grants require reconnection.
Checks become stale after 24 hours. A failed check does not imply a healthy
connection. Open a project dashboard to refresh its report checks.

Measurement checks inspect stream and key-event configuration, not whether the
site is currently sending events. Combined opportunities are requested on demand
and are provisional when Analytics data is unavailable or limited. Confirm
candidate pages and measurement before acting on their scores.

Vivaldi or extensions can block an OAuth callback with `ERR_BLOCKED_BY_CLIENT`.
Inspect the browser's site-specific blocked-content list. The user must decide
whether to permit their own app origin; do not disable browser protections
globally or copy callback authorization codes into tickets, logs, or chat.
