export function monitorCrons(
  stage: string,
  existing: string[],
  bootstrap: boolean,
) {
  return stage === "selfhost"
    ? [...existing, "23 * * * *", ...(bootstrap ? ["* * * * *"] : [])]
    : existing;
}

export const monitorAlertBinding = {
  type: "service" as const,
  name: "MONITOR_ALERTS",
  service: "seo-portfolio-dashboard-connected",
  entrypoint: "OpenSeoMonitorAlerts",
};
