# Success-only enquiry measurement package

Deployed on 7 October 2026 for eight confirmed public enquiry flows: seven pool sites and `mybatonrougehandyman.com`. Each site passed live script, consent, page-view delivery and withdrawal checks. `generate_lead` is configured as a GA4 key event without an assigned monetary value. No production enquiry was created for testing; real visitor enquiries remain necessary to verify live success-event delivery. This standalone package preserves the previous visit-only source baseline.

## Public interfaces

| Module | Export | Signature |
| --- | --- | --- |
| `wrapper.mjs` | `wrap` | `wrap(baseWorker): WorkerWithFetch` |
| `enquiry-script.mjs` | `transformEnquiryScript` | `async (response: Response, request: Request, env: Env): Promise<Response>` |
| `enquiry-script.mjs` | `enquiryEventName` | `'seo:enquiry-persisted-v1'` |
| `enquiry-script.mjs` | `enquiryScriptQuery` | `'?seo_enquiry=v1'` |
| `enquiry-script.mjs` | `versionEnquiryScriptReferences` | `(html: string, request: Request, env: Env): string` |
| `enquiry-script.mjs` | `enquiryAdapters` | Frozen source-specific `{marker,insertion}` records for `pool-v1` and `baton-v1` |
| `overlay.mjs` | `eligible`, `overlay`, `scriptPath`, `scriptResponse` | Original consent-overlay signatures; `scriptPath` is now `/assets/seo-analytics-consent-enquiries-v1.js` |
| `consent-source.mjs` | default | Generated browser JavaScript string from `consent.js` |

The wrapper calls the unchanged base worker once, transforms only the exact allowlisted public script response, then applies the copied HTML consent overlay. The overlay versions only exact reviewed root-relative or canonical-origin script `src` references with `?seo_enquiry=v1`, so a browser's previously cached uninstrumented asset has a different URL. Existing controlled-version references stay unchanged; unrelated assets, other origins and unknown queries stay unchanged. The existing API backend and asset bundle need no rebuild. Adapt relative import names if packaging these modules under the parent's `seo-consent-*` names. The overlay imports the versioning helper from the enquiry module, which imports its `eligible` function; this legal ESM cycle is exercised by the complete suite and its functions run only after module initialization.

## Configuration

Use the existing `SEO_ANALYTICS_ORIGIN` / `SEO_ANALYTICS_MEASUREMENT_ID` bindings (fallbacks `PUBLIC_ORIGIN` / `GA4_MEASUREMENT_ID`). Add this JSON string binding for a pool site:

```json
[{"path":"/_astro/ContactForm.astro_astro_type_script_index_0_lang.B84NqIdn.js","sha256":"09bbcabeb3e0c3d134a08192d87fe914488d6e9e7be83701a1bd89a1fe01c792","adapter":"pool-v1"}]
```

For Baton Rouge:

```json
[{"path":"/_astro/ProjectForm.astro_astro_type_script_index_0_lang.BwHsqQ3e.js","sha256":"3f516cc31e3abbeb6c605a013e57b559a3eeac5486ba4539684557aaacdb8a8d","adapter":"baton-v1"}]
```

The binding name is `SEO_ENQUIRY_SCRIPTS_JSON`. The parent must verify each site's actual bytes before configuring its allowlist. Empty, malformed, duplicate-path, unknown-adapter, hash-mismatched or marker-mismatched entries produce an unchanged response. Requests must be on the exact canonical origin, GET, with no fragment/range and either no query or exactly `?seo_enquiry=v1`. Encoded variants, duplicate query keys, other versions and additional keys fail closed. Responses must be HTTP 200 JavaScript with no Set-Cookie or Content-Range. Conditional requests carrying any of `If-None-Match`, `If-Modified-Since`, `If-Match`, `If-Unmodified-Since` or `If-Range` return the original Response untouched. So do responses carrying `private`, `no-store` or `no-transform` cache directives; their bytes and restrictive instructions are preserved. Paths are restricted to a single public filename under `/_astro/` or `/assets/`. Other modified responses have stale entity/encoding headers removed and use `Cache-Control: no-cache`.

