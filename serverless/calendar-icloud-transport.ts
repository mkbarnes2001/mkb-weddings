import { SaxesParser } from "saxes";
import ICAL from "ical.js";
import { bookingError } from "../shared/online-booking";

export const DAV = "DAV:",
  CALDAV = "urn:ietf:params:xml:ns:caldav";
type XmlNode = {
  uri: string;
  name: string;
  text: string;
  children: XmlNode[];
  attrs: Record<string, string>;
};
export const child = (node: XmlNode, uri: string, name: string) =>
  node.children.find((n) => n.uri === uri && n.name === name);
export const children = (node: XmlNode, uri: string, name: string) =>
  node.children.filter((n) => n.uri === uri && n.name === name);
export const xmlEscape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
export const calendarUnavailable = () =>
  bookingError(
    "iCloud Calendar could not be checked. Reconnect or try again shortly.",
    502,
  );

// Credentials may only travel to Apple's known CalDAV service hosts, including
// discovery redirects. Neither a supplied URL nor a response href can bypass this.
export function iCloudUrl(input: string, base = "https://caldav.icloud.com/") {
  const url = new URL(input, base);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    !/^(caldav|p\d+-caldav)\.icloud\.com$/.test(url.hostname) ||
    /[\\\u0000-\u0020]/.test(input)
  )
    throw calendarUnavailable();
  return url.href;
}
export type ICloudCredentials = { username: string; password: string };
export function iCloudCredentials(input: any): ICloudCredentials {
  const username = String(input?.email || "").trim(),
    password = String(input?.password || "").trim();
  if (
    !/^[^\s:@]+@[^\s:@]+\.[^\s:@]+$/.test(username) ||
    username.length > 254 ||
    !/^[a-z]{4}(?:-[a-z]{4}){3}$/.test(password)
  )
    throw bookingError(
      "Enter your Apple Account email and an app-specific password (four groups of four letters).",
    );
  return { username, password };
}
export async function iCloudRequest(
  credentials: ICloudCredentials,
  input: string,
  method: string,
  body?: string,
  extra: Record<string, string> = {},
) {
  let url = iCloudUrl(input);
  const auth = btoa(
    String.fromCharCode(
      ...new TextEncoder().encode(
        `${credentials.username}:${credentials.password}`,
      ),
    ),
  );
  const signal = AbortSignal.timeout(15000);
  for (let redirects = 0; redirects < 4; redirects++) {
    const res = await fetch(url, {
      method,
      body,
      redirect: "manual",
      signal,
      headers: {
        ...extra,
        Authorization: `Basic ${auth}`,
      },
    });
    if ([301, 302, 307, 308].includes(res.status)) {
      await res.body?.cancel();
      const location = res.headers.get("location");
      if (!location) throw calendarUnavailable();
      url = iCloudUrl(location, url);
      continue;
    }
    if ([401, 403].includes(res.status)) {
      await res.body?.cancel();
      throw bookingError(
        "Reconnect iCloud Calendar with a valid app-specific password and calendar access.",
        502,
      );
    }
    return { res, url };
  }
  throw calendarUnavailable();
}
export async function boundedCalendarText(res: Response) {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "",
    size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4 * 1024 * 1024) throw calendarUnavailable();
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch {
    await reader.cancel();
    throw calendarUnavailable();
  }
}
export function parseCalendarXml(text: string): XmlNode {
  const stack: XmlNode[] = [];
  let root: XmlNode | undefined,
    count = 0;
  const parser = new SaxesParser({ xmlns: true });
  parser.on("doctype", () => {
    throw calendarUnavailable();
  });
  parser.on("opentag", (tag) => {
    if (++count > 30000 || stack.length > 24) throw calendarUnavailable();
    const n: XmlNode = {
      uri: tag.uri,
      name: tag.local,
      text: "",
      children: [],
      attrs: {},
    };
    for (const attr of Object.values(tag.attributes))
      n.attrs[attr.local] = attr.value;
    if (stack.length) stack[stack.length - 1].children.push(n);
    else root = n;
    stack.push(n);
  });
  const addText = (value: string) => {
    if (stack.length) stack[stack.length - 1].text += value;
  };
  parser.on("text", addText);
  parser.on("cdata", addText);
  parser.on("closetag", () => {
    stack.pop();
  });
  try {
    parser.write(text).close();
  } catch {
    throw calendarUnavailable();
  }
  if (!root || root.uri !== DAV || root.name !== "multistatus")
    throw calendarUnavailable();
  return root;
}
export async function iCloudProperties(
  credentials: ICloudCredentials,
  url: string,
  properties: string,
  depth = "0",
) {
  const result = await iCloudRequest(
    credentials,
    url,
    "PROPFIND",
    `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop>${properties}</d:prop></d:propfind>`,
    { Depth: depth, "Content-Type": "application/xml; charset=utf-8" },
  );
  if (result.res.status !== 207) {
    await result.res.body?.cancel();
    throw calendarUnavailable();
  }
  return {
    url: result.url,
    responses: children(
      parseCalendarXml(await boundedCalendarText(result.res)),
      DAV,
      "response",
    ),
  };
}
export function responseProps(response: XmlNode): XmlNode {
  const props: XmlNode = {
    uri: DAV,
    name: "prop",
    text: "",
    children: [],
    attrs: {},
  };
  const status = child(response, DAV, "status")?.text;
  if (status && !/^HTTP\/\S+ 200\b/.test(status)) throw calendarUnavailable();
  for (const item of children(response, DAV, "propstat")) {
    if (/^HTTP\/\S+ 200\b/.test(child(item, DAV, "status")?.text || ""))
      props.children.push(...(child(item, DAV, "prop")?.children || []));
  }
  return props;
}
export type ICloudCalendar = {
  url: string;
  name: string;
  writable: boolean;
  timezone: string;
};
export async function discoverICloudCalendars(
  credentials: ICloudCredentials,
): Promise<ICloudCalendar[]> {
  const principal = await iCloudProperties(
    credentials,
    "https://caldav.icloud.com/",
    "<d:current-user-principal/>",
  );
  if (principal.responses.length !== 1) throw calendarUnavailable();
  const principalHref = child(
    child(
      responseProps(principal.responses[0]),
      DAV,
      "current-user-principal",
    ) || ({ children: [] } as XmlNode),
    DAV,
    "href",
  )?.text;
  if (!principalHref) throw calendarUnavailable();
  const home = await iCloudProperties(
    credentials,
    iCloudUrl(principalHref, principal.url),
    "<c:calendar-home-set/>",
  );
  if (home.responses.length !== 1) throw calendarUnavailable();
  const homeHref = child(
    child(responseProps(home.responses[0]), CALDAV, "calendar-home-set") ||
      ({ children: [] } as XmlNode),
    DAV,
    "href",
  )?.text;
  if (!homeHref) throw calendarUnavailable();
  const list = await iCloudProperties(
    credentials,
    iCloudUrl(homeHref, home.url),
    "<d:resourcetype/><d:displayname/><d:current-user-privilege-set/><c:supported-calendar-component-set/><c:calendar-timezone/>",
    "1",
  );
  const result: ICloudCalendar[] = [];
  for (const response of list.responses) {
    const p = responseProps(response),
      type = child(p, DAV, "resourcetype");
    if (!type || !child(type, CALDAV, "calendar")) continue;
    const components = child(p, CALDAV, "supported-calendar-component-set");
    if (
      !components ||
      !children(components, CALDAV, "comp").some(
        (c) => c.attrs.name === "VEVENT",
      )
    )
      continue;
    const href = child(response, DAV, "href")?.text;
    if (!href) throw calendarUnavailable();
    const privileges = child(p, DAV, "current-user-privilege-set"),
      names = new Set(
        privileges
          ? children(privileges, DAV, "privilege").flatMap((n) =>
              n.children.filter((c) => c.uri === DAV).map((c) => c.name),
            )
          : [],
      );
    const writable =
      names.has("all") ||
      names.has("write") ||
      ["write-content", "bind", "unbind"].every((n) => names.has(n));
    let timezone = "";
    const tz = child(p, CALDAV, "calendar-timezone")?.text;
    if (tz) {
      try {
        timezone = String(
          new ICAL.Component(ICAL.parse(tz))
            .getFirstSubcomponent("vtimezone")
            ?.getFirstPropertyValue("tzid") || "",
        );
        if (timezone) new Intl.DateTimeFormat("en", { timeZone: timezone });
      } catch {
        throw calendarUnavailable();
      }
    }
    const url = iCloudUrl(href, list.url);
    if (!url.endsWith("/")) throw calendarUnavailable();
    result.push({
      url,
      name: (child(p, DAV, "displayname")?.text || "Calendar").slice(0, 120),
      writable,
      timezone,
    });
  }
  if (result.length > 100) throw calendarUnavailable();
  return result;
}
