import { QueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { googleProviders } from "./googleProviders";
vi.mock("@/serverFunctions/ga4", () => ({}));
vi.mock("@/serverFunctions/gsc", () => ({}));

it.each(["gsc", "ga4"] as const)(
  "refreshes insights and coverage after a %s property change",
  async (provider) => {
    const client = new QueryClient();
    const keys = [
      ["dashboardOpportunities", "p1", 28],
      ["projects", "coverage"],
      ...(provider === "ga4" ? [["dashboardMeasurement", "p1"]] : []),
    ];
    for (const key of keys) client.setQueryData(key, { oldProperty: true });
    for (const queryKey of googleProviders[provider].dependentKeys("p1"))
      await client.invalidateQueries({ queryKey });
    for (const key of keys)
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  },
);
