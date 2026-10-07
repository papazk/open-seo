import { beforeEach, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { getBuildInfo } from "./build-info";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
const git = vi.mocked(execFileSync);
const sha = "a".repeat(40);
beforeEach(() => {
  git.mockReset();
});

it("identifies a clean checkout by its immutable commit", () => {
  git.mockReturnValueOnce(sha).mockReturnValueOnce("");
  expect(getBuildInfo().forkSha).toBe(sha);
});

it("does not claim uncommitted source is the HEAD revision", () => {
  git
    .mockReturnValueOnce(sha)
    .mockReturnValueOnce(" M src/app.ts\n?? new-file.ts\n");
  expect(getBuildInfo().forkSha).toBeNull();
});

it("reports unknown provenance when Git is unavailable", () => {
  git.mockImplementation(() => {
    throw new Error("No Git checkout");
  });
  expect(getBuildInfo().forkSha).toBeNull();
});
