# Rough Drafts Book Club — voting app

A single-page web app that turns a book club's table conversation into a
democratic book choice. Nine or ten friends, in person, once a month.

**The governing constraint, from the owner's brief:** *the app is not the book
club.* It should occupy a few minutes of the meeting and then get out of the
way. Whenever a feature would add meeting time, phone time, or ceremony, the
answer is usually no.

Live at https://roughdraftsbookclub.github.io/bookclubapp/ (GitHub Pages,
`main` / root). Backed by a real Supabase project — votes sync across real
devices now. See "What's stubbed" for what's still simulated.

---

## Current state

`index.html` is the entire app: one self-contained file, no build step, no
npm dependencies. The logo is an embedded data URI. Outbound requests: Google
Fonts, Open Library (search + jackets), Amazon links, and Supabase (data +
realtime), loaded at runtime via `esm.sh` — still no bundler.

`STORE` is now a local cache, not the source of truth — it's populated from
Supabase on load (`bootstrap()`) and kept current by realtime subscriptions on
`books`, `club`, `meetings` and `ballots`. Each browser mints one real token
into `localStorage` on first visit (`MY_TOKEN`) and keeps it — there's no
longer a "Phone 1–4" switcher standing in for other devices; two real phones
are just two real browsers now, each with their own token.

---

## Settled decisions — please don't re-litigate these

Each of these was argued through and several were changed *because simulation
contradicted the first instinct*. The reasoning matters more than the rule.

### No accounts, ever

No logins, no passwords, no profiles. The organizer texts a link. This is
explicit in the brief and was reaffirmed after a detour through Google/Apple
auth.

But **an anonymous ballot token is still required** — without something
per-device you cannot show "7 of 9 have voted", let someone change their vote,
or let a phone that locked mid-round return to the right screen. On first visit
the app mints a random token (`tk-…`) and keeps it in localStorage. It maps to
no person and is never shown to anyone. Ballots are keyed by it.

Members are **fully anonymous**: no names are collected and no name appears
anywhere member-facing. The organizer's review queue says "member suggestion",
not who sent it. The one exception is a "Yours" tag on your own suggestions,
driven by your own token — it reveals nothing about anyone else.

### Two voting phases

1. **Interest round** — approval voting, pick up to **5** of the candidates.
2. **Shortlist** — derived from round 1, see below.
3. **Ranked round** — rank your top **3** of the shortlist, instant-runoff.

`maxApprovals` was 4 and is now 5: simulation showed 5 roughly halves the
shortlist-tie rate (2.8% → 1.8%) at negligible cost in meeting time.

`rankDepth` is 3 rather than the full shortlist. Ranking all 6 buys almost
nothing — ambiguous-winner rate 2.6% vs 3.4% — and costs about a minute per
member. Truncated ballots are handled correctly (see IRV below).

### The shortlist floats, and the organizer never breaks a tie

**This is the most important rule in the app.** A fixed six-book shortlist
produced a cutoff tie in **51%** of simulated meetings, and **96% of those ties
were between books with 0 or 1 votes**. That would have meant interrupting the
meeting roughly every other month to ask the organizer to personally choose
between books nobody wanted — high-visibility authority over a decision with no
mandate. Exactly what the app exists to prevent.

Current rule, in `computeShortlist()`:

1. Look for a genuine gap in the vote counts anywhere between positions 5 and 8,
   preferring the gap nearest 6. Cut there. (~97% of meetings.)
2. No gap? **Cut short** — take only books that beat the tied count and stop.
   Padding a shortlist with books nobody asked for is worse than a short list.
3. Fewer than `shortlistFloor` (3) books clear the bar? Fill deterministically:
   highest votes first, ties broken by longest time on the shelf.

There is **no code path that asks the organizer to choose**. This is verified by
a 20,000-meeting fuzz test at turnouts from 3 to 12 voters. If you add a
tie-break UI, you have broken the design.

### Instant-runoff details

- Ballots are truncated (3 of ~6). When all of a voter's ranked books are
  eliminated, the ballot is **exhausted** and leaves the active total. The
  majority threshold is recomputed each round against non-exhausted ballots.
- Eliminate **one candidate per round**. An earlier version batch-eliminated
  everyone tied for last, which can deny a survivor transfers that would have
  changed the winner. Bulk exclusion now happens only when the whole tied group
  provably cannot overtake anyone — an outcome-neutral optimisation.
- Ties for last are broken by **countback** (weakest in the most recent round
  where they differed), then deterministically. Same ballots always produce the
  same winner; verified across 300 shuffles.
- Typical result: 1.6 rounds. Most nights someone wins on first preferences and
  the runoff never runs. It is insurance, not ceremony.

### The organizer is a member

There is no separate admin account. The organizer votes on the same ballot as
everyone else and their ballot counts. A thin strip on top of the normal member
app opens the console, gated by a short passcode. The console entry point
itself just needs a `?organizer` link once (remembered in `localStorage`
after); nobody stumbles into it from the plain link texted to the group.

