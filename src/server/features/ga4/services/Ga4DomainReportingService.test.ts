import { beforeEach, expect, it, vi } from "vitest";
import type {
  Ga4RunReportRequest,
  Ga4RunReportResponse,
} from "@/server/lib/ga4Client";
import { makeGa4Connection } from "./ga4-test-fixtures";
import { Ga4ReportingService } from "./Ga4ReportingService";
const mocks = vi.hoisted(() => ({
  connection: vi.fn(),
  report:
    vi.fn<(request: Ga4RunReportRequest) => Promise<Ga4RunReportResponse>>(),
}));
vi.mock("@/server/features/ga4/repositories/Ga4ConnectionRepository", () => ({
  Ga4ConnectionRepository: { getByProjectId: mocks.connection },
}));
vi.mock("@/server/lib/ga4Client", () => ({
  createGa4DataClient: () => ({ runReport: mocks.report }),
}));
beforeEach(() => {
  mocks.connection.mockResolvedValue(makeGa4Connection());
  mocks.report.mockResolvedValue({});
});

it("filters a domain's landing pages before Google's row limit", async () => {
  await Ga4ReportingService.runReport({
    projectId: "p1",
    kind: "landing_pages",
    channel: "organic_search",
    hostName: "example.com",
  });
  expect(mocks.report.mock.calls[0][0].dimensionFilter).toEqual({
    andGroup: {
      expressions: [
        {
          filter: {
            fieldName: "sessionDefaultChannelGroup",
            stringFilter: { matchType: "EXACT", value: "Organic Search" },
          },
        },
        {
          filter: {
            fieldName: "hostName",
            inListFilter: {
              values: ["example.com", "www.example.com"],
              caseSensitive: false,
            },
          },
        },
      ],
    },
  });
});
