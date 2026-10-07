export type BuildInfo = {
  appVersion: string | null;
  forkSha: string | null;
  upstreamBaselineSha: string | null;
  upstreamTag: string | null;
  deployedAt: string | null;
};

declare const __OPENSEO_BUILD__: BuildInfo;

export const buildInfo: BuildInfo =
  typeof __OPENSEO_BUILD__ === "undefined"
    ? {
        appVersion: null,
        forkSha: null,
        upstreamBaselineSha: null,
        upstreamTag: null,
        deployedAt: null,
      }
    : __OPENSEO_BUILD__;