**The passcode is checked inside the database now**
(`check_organizer_code`, `supabase/schema.sql`), not compared in client JS —
the real code lives only in the `organizer_secret` table, which has no RLS
policy granting it to anyone, ever. Every organizer-only write (opening a
phase, publishing results, editing club settings) goes through a
`security definer` function that re-checks the passcode itself, so a request
that skips the UI entirely still can't mutate anything without it. Still
sized for nine friends, not a public API — there's no rate limiting on
`check_organizer_code`, so it isn't brute-force-hardened, just no longer
readable in page source.

### Suggesting a book

Title is the only required field. Author is optional. There is **no "why do you
recommend it"** field — deliberately removed.

The flow is three screens and **nothing is ever written to the shelf without the
member seeing it**:

1. Type a title → search Open Library
2. Pick from up to 5 matches (jacket, author, year, page count)
3. Confirm — large jacket, ISBN, and a *Check on Amazon* link — then add

Every failure mode also lands on a screen: nothing matched, or the search
couldn't run, each with an explicit "add without a cover" choice. An earlier
version silently added the book as typed when lookup failed, which read as the
app ignoring the user.

Suggestions **lock the moment Phase One opens** — the candidate list must not
move under a ballot in progress. A book added during the lobby does join that
night's ballot.

Member suggestions go live immediately but are flagged `needsReview` so the
organizer can fix bad metadata. Anything confirmed through the lookup already
has a jacket and author, so it skips the queue.

### Archiving is staged, never automatic

Books that go cold land in an "archive candidates" list on the results screen
with a reason. The organizer can spare any of them. **Nothing is archived until
results are published.** Archived books stay in the database and can be
suggested again.

Thresholds are config, not hard-coded: `zeroVoteStreakToArchive` (2 consecutive
meetings with no votes) and `shortlistMissesToArchive` (3 consecutive misses).

**Resolved: `zeroVoteStreakToArchive: 4`, `shortlistMissesToArchive: 8`** (was 2/3).
With a 17-book shelf and a 5-8 book shortlist, most books "miss" most nights by
construction — 9-11 of 17 don't make the cut regardless of whether anyone
actually dislikes them. Missing the shortlist is a weak signal; scoring zero
approvals is a strong one, so the two thresholds shouldn't have been close
together. `tests/archive_sim.js` (not part of the CI suite — a decision-record
script, rerun it if this ever needs revisiting) ran 5,000 static seasons — no
new suggestions, worst case — of 12 meetings each: the old 2/3 pushed the shelf
below the app's own 10-book minimum-to-vote floor by month 3 on average, which
matches the "8 archive candidates in one meeting" that got this flagged
originally. 4/8 pushes that out to month ~6.7.

⚠️ **This delays the problem, it doesn't solve it.** At this shelf size, *any*
static threshold eventually archives past the 10-book floor without new
suggestions — 5,000-season fuzzing shows ~94% of fully static years still hit
it eventually, just later. The real fix is that the club keeps suggesting
occasionally, which the suggestion flow already makes frictionless. If the
first few real meetings burn through the shelf faster than expected anyway,
that's a sign the shelf needs replenishing, not a sign to keep raising these
numbers — a shelf propped up by loose thresholds will start surfacing books
nobody's actually into.

### Practice mode

`meeting.isPractice` exists from the first line of the data model, not bolted
on. Publishing results in practice mode discards everything. Keep the flag on
every session, ballot and archive action — retrofitting it later is a rewrite.

---

## Data model

Field names mirror the real Postgres tables now (`supabase/schema.sql`) —
this is no longer aspirational. `STORE`'s in-memory shape is still
camelCase; the mapping to/from snake_case columns lives in `bookFromRow` /
`meetingFromRow` / `clubFromRow` near the bottom of `index.html`.

```
books:    id, title, author, isbn, cover_url, cover_large, amazon,
          status: active | current | read | archived,
          added_at, by_token, needs_review,
          meetings_considered, zero_vote_streak, shortlist_misses,
          ever_shortlisted, archive_reason, archived_at, date_read
meetings: id, date, is_practice, phase, is_current, candidate_ids[],
          shortlist_ids[], cut_short, result, archive_queue, expected_voters
ballots:  id, meeting_id, token, phase (approval|ranked), book_ids[]
          — one row per token per phase per meeting, not a JSON blob on the
          meeting row, so RLS can reason about writes per-row
club:     auto_date, date, time, host, location, location_note,
          current_book_id
```

`phase`: `lobby → approval → shortlist_review → ranked → results`

Seed data is the club's real shelf, imported from
https://oatmeal-stack.github.io/rough-drafts-book-club — 17 proposed books,
*Barbarian Days* current, *City of Thieves* previously read.

