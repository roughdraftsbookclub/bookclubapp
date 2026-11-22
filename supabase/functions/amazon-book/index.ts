/* amazon-book — resolve an Amazon short link to a print ISBN-10.
 *
 * WHY THIS EXISTS AT ALL
 * Amazon's mobile Share button produces https://a.co/d/XXXXXXX, which is the
 * single most common thing a member pastes into "Suggest a Book". It 302s to
 * the real product page, but amazon.com sends no CORS headers, so page JS
 * cannot read the Location header or the body, and redirect:'manual' yields
 * an opaque response with no URL. A browser genuinely cannot follow it. This
 * function is the server-side hop, and nothing more.
 *
 * WHAT IT DELIBERATELY IS NOT
 * Not a general URL fetcher. An unauthenticated function that fetches
 * whatever URL it is handed is an SSRF hole, so:
 *   - the input host must be on SHORTENERS (five Amazon shorteners, nothing
 *     else). Anything else is refused before a single byte goes out.
 *   - redirects are followed MANUALLY, at most MAX_HOPS, and every hop is
 *     re-checked against the same allowlist plus amazon.* storefronts. A
 *     redirect pointing anywhere else ends the walk.
 *   - the response BODY is never read, never parsed and never returned. The
 *     only thing that ever leaves this function is a 10-character ISBN, or a
 *     reason code from a fixed list.
 *   - no redirect to a private/loopback host can matter, because the host
 *     allowlist is checked before the hostname is ever resolved.
 *
 * It also never fetches the storefront in the normal case: a.co's very first
 * Location header already contains /dp/<ASIN>, so the ISBN is extracted from
 * the URL string and we stop. Measured 2026-11-22: amazon.com/dp/ answers 200
 * to a browser User-Agent and 503 to a default one, so touching the
 * storefront would be both slower and unreliable. We don't.
 *
 * DEPLOY (see supabase/functions/README.md for the full runbook):
 *   supabase functions deploy amazon-book --no-verify-jwt --project-ref <ref>
 *
 * --no-verify-jwt is intentional: the club has no accounts and no JWTs by
 * design, so there is no token to check. The protections are the host
 * allowlist and the ISBN-only response, NOT authentication. The worst a
 * stranger can do with this endpoint is expand Amazon short links.
 */

const SHORTENERS = new Set(['a.co', 'amzn.to', 'amzn.eu', 'amzn.asia', 'amzn.com']);
const MAX_HOPS = 4;
const TIMEOUT_MS = 8000;

/* Amazon varies its response on User-Agent (the a.co 404 above carried
   `Vary: User-Agent`), and a default runtime UA gets 503'd on the storefront.
   Generic browser string only — never anything identifying the club. */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const ALLOWED_ORIGINS = new Set([
  'https://roughdraftsbookclub.github.io',
  'http://localhost:8420',
  'http://127.0.0.1:8420',
]);

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : 'null',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), 'Content-Type': 'application/json' },
  });

const hostOf = (u: string): string | null => {
  try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ''); }
  catch { return null; }
};

const isShortener = (u: string) => { const h = hostOf(u); return !!h && SHORTENERS.has(h); };

/* A storefront we're willing to READ A URL FROM while walking redirects.
   amazon.com, amazon.co.uk, amazon.de, ... and their subdomains. */
const isStorefront = (u: string) => {
  const h = hostOf(u);
  return !!h && (h === 'amazon.com' || /(^|\.)amazon\.[a-z]{2,}(\.[a-z]{2,})?$/.test(h));
};

/* Deliberately a copy of index.html's parseAmazonISBN rather than a shared
   import — different runtime, and this one must keep working if the client
   is edited. tests/lookup.js covers the browser copy; the two must agree on
   the rule: /dp/ or /gp/product/ followed by a mod-11-valid ISBN-10. */
function extractISBN(url: string): string | null {
  const m = url.match(/\/(?:dp|gp\/product)\/([0-9][0-9Xx]{8}[0-9Xx])(?![0-9A-Za-z])/);
  if (!m) return null;
  const raw = m[1].toUpperCase();
  if (!/^\d{9}[\dX]$/.test(raw)) return null;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(raw[i]);
  sum += raw[9] === 'X' ? 10 : Number(raw[9]);
  return sum % 11 === 0 ? raw : null;
}

/* A B0-style ASIN means Kindle/audiobook/not-a-print-book. Worth telling
   apart from "no book here at all", because the member's remedy differs:
   they need to switch to the paperback, not find a different link. */
const looksKindle = (url: string) => /\/(?:dp|gp\/product)\/B[0-9A-Z]{9}(?![0-9A-Z])/i.test(url);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return json({ ok: false, reason: 'method' }, 405, origin);

  let url = '';
  try {
    const body = await req.json();
    url = String(body?.url ?? '').trim();
  } catch {
    return json({ ok: false, reason: 'badrequest' }, 400, origin);
  }

  if (!url || url.length > 300) return json({ ok: false, reason: 'badrequest' }, 400, origin);

  // The gate. Anything that is not an Amazon shortener stops here, before
  // any outbound request is made.
  if (!isShortener(url)) return json({ ok: false, reason: 'nothandled' }, 400, origin);

  try {
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      // Check the URL we are ABOUT to fetch for an ISBN first — in the normal
      // case a.co's first Location already carries it, so we never issue a
      // second request and never touch the storefront.
      const isbn = extractISBN(url);
      if (isbn) return json({ ok: true, isbn }, 200, origin);
      if (looksKindle(url)) return json({ ok: false, reason: 'kindle' }, 200, origin);

      if (!isShortener(url) && !isStorefront(url))
        return json({ ok: false, reason: 'offsite' }, 200, origin);

      const res = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      });

      // The body is never read. Cancel it so the connection is released.
      try { await res.body?.cancel(); } catch { /* already drained */ }

      if (res.status === 404) return json({ ok: false, reason: 'deadlink' }, 200, origin);

      const loc = res.headers.get('location');
      if (!loc) {
        // Landed somewhere with no further redirect and no ISBN in the URL.
        return json({ ok: false, reason: 'nobook' }, 200, origin);
      }
      url = new URL(loc, url).toString();   // resolve relative Location
    }
    return json({ ok: false, reason: 'toomanyhops' }, 200, origin);
  } catch (e) {
    const timedOut = e instanceof DOMException && e.name === 'TimeoutError';
    return json({ ok: false, reason: timedOut ? 'timeout' : 'fetchfailed' }, 200, origin);
  }
});
