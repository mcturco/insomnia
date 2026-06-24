// Browser-compatible polyfill for Node.js `url` / `node:url`.
// Backed by the WHATWG URL global. Covers the subset bundled code imports as
// named exports (`URL`, `parse`) so the web build doesn't externalize them.

export const URL = globalThis.URL;
export const URLSearchParams = globalThis.URLSearchParams;

interface LegacyUrl {
  href: string;
  protocol: string | null;
  host: string | null;
  hostname: string | null;
  port: string | null;
  pathname: string;
  search: string;
  query: string;
  hash: string;
  path: string;
  auth: string | null;
}

// Approximation of the legacy `url.parse()` shape used by a few importers.
export function parse(urlStr: string): LegacyUrl {
  try {
    const u = new globalThis.URL(urlStr);
    const auth = u.username ? `${u.username}${u.password ? `:${u.password}` : ''}` : null;
    return {
      href: u.href,
      protocol: u.protocol,
      host: u.host,
      hostname: u.hostname,
      port: u.port,
      pathname: u.pathname,
      search: u.search,
      query: u.search ? u.search.slice(1) : '',
      hash: u.hash,
      path: `${u.pathname}${u.search}`,
      auth,
    };
  } catch {
    return {
      href: urlStr,
      protocol: null,
      host: null,
      hostname: null,
      port: null,
      pathname: urlStr,
      search: '',
      query: '',
      hash: '',
      path: urlStr,
      auth: null,
    };
  }
}

export function format(urlObj: string | { href?: string; protocol?: string; host?: string; pathname?: string; search?: string; hash?: string }): string {
  if (typeof urlObj === 'string') {
    return urlObj;
  }
  if (urlObj instanceof globalThis.URL) {
    return urlObj.href;
  }
  if (urlObj.href) {
    return urlObj.href;
  }
  const { protocol = '', host = '', pathname = '', search = '', hash = '' } = urlObj;
  const proto = protocol ? (protocol.endsWith(':') ? `${protocol}//` : `${protocol}://`) : '';
  return `${proto}${host}${pathname}${search}${hash}`;
}

export default { URL, URLSearchParams, parse, format };