Meetings default to the **second Thursday of the month**, computed not typed
(`secondThursday()`), verified against a real calendar for 24 months including
the December rollover. The organizer can override date, time, host and location.

---

## What's stubbed — the actual remaining work

**The backend is real and live** (Supabase — schema and RLS in `supabase/`).
Books, club settings, the meeting, and ballots all read and write through
`supabase-js`, with realtime subscriptions so every phone sees phase changes
and vote counts live — no more "1 of 9" stuck forever. `MY_TOKEN` is minted
once per browser into `localStorage` and is the actual write credential for
ballots, same trust model as the organizer passcode (see below).

Setup, in order, against a fresh project: `supabase/schema.sql`, then
`supabase/seed.sql`. `supabase/patch_1.sql` and `patch_2.sql` are the
incremental fixes layered onto the project that was already running before
`schema.sql` caught up — a fresh project never needs them.

Of the original plan, done: schema + RLS from day one, `STORE` reads/writes
replaced with Supabase queries, realtime on all four tables, and the
organizer passcode checked inside a database function
(`check_organizer_code`) rather than compared in client JS. Still open:

1. **The organizer console is a `?organizer` link, not its own route.** First
   visit with `?organizer` in the URL remembers it in `localStorage`; the
   passcode is still the real gate. Splitting it onto a real separate page is
   unstarted.
2. **The admin "Books" tab is still entirely fake.** "Import from the club
   page" returns three hardcoded titles, `fuzzyMatch()` runs against a
   made-up catalogue rather than Open Library, and confirming a suggestion /
   archiving / reactivating a book only mutates the in-memory `STORE.books`
   array — nothing is written to Supabase. Right now these controls show a
   success toast and then silently lose the change on the next reload or
   realtime refresh. **Don't use them for real organizing yet** — archive
   real books by editing the `books` table directly until this is wired.
3. **Practice mode is disabled**, not wired. The old client-only
   `newMeeting(true)` swap doesn't make sense against one shared `is_current`
   meeting row — flipping it locally would either do nothing or, done naively,
   swap every real member's live ballot out from under them. Needs a real
   design (a local-only sandbox that never touches `is_current`) before it
   comes back.
4. The old "Simulate remaining voters" / "Force a cutoff pile-up" / "Reset
   meeting" dev buttons are gone — they wrote directly into the single local
   `STORE`, which doesn't exist anymore now that state lives in a shared
   database. `tests/shortlist.js` and `tests/archive_sim.js` cover the same
   ground (the fuzzed scenarios) without touching real data.
5. Later, non-blocking: feed the public club site's book lists; append a
   human-readable meeting record to a Google Doc. Neither should be a
   dependency.

---

## Tests

Four Node suites in `tests/`. They extract functions out of `index.html` by
regex and run them headlessly — no build, no test framework.

```
node tests/irv.js        # 11 — instant-runoff, incl. 4,000-election fuzz
node tests/engine.js     # 10 — tally, archiving, end-to-end meeting
node tests/shortlist.js  # 13 — the cut-short rule, 20,000-meeting fuzz
node tests/lookup.js     # 12 — Open Library parsing and failure modes
```

If you change `computeShortlist`, `runIRV`, `approvalTally`, `buildArchiveQueue`
or `lookupBook`, run these. The regexes in the harnesses are brittle by design —
if extraction fails they throw loudly rather than silently testing nothing.

---

## Gotchas already paid for

- **GitHub Pages is case-sensitive.** `INDEX.HTML` returns 404. It must be
  lowercase `index.html`. Case-only renames in git may need two commits.
- **Google Books API is unusable.** Keyless daily quota is now **zero** — every
  unauthenticated request returns 429 `RESOURCE_EXHAUSTED`. Open Library is the
  only lookup source. Don't reintroduce Google Books without an API key.
- **`file://` blocks `fetch`.** Opening `index.html` from disk breaks the book
  lookup. Serve it (`python3 -m http.server`) when testing locally.
- **Open Library jackets take ~750ms** and redirect to archive.org. They load,
  they're just slow — don't mistake a slow paint for a broken URL.
- **Amazon `/dp/` needs an ISBN-10.** A 13-digit ISBN 404s. The lookup picks a
  10 where available and falls back to an Amazon search otherwise.
- Uploading from Windows can mangle filenames (`index ~1.html`). Check the name
  after every upload.

---

## Brand

Navy `#0E1A2B`, gold `#C2902E`, cream `#F6F2EC`. Source Serif 4 for display,
Inter for UI. The logo is the owner's artwork, embedded as a data URI — it is
drawn for a light background, so headers carrying it are cream, not navy.

Gold on cream is about 3.5:1, fine for rules and large type but too weak for
small text; small gold labels use `#7A5A16`.

---

## Style notes

Mobile first, large tap targets, very little text. Warm and plain-spoken — the
copy should sound like a person, not an election system. Members should need no
explanation: scan, select, submit, wait, rank, submit, see the winner, put the
phone away.
