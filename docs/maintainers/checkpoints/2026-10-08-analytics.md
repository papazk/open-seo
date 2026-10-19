# Analytics checkpoint — 8 October 2026

The approved OpenSEO upgrade, Google connections and consent-based tracking rollout are complete. Verification of newly installed business events now depends on genuine visitor activity.

## Source and release

- Fork: [papazk/open-seo](https://github.com/papazk/open-seo).
- Official baseline: OpenSEO v0.1.11.
- Deployed application revision: `1920110d9187a7faf2c28ecfac4f73a126995a44`, from [PR #2](https://github.com/papazk/open-seo/pull/2).
- Website consent and enquiry source archive: [PR #3](https://github.com/papazk/open-seo/pull/3), with response preservation and stream cleanup in [PR #4](https://github.com/papazk/open-seo/pull/4) and [PR #5](https://github.com/papazk/open-seo/pull/5).
- Source checkpoint before this documentation change: `48e0b2e8c071b4616a7d277ef8d18d04a06271b6`.
- The weekly upstream check opens an update notice when appropriate. It does not automatically merge or deploy upstream changes.

## Google connections and website tracking

All 31 existing project domains have verified Search Console and Analytics connections. A dashboard connection is separate from a working website tag. Two owner-excluded domains remain outside the tracking and monitoring work; their existing project mappings were retained.

The approved included-site rollout is published. The final six directories passed live checks for no Analytics/Tag Manager requests before consent, accepted page-view delivery to the exact mapped property after consent, and no further tracking after rejection and reload. Privacy disclosures and equal Allow/Reject choices are present. Current production modules, assets, settings and bindings were preserved, with private rollback records retained.

## Business event definitions

- Eight pool/handyman enquiry flows use `generate_lead` only after the existing backend persists an enquiry and returns its success response.
- Optika uses `booking_confirmed` only after a saved booking and its displayed confirmation. The event and consent changes are published in [Optika PR #10](https://github.com/papazk/optika-rodenstock/pull/10).
- The two native pool sites retain `form_submission` and owner-qualified `qualified_enquiry` measurement.
- Liderlab retains `order_completed`. An accepted order does not establish payment settlement.
- Editorial corrections and directory referral clicks are not qualified business conversions.

No production booking, enquiry, order or lead qualification was fabricated for testing. Contact details, booking details, private identifiers and form contents are excluded from Analytics events.

## Follow-up

The owner approved an active daily follow-up in the local Codex chat at 10:00 Europe/Berlin. It checks the eleven booking/enquiry properties and reports a new conversion, a meaningful mismatch or a failed check. Unchanged results stay quiet. The task is a local Codex automation, separate from the GitHub upstream workflow.

Compare event-name totals from a fixed 7 October 2026 start date, recording the latest available end date and processing delay. Avoid treating changes in a rolling window as new conversions. OpenSEO reports organic traffic in complete date windows ending three days earlier; total Analytics counts can differ because of dates and channels. Private aggregate baselines and browser evidence remain outside the public repository.

The next step is to verify the first genuine consented booking/enquiry event, then confirm its processed reporting. An empty report alone does not establish a tracking failure.

Two small archive README issues remain: references to local-only evidence and unclear wording about the previous consent baseline. They do not block the rollout or monitoring.
