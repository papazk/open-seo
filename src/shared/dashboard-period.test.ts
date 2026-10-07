import { expect, it } from "vitest";
import { dashboardPeriod } from "./dashboard-period";
it.each([
  { days: 7 as const, startDate: "2026-09-28" },
  { days: 28 as const, startDate: "2026-09-07" },
  { days: 90 as const, startDate: "2026-07-07" },
])(
  "resolves exactly $days days ending before Search Console's reporting lag",
  ({ days, startDate }) => {
    expect(dashboardPeriod(days, new Date("2026-10-07T15:30:00Z"))).toEqual({
      startDate,
      endDate: "2026-10-04",
    });
  },
);
it("keeps the range length correct across a leap day", () => {
  expect(dashboardPeriod(7, new Date("2024-03-04T12:00:00Z"))).toEqual({
    startDate: "2024-02-24",
    endDate: "2024-03-01",
  });
});
