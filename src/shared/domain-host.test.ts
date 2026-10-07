import { expect, it } from "vitest";
import { domainHost, matchingWebStreams } from "./domain-host";
it("normalizes protocols and www without allowing neighboring domains", () => {
  expect(domainHost("https://www.Example.com/path")).toBe("example.com");
  expect(
    matchingWebStreams("example.com", [
      {
        type: "WEB_DATA_STREAM",
        webStreamData: { defaultUri: "https://www.example.com/" },
      },
      {
        type: "WEB_DATA_STREAM",
        webStreamData: { defaultUri: "https://other.example.com/" },
      },
      {
        type: "WEB_DATA_STREAM",
        webStreamData: { defaultUri: "https://example.com.attacker.test/" },
      },
      { type: "ANDROID_APP_DATA_STREAM" },
    ]),
  ).toHaveLength(1);
});
it("rejects an invalid domain and does not match streams without a web address", () => {
  expect(domainHost("javascript:alert(1)")).toBeNull();
  expect(
    matchingWebStreams("example.com", [{ type: "WEB_DATA_STREAM" }]),
  ).toEqual([]);
});
