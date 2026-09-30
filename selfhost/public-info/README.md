# SEO Portfolio Local public app information

Static app information, privacy, and terms pages for the shared Google OAuth client used by the private portfolio dashboard and self-hosted OpenSEO.

Public origin: https://seo-info.3dprintingsupremacy.com

Only `public/` is deployed. No app data, credentials, tracking scripts, database bindings, or dashboard authentication handlers are included.

After reviewing any policy changes with the operator, deploy from the repository root using an installed Wrangler v4:

```powershell
wrangler deploy --config selfhost/public-info/wrangler.jsonc --dry-run
wrangler deploy --config selfhost/public-info/wrangler.jsonc
```

Check `/`, `/privacy`, and `/terms` without authentication after deployment. The app homepage and privacy URL in Google Auth Platform Branding must match these public pages. OAuth audience status and app verification are separate settings; publishing these files does not change them.