## Event contract

The source-specific insertion runs immediately after the original UI assigns its acknowledged success message, before its original reset. It checks the existing endpoint `/api/enquiry`, HTTP 201 and the actual backend's `lead_` UUID-v4 format. A small no-throw IIFE encloses only the added signal work, including native CustomEvent creation and dispatch. Signal errors are ignored locally, preserving the original saved-reference display and form reset. It dispatches a native event with `{status:201,id:localReceiptId}`. The listener validates that receipt again, rechecks currently valid scoped acceptance in localStorage, respects rejection cookies and the existing in-memory withdrawal flag, and requires working session storage. It remembers receipts in memory and sessionStorage without putting them in Google telemetry. Corrupt storage, failed writes and the 500-receipt session limit fail closed.

The only conversion command is:

```js
gtag('event', 'generate_lead', {send_to: measurementId});
```

There is no global fetch/form interception, DOM text inference, success queue, consent-later replay or catch-up. Receipt IDs, query strings, fragments and form contents are absent from all generated Google commands. Advertising stays denied. Current acknowledgement-time consent is required; consent granted while a request is pending can permit its future acknowledgement. Consent granted after acknowledgement never replays it.

New accepted choices carry `scope: 'visits-enquiries-v1'` using the existing choice key. Previously stored visit-only acceptance prompts again and does not load Google. Previous rejections remain valid. German and English explanations and privacy text cover visits and successful saved enquiries. The new script URL avoids retaining the old visit-only client script in cache.

## Backend evidence and integration prerequisites

- Read-only inspection of `master-dashboard/portfolio-maps-live-base/worker/security/public-forms.js` shows Turnstile, honeypot, request validation and idempotency checks; new enquiry statements and receipt are committed with `db.batch` before HTTP 201. Replays return HTTP 200, including the race recovery path. `website-rebuilds/2026-09-30/shared/intake-worker.mjs` forwards the backend status to `/api/enquiry`.
- The parent should compare the currently deployed backend before activating. A backend that emits different receipt formats/statuses needs explicit review and tests; do not broaden matching.
- The inspected scripts have exact, unique success statements. There is no architectural obstacle to either insertion. Source rebuilds change hashes and deliberately stop conversion delivery until inspected and allowlisted again.
- Preserve existing bindings, module graph, assets, private route guards and business endpoints when packaging. Replace the previous consent wrapper modules rather than nesting the new HTML overlay over HTML already carrying the old loader.
- The parent confirmed all eight current script references have no integrity attribute. Preserve CSP behavior; both hooks are inserted into the already served public asset, with no extra inline script. The parent also confirmed these assets route through the worker (`run_worker_first: true`, `serve_directly: false`).
- GA4 enhanced measurement, form interactions, phone clicks and generic submissions must not be marked as enquiry key events. The parent owns Google configuration and deployment. No real enquiries should be sent merely for validation.
- The memorial site's corrections form is outside the approved saved-enquiry flow and has no conversion adapter in this package.

## Verification

Use Node.js 22+ and `npm ci`, then `npm test`. This machine's existing jsdom 26.1.0 dependencies were copied into this folder because the workspace npm cache did not contain jsdom; lockfile and declared dependencies remain reproducible via npm ci.

`npm run generate` regenerates `consent-source.mjs` after editing `consent.js`. The suite checks parity with the served module, both actual compiled handlers against synthetic backend responses, success timing, validation/error/replay behavior, consent scope/withdrawal/expiry, local and session storage failures, local receipt deduplication across page boots, no Google PII, source-byte preservation under drift, private routes and wrapper integration. All requests in tests are synthetic; no browser or production API was used.

Latest complete run: **35 tests passed**, recorded in `green-test.log` and `review-green-test.log`. The initial RED failures, review regressions and implementation choices are recorded in `WORK-LOG.md`; the review RED run is preserved in `review-red-test.log`.
