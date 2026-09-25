import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emailAccessGate } from "../alchemy.access.ts";

const access = vi.hoisted(() => ({
  policy: vi.fn(),
  application: vi.fn(),
}));

vi.mock("alchemy/Cloudflare", () => ({
  Access: {
    Policy: access.policy,
    Application: access.application,
  },
}));

describe("emailAccessGate", () => {
  beforeEach(() => {
    access.policy.mockReturnValue(Effect.succeed({ policyId: "policy-id" }));
    access.application.mockReturnValue(Effect.succeed({ aud: "audience" }));
  });

  it("keeps the primary hostname protected when adding another public hostname", async () => {
    const program = emailAccessGate({
        policyId: "SelfHostAllowUsers",
        applicationId: "SelfHostAccess",
        policyName: "self-host users",
        applicationName: "self-host",
        domain: "open-seo-selfhost.example.workers.dev",
        additionalDomains: ["openseo.example.com"],
        emails: ["owner@example.com"],
      }) as unknown as Effect.Effect<unknown>;
    await Effect.runPromise(program);

    expect(access.application).toHaveBeenCalledWith(
      "SelfHostAccess",
      expect.objectContaining({
        domain: "open-seo-selfhost.example.workers.dev",
        destinations: [
          { type: "public", uri: "open-seo-selfhost.example.workers.dev" },
          { type: "public", uri: "openseo.example.com" },
        ],
      }),
    );
  });
});
