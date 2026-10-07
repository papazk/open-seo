import { env } from "cloudflare:workers";
import { z } from "zod";

const recordSchema = z.object({
  property: z.string(),
  checkedAt: z.iso.datetime(),
  state: z.enum([
    "healthy",
    "no_data",
    "limited",
    "reconnect_required",
    "error",
  ]),
});
type Provider = "gsc" | "ga4";
type RecordedState = z.infer<typeof recordSchema>["state"];
const key = (projectId: string, provider: Provider) =>
  `integration-health:v1:${projectId}:${provider}`;

async function get(projectId: string, provider: Provider, property: string) {
  const unchecked = { state: "unchecked" as const, checkedAt: null };
  try {
    const result = recordSchema.safeParse(
      await env.KV.get(key(projectId, provider), "json"),
    );
    if (!result.success || result.data.property !== property) return unchecked;
    const { checkedAt, state } = result.data;
    return {
      state:
        Date.now() - Date.parse(checkedAt) >= 86400000
          ? ("stale" as const)
          : state,
      checkedAt,
    };
  } catch {
    return unchecked;
  }
}

async function record(
  projectId: string,
  provider: Provider,
  property: string,
  state: RecordedState,
) {
  try {
    await env.KV.put(
      key(projectId, provider),
      JSON.stringify({ property, state, checkedAt: new Date().toISOString() }),
      { expirationTtl: 604800 },
    );
  } catch {
    // Reporting still works when the optional portfolio health cache is down.
  }
}

async function clear(projectId: string, provider: Provider) {
  try {
    await env.KV.delete(key(projectId, provider));
  } catch {
    /* Optional cache. */
  }
}

export const IntegrationHealthService = { get, record, clear };
