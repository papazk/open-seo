export const DASHBOARD_PERIODS = [7, 28, 90] as const;
export type DashboardDays = (typeof DASHBOARD_PERIODS)[number];

/** Both providers use the same complete dates, allowing three days for GSC. */
export function dashboardPeriod(days: DashboardDays, now = new Date()) {
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
