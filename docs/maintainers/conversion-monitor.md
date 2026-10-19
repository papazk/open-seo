# Self-hosted conversion monitor

The selfhost deployment schedules an hourly trigger at minute 23. The handler checks the eleven reviewed target properties after 10:00 Europe/Berlin and skips a successfully completed day. Failed checks or pending notification delivery retry hourly. Hosted and other preview stages do not enable this portfolio-specific monitor.

Reports use a fixed start of 7 October 2026 through yesterday in each property's time zone. They include all channels; the existing dashboard's organic-only reports end three days ago. Recent GA4 counts can change during processing. A dated high-water mark prevents temporary decreases and later rebounds from creating duplicate conversion notices. The last manually checked baseline was zero target events. Missing tracking during the pool rebuild means that baseline is not proof of zero actual enquiries.

Reports that fail, change property mapping, or indicate incomplete/limited data preserve the previous successful totals. An HTTP installation check reports present, missing or unverified independently of the Analytics report. Presence alone never proves that a conversion was delivered. The dashboard displays report dates, pending alert delivery and checks older than 26 hours.

Notifications use the private OpenSeoMonitorAlerts RPC entrypoint in the existing portfolio Worker. The entrypoint accepts only allowlisted domains, properties, event names and aggregate counts. It resolves the existing Telegram configuration inside the portfolio application; credentials are not copied to OpenSEO. It has no public HTTP route and does not enable paused pool lead notifications. Provider acceptance is deduplicated in a separate SQL table; uncertain sends are held for review rather than blindly resent.

## Release order

1. Apply the portfolio `0035_openseo_monitor_alerts.sql` additive migration and deploy the named RPC entrypoint while preserving the exact current runtime, bindings, assets and paused lead settings. Do not replace the live composite Worker with an older whole-repository build.
2. Deploy OpenSEO using its normal selfhost Alchemy path with its existing resources and access gate. This adds the private service binding and the minute-23 trigger.
3. Verify one actual scheduled run, saved dates/counts, and private Telegram delivery using a clearly labelled setup test or a genuine check failure. Never generate production bookings or enquiries.
4. Retire the chat-based monitor only after cloud execution and notification delivery are verified.

A rejected/uncertain notification is visible in OpenSEO and requires review. Installation errors can result from a site blocking the monitor, so an unverified check must not be described as broken tracking.
