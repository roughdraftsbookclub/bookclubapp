# Edge functions — runbook

One function so far: `amazon-book`. Run these **in order**.

The club's Supabase project lives under a **different login** from the one
the Supabase MCP tooling is signed into, so every step here is yours to run.
Project ref: `xshhhizeotzfcgfioezq` (from `SUPABASE_URL` in `index.html`).

---

## 1. Deploy the function

**Dashboard route** (no CLI, easiest when switching logins):

1. Sign in to the account that owns `xshhhizeotzfcgfioezq`.
2. Edge Functions → **Deploy a new function** → name it exactly `amazon-book`.
3. Paste the whole of `supabase/functions/amazon-book/index.ts`.
4. Turn **"Verify JWT" OFF** before deploying. See the note at the bottom —
   this is deliberate, and it is not what protects the function.

**CLI route**, if you'd rather:

```bash
supabase functions deploy amazon-book --no-verify-jwt --project-ref xshhhizeotzfcgfioezq
```

Nothing else to configure. The function reads no secrets and no environment
variables, and touches no table.

---

## 2. Check it answers — refusals first

Run these three before testing a real link. They prove the guard works, and
none of them makes an outbound request.

A non-Amazon host must be refused with `400 nothandled`:

```bash
curl -s -X POST "https://xshhhizeotzfcgfioezq.supabase.co/functions/v1/amazon-book" -H "Content-Type: application/json" -d '{"url":"https://example.com/dp/0141393394"}'
```

So must a redirector that merely mentions Amazon:

```bash
curl -s -X POST "https://xshhhizeotzfcgfioezq.supabase.co/functions/v1/amazon-book" -H "Content-Type: application/json" -d '{"url":"https://evil.test/a.co/d/ABCDEFG"}'
```

Both should print `{"ok":false,"reason":"nothandled"}`. If either returns
anything else, **stop and tell me** — the allowlist is the whole security
model and it has to hold.

---

## 3. Check it resolves a real link

Open Amazon, find any book's **paperback or hardcover** page, use the Share
button to get an `a.co/d/...` link, and run:

```bash
curl -s -X POST "https://xshhhizeotzfcgfioezq.supabase.co/functions/v1/amazon-book" -H "Content-Type: application/json" -d '{"url":"PASTE_THE_a.co_LINK_HERE"}'
```

Expected: `{"ok":true,"isbn":"0141393394"}` — a 10-character ISBN.

Then share a **Kindle** page the same way and run it again. Expected:
`{"ok":false,"reason":"kindle"}`. That's a success, not a failure: the app
uses it to show "That's the Kindle edition" with the right advice.

Other reasons you may see, all `ok:false`: `deadlink` (a.co 404),
`nobook` (resolved to a page with no ISBN in the URL), `offsite`,
`timeout`, `fetchfailed`, `toomanyhops`.

---

## 4. Wire up the client

Already written and committed — `index.html` calls this function whenever a
pasted link is an Amazon shortener, and falls back to the existing
"That's a Share link" screen if the call fails, so **deploy order doesn't
matter and a missing function breaks nothing.**

It reaches members only once `main` is pushed to GitHub Pages, which is
currently blocked on the `oatmeal-stack` credential (`git push` returns 403
against `roughdraftsbookclub/bookclubapp`).

---

## On "Verify JWT off"

The club has no accounts and no JWTs by design, so there is no token to
check — leaving verification on would just reject every member. What limits
this endpoint instead:

- the input host must be one of five Amazon shorteners, checked **before**
  any outbound request;
- redirects are followed manually, max 4 hops, each re-checked against the
  same allowlist plus `amazon.*`;
- the response body is never read, parsed, or returned — the only thing that
  ever comes back is a 10-character ISBN or a reason code from a fixed list.

So this is not an open URL fetcher. The realistic worst case is that a
stranger uses it to expand Amazon short links, which is what it does for
members anyway. There is no rate limiting, consistent with the rest of the
project (`check_organizer_code` has none either) — sized for nine friends,
not a public API.
