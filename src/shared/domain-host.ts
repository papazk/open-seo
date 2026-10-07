export function domainHost(value: string): string | null {
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return host.includes(".") && !host.includes(":") ? host : null;
  } catch {
    return null;
  }
}

export function matchingWebStreams<
  T extends { type: string; webStreamData?: { defaultUri?: string } },
>(domain: string, streams: T[]): T[] {
  const host = domainHost(domain);
  return host
    ? streams.filter(
        (stream) =>
          stream.type === "WEB_DATA_STREAM" &&
          stream.webStreamData?.defaultUri &&
          domainHost(stream.webStreamData.defaultUri) === host,
      )
    : [];
}
