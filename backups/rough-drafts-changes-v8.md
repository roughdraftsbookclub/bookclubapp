# Rough Drafts — Change Brief v8

Supersedes v7. Now grounded in the real Aug 13 Round 1 tally. Eight changes.

**Read §7 first.** The Aug 13 vote is five picks short of a full room — one
member's ballot appears not to have landed. Everything else can wait.

The voting *method* stays deferred, but the section at the end now carries a
confirmed finding: Round 1 is statistically indistinguishable from random, and
the app's existing floating 4–8 cut is the right response to that.

**Guiding constraint, unchanged:** the app takes a few minutes of the meeting
and gets out of the way. No accounts, no logins. Nothing below may add a tap
to the live voting flow.

**Organizing principle:** §5 (the meeting schedule) is a data table, and §6
(the submission window) is computed from it. Build the schedule first — three
other features hang off it.

> **Note for implementation: the club meets on the second _Thursday_, not
> Tuesday.** Every date below is a Thursday — verified. Worth stating
> explicitly so nothing gets built against the wrong weekday.

---

## Confirmed schedule

All ten meetings are the **second Thursday** of their month. Verified.

| Date | Host |
|---|---|
| Thu Sep 10, 2026 | David Tayloe |
| Thu Oct 8, 2026 | Ken Wilkins |
| Thu Nov 12, 2026 | Tom Wilson |
| Dec 2026 | *Off for Christmas* |
| Thu Jan 14, 2027 | John Robert |
| Thu Feb 11, 2027 | open |
| Thu Mar 11, 2027 | open |
| Thu Apr 8, 2027 | open |
| Thu May 13, 2027 | open |
| Thu Jun 10, 2027 | open |
| Thu Jul 8, 2027 | open |

**Seed these as rows; don't compute them from the rule.** The second-Thursday
rule does hold now — but you need a row per meeting regardless, to hang the
host and the discussed book off. Once the row exists, generating the date is
solving a problem you don't have, and December still has to be an exception.
Rows are cheaper than rules plus an override table.

**Do** use the rule as a convenience: a helper that proposes the next twelve
second Thursdays for the organizer to approve via the edit link (§4), so the
schedule never runs dry past Jul 2027. Next six after that: Aug 12, Sep 9,
Oct 14, Nov 11, Dec 9 (2027), Jan 13 (2028).

---

## Confirmed history

| Meeting | Book discussed | How it was chosen |
|---|---|---|
| Thu Jul 9, 2026 | City of Thieves | Organizer pick — no vote. First-ever meeting; the club didn't exist yet. |
| Thu Aug 13, 2026 | Barbarian Days | Voted at the Jul 9 meeting |
| Thu Sep 10, 2026 | *East of Eden* — current book | Voted Aug 13 — first vote run in the app |

**The rule this confirms:** a winner is discussed at the *following* meeting.
So a previously-read entry's date is populated when that meeting **completes**,
not when the vote is won. Barbarian Days won Jul 9 and was discussed Aug 13;
East of Eden won Aug 13 and gets discussed Sep 10.

**Store and show one date only: `discussed_date`.** The vote date isn't
displayed anywhere and doesn't need storing — for any voted book it's just the
meeting before the discussion, derivable from the schedule if it's ever wanted.

The one thing the model still needs: **City of Thieves has no winning vote at
all.** It was a seed pick. So allow a previously-read book with a discussion
date and no vote history — one nullable provenance flag (`voted` / `seed
pick`) covers it. Without that, the very first row in the club's history
breaks the schema.

Home page on Sep 11 shows three previously-read books: City of Thieves
(Jul 9), Barbarian Days (Aug 13), East of Eden (Sep 10).

---

## 1. Book title font size +15%

- Change it in **one place** — a CSS custom property or theme token, not per
  component. Refactor to a single `--book-title-size` first if needed.
- Applies everywhere a title renders: shelf, shortlist, ranking, winner,
  previously-read.
- **Check before shipping:** longest title on the 27-book shelf at 375px
  viewport. Confirm the grid doesn't reflow and truncation still lands clean.
  The ranking screen matters most — that's where people are actually reading.

---

## 2. Book detail page

Cover, title, author, first publication year, page count, description, buy link.

**Not in the live voting flow.** On the Round 1 screen, tapping a cover stays
what it is today: the vote. Detail is reachable when browsing the shelf
*between* meetings. Once voting opens, the grid switches to fast tap-to-vote
and detail navigation is suppressed. One screen, two modes.

### Metadata source: Open Library

```
Search:   https://openlibrary.org/search.json?q=<title>&limit=5&fields=key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,edition_key
Work:     https://openlibrary.org/works/OL…W.json          → description
Editions: https://openlibrary.org/works/OL…W/editions.json
Cover:    https://covers.openlibrary.org/b/id/<cover_i>-L.jpg
```

- **`description`** lives on the *work*, not in search results — second
  request. Returns either a plain string **or** `{type, value}`. Handle both
  or it breaks intermittently. Frequently absent entirely; see §4.
- **Publication year:** use `first_publish_year` (original publication), not
  the edition's. *East of Eden — 1952* is the interesting fact; *2002, Penguin
  reprint* is noise.
- **Page count:** from the edition the suggester picked (§3). Fall back to
  `number_of_pages_median` if no edition was pinned.
- **Covers: use `cover_i`, not the ISBN.** ISBN cover lookups are rate-limited
  to 100 requests per IP per 5 minutes and 403 past that. 27 books × 11 phones
  reaches it. Cover-ID lookups aren't limited.
- Set a descriptive `User-Agent` (project name + contact email).

**Cache everything at suggestion time** onto your own book record. Never call
Open Library on page render — 11 phones hitting their API mid-meeting is how
the shelf goes blank at the worst possible moment.

**Verify first:** openlibrary.org couldn't be reached from the drafting
environment. Their docs only explicitly name `key`, `title`, `author_name`,
`first_publish_year`, `cover_i` as `fields=` values. Run one live query and
check the response shape before writing the parser.

---

## 3. Edition picker at suggestion time

The bad Amazon links were never a link-generation bug — the search resolved to
the wrong edition. Same root cause corrupts page count and pub date.

**The suggester picks the edition.** After they type a title, show 2–4
candidate editions — cover thumbnail, publisher, year, page count — and they
tap one. One extra tap, at suggestion time, between meetings, when nobody's in
a hurry. Moves the correction burden onto the person who actually knows which
book they meant.

Keep it light:
- Show covers, not text rows. Picking the right book is a visual judgment.
- Rank editions that **have a cover and a page count** first.
- If only one plausible edition comes back, skip the picker entirely.
- Let them bail. "None of these / not sure" takes the best guess and moves on.
  Never trap someone in a disambiguation screen over a book club pick.

### Build the link from the chosen edition's ISBN

1. Store ISBN-10 **and** ISBN-13 on the book record.
2. Link is `https://www.amazon.com/dp/<isbn10>`. For books with a 10-digit
   ISBN, **the ASIN is the ISBN-10** — lands on the exact book, not a search.
3. ISBN-13 starting `978`, no ISBN-10? Convert: drop `978`, take the next 9
   digits, recompute the ISBN-10 check digit (weights 10→2, mod 11, remainder
   10 → `X`). Deterministic; verified against four known pairs.
4. `979` prefix (no ISBN-10 exists) or no ISBN at all → fall back to
   `https://www.amazon.com/s?k=<isbn13>`. Search-by-ISBN beats search-by-title
   by a wide margin.
5. **Never fall back to a bare title string.** That's the current failure mode.

Kindle editions carry their own ASINs unrelated to the ISBN. Print only.

---

## 4. Email the organizer on each new suggestion

With §3 in place this is **notification, not a chore** — a glance, not a
correction pass. The edit link stays as a safety net for when the suggester
picks wrong or Open Library has nothing.

**Email contains:** cover thumbnail, title, author, pub year, page count, which
edition the suggester picked, the description (or a clear **"no description
found"** flag), the Amazon link as a clickable link, which ISBN it used and
whether it's `/dp/` or the search fallback — so a bad link is diagnosable at a
glance — and an edit link.

### Edit link without breaking "no accounts"

Long unguessable token in the URL, opening a small form: title, author,
description, page count, pub year, Amazon URL, plus host assignments and
schedule rows (§5). No login, no password, no account system.

**But that URL is now an admin credential.** It must never land in the group
text. Keep it out of every shared view and never render it inside the app.

### Two rules that keep you off the critical path

1. **A book never waits on review.** It goes on the shelf immediately with the
   metadata the suggester picked. Review is a correction pass, not a gate.
2. **Batch if it gets noisy.** One email per suggestion is fine at your volume.
   If not, switch to a digest when the window closes Sunday night.

**Open question:** what sends the mail? Depends on your stack — serverless
function (Netlify/Vercel) plus Resend or Postmark is typical; Supabase or
Firebase would use a DB trigger. Tell Claude Code what the app runs on. Don't
SMTP from the client.

---

## 5. Home page: previously read + upcoming schedule

### 5a. Previously read

Cover, title, author, **and the date of the meeting where it was discussed** —
that date only, no vote date (see the history table above, and note that City
of Thieves has no vote behind it).

### 5b. Upcoming meetings + host signup

Render the schedule table. Each row: date, host name, or an **open slot**.

- **Empty slots are claimable.** Tap → type your name → done. No account.
- **Filled slots are not editable in-app.** Claim-only-if-empty prevents the
  obvious failure: a fumbled tap wiping David Tayloe off Sep 10. Changes and
  cancellations go through the organizer edit link (§4).
- **Show December as a row** — "Off for Christmas," no date, not claimable.
  People need to see *why* there's a gap, not just find one.
- Highlight the next meeting. That's what anyone opening the page is looking
  for.
- Consider emailing the organizer on host claims too. Same plumbing as §4.

---

## 6. Submission window opens and closes automatically

- **Closes:** 11:59 PM the **Sunday before** the next meeting.
- **Opens:** 9:00 PM on the **night of** a meeting — so people can suggest
  while the conversation's still fresh.

**Derive both from the §5 meeting rows**, not from a weekly cadence and not
from the second-Thursday rule. December has to fall out of the data, not out
of exception logic.

| Meeting | Suggestions close |
|---|---|
| Thu Sep 10, 2026 | Sun Sep 6, 11:59 PM |
| Thu Oct 8, 2026 | Sun Oct 4, 11:59 PM |
| Thu Nov 12, 2026 | Sun Nov 8, 11:59 PM |
| Thu Jan 14, 2027 | Sun Jan 10, 11:59 PM |
| Thu Feb 11, 2027 | Sun Feb 7, 11:59 PM |
| Thu Mar 11, 2027 | Sun Mar 7, 11:59 PM |
| Thu Apr 8, 2027 | Sun Apr 4, 11:59 PM |
| Thu May 13, 2027 | Sun May 9, 11:59 PM |
| Thu Jun 10, 2027 | Sun Jun 6, 11:59 PM |
| Thu Jul 8, 2027 | Sun Jul 4, 11:59 PM |

**December handles itself**, which is the whole point of deriving it: Nov 12
opens the window at 9 PM, it stays open across the entire holiday stretch, and
closes Sun Jan 10 ahead of the Jan 14 meeting. No special case, no dead
period, and people can suggest books over Christmas break.

### Three things that will bite

1. **Pin one club timezone as a constant.** Never use the device clock.
   "11:59 PM Sunday" has to mean the same instant for a member traveling in
   another zone as for someone at home. Set it once, use it everywhere.
2. **Compute the state, don't schedule a job.** Deriving open/closed from the
   current time on each page load has no failure mode. A cron firing at 9 PM
   has several, and it fails silently on the one night everyone's using the
   app.
3. **Say why it's closed, not just that it is.** "Suggestions reopen after
   Thursday's meeting" beats a greyed-out button. Same in the open state —
   show the deadline: "Suggestions close Sunday at 11:59 PM."

This replaces the old rule that suggestions locked when voting opened. The
shelf now freezes the Sunday before, so the slate is settled for four days
before anyone votes.

---

## 7. Attendance count — organizer sets it, screens follow

The voting screens read `x/9 members voted`. The 9 is hardcoded. Eleven people
were there last night.

### ⚠️ Before building the button: audit every use of that constant

The wrong label is the visible symptom. The question that matters is **what
else reads that 9**. Three places it may be wired in, in increasing order of
severity:

1. **The "x of N voted" label.** Cosmetic. This is what you noticed.
2. **Round-advance / "everyone's in" detection.** If the app waits for 9
   ballots before moving on, it advanced after 9 of 11 last night — two people
   may have been cut off mid-vote. Inverted, with 8 present it would hang
   forever waiting for a 9th that never comes.
3. **The instant-runoff majority threshold.** This is the one that can change
   an outcome. If majority was computed as "more than half of 9" (5) instead
   of against the real ballot count, a book could be declared the winner one
   vote early.

### 🔴 The Aug 13 Round 1 tally is 5 picks short of a full room

**Total votes cast: 50. Exactly ten 5-pick ballots.** Eleven people were
present. One member's ballot appears never to have landed.

That is the single most likely real-world consequence of the hardcoded 9, and
it's worth chasing before anything else: did someone abstain, run out of picks,
or did the app stop accepting ballots after the 9th or 10th? Check the stored
Round 1 ballot records against the eleven attendees by name.

**The majority threshold probably did *not* flip the winner.** With 8
shortlisted books and top-3 rankings, roughly 18% of ballots exhaust by the
final three, leaving about 8 live of 10 — a true majority of 5. A hardcoded 9
also yields 5. The two agree, so East of Eden's win most likely stands. The
missing eleventh ballot is the more troubling finding.

### The subtle part: attendance is not the majority denominator

These are two different numbers, and the hardcoded 9 is currently doing both
jobs. Separate them:

- **Attendance** (organizer-set) drives the *display* only: "7 of 11 have
  voted." It answers "are we waiting on anyone?"
- **The IRV majority threshold** must be computed per round against
  **continuing ballots** — ballots that still have an unexhausted preference.
  With top-3 rankings out of an 8-book shortlist, ballots *do* exhaust: after
  five eliminations, someone whose three picks are all gone has no vote left
  to transfer. Their ballot must drop out of the denominator, or you're
  requiring a majority of people who are no longer voting, and the count can
  stall with no book ever reaching the threshold.

Using attendance as the majority denominator is just a different wrong answer
from using 9. The denominator shrinks each round, and it has to be recomputed
each round.

### The control itself

- Lives on the organizer view, reachable by the same token as §4 — but it
  needs to be **one tap from opening the app**, not buried in an email. It's
  used standing up, in a living room, with people waiting.
- **A +/- stepper, not a text field.** Big tap targets, range roughly 5–20.
  Nobody should be summoning a numeric keyboard to type "11."
- **Editable at any time, including mid-vote.** People arrive late. Changing
  it must push to every phone live through the existing sync — the same way
  vote counts already do — with no refresh.
- **Prefill with the last meeting's attendance** so the common case is confirm,
  not enter.
- **Validate the obvious contradiction:** if ballots cast exceeds attendance,
  show the organizer a quiet warning. Twelve ballots against an attendance of
  11 means either the count is wrong or something odder is going on, and it's
  worth surfacing at the time rather than discovering it in the data later.
- **Store attendance on the meeting record.** It's genuine club history, it
  prefills next month, and it's what lets you sanity-check a past result.

### While you're in there

The original design targeted 9 voters and ~17 books. Last night was 11 and 27.
Any other constant sized to those original numbers — shortlist cut thresholds,
the 5-book interest-vote cap, archive rules — deserves the same look. Ask
Claude Code to grep for hardcoded numbers in the voting logic and list what it
finds, rather than fixing only the one that surfaced.

---

## Suggested build order

1. **Audit the hardcoded 9** (§7) — before anything else. Read-only, fast, and
   it tells you whether last night's result stands.
2. **Attendance control + majority-threshold fix** (§7).
3. **Meeting schedule table** (§5) — seed the rows, including the two
   completed meetings. §6 and the home page both depend on it.
4. **Submission window** (§6) — pure derivation off §5; no new UI beyond state
   messaging.
5. **Ingestion rewrite** (§2 metadata + §3 edition picker) — one pass.
   Backfill the 27 existing books; that's your test data and your first honest
   look at how bad the current metadata is.
6. **Email + edit link** (§4).
7. **Home page sections** (§5a, §5b).
8. **Detail page** (§2 UI) — needs real metadata to render.
9. **Font bump** (§1) — trivial. Ship it first for a quick win if you want.

## Deferred — voting method review

**Do not change the voting method as part of this batch.** Fix the denominator
(§7) so the current method is computed correctly, then revisit the method
itself as its own decision with a month of clean data behind it. Notes for
when that happens:

**The problem to solve.** Top-3 rankings out of an 8-book shortlist means
ballots exhaust — after five eliminations, some voters have no live preference
left. Handled correctly this is fine and normal. Handled wrong it stalls the
count or picks a winner early.

**Option A — keep top-3, fix the math.** Recompute the majority threshold each
round against continuing ballots. This is what real IRV implementations do;
exhaustion is expected behavior, not a defect. No change to the member
experience. This is what §7 specifies and it should ship first regardless.

**Option B — rank all 8.** Removes exhaustion entirely; the denominator stays
11 all the way down. But it asks people to rank eight books on a phone in a
living room, and the bottom half of those rankings is invented. Nobody has a
real preference between their 6th and 7th choice, and under instant-runoff
those manufactured preferences are exactly the ones that decide late rounds.
It fixes the arithmetic by degrading the input.

**Option C — shrink the shortlist to 4–5 and rank all of it.** ~~Probably the
strongest of the three.~~ **Dead on arrival against the real data.** The Aug 13
tally has no 4–5 book cut available at any threshold:

| Threshold | Books advancing |
|---|---|
| ≥ 4 votes | **3** |
| ≥ 3 votes | **8** |
| ≥ 2 votes | 16 |
| ≥ 1 vote | 23 |

The tiers jump 3 → 8 → 16. Getting to four books means breaking a three-way tie
at 4 votes *and* a five-way tie at 3. There's no clean line there to find.

---

### The finding that reframes all three options

Round 1 last night produced **no measurable consensus signal.** Simulation
against the reported numbers (top book 4 votes of 11, four books at zero,
27 books, 5 picks each):

| | Observed | Pure random tapping |
|---|---|---|
| Top book's votes | 4 | **4.9 average** (5th–95th pct: 4–6) |
| Zero-vote books | 4 | 2.8 average |
| Tie at a top-4 cut | "lots" | **71% of the time** |

The top vote-getter scored *below* what 11 people tapping at random would
produce. Whatever Round 1 measured, it is not distinguishable from noise.

**Confirmed against the real Aug 13 tally.** Full distribution: 3 books at 4
votes, 5 at 3, 8 at 2, 7 at 1, 4 at 0. Against a null model of 10 voters
tapping 5 books at random over 27:

| Votes | Observed | Expected under pure randomness |
|---|---|---|
| 0 | 4 | 3.5 |
| 1 | 7 | 7.9 |
| 2 | 8 | 8.1 |
| 3 | 5 | 4.9 |
| 4 | 3 | 2.0 |
| 5+ | 0 | 0.6 |

Chi-square goodness-of-fit: **0.05 on 2 df** (5% critical value 5.99). The
observed distribution is all but identical to random.

**This does not mean members voted carelessly.** It means the club has no
*shared* preference. Ten men with genuinely different tastes each picking five
favourites from twenty-seven produce exactly this much overlap by chance. The
signal is absent because consensus is absent — which is a fact about the club,
not a defect in the app.

**If it holds, three things follow:**

1. **Ties are not a cut-point problem.** Simulated boundary-tie rates run
   60–85% at cuts of 4, 5, 6, *and* 8, across caps of 5, 7, 9, and 12. Moving
   the cut doesn't avoid ties; nothing avoids ties. With 11 voters, counts are
   integers 0–11, and 27 books crammed into that range collide everywhere.
   **Stop designing to prevent ties. Design a rule for resolving them.**
2. **Round 1's job is smaller than assumed.** It cannot pick the best books —
   there's no signal to pick with. Its only real job is cheaply narrowing 27 to
   something rankable *without cutting anything anyone loves*. The Round 2
   runoff does the actual selecting. That reframing dissolves most of the
   anxiety about where the line falls.
3. **The floating 4–8 cut already in the app is the right design. Keep it.**
   It advances everything above a natural break rather than a fixed top-N, so
   ties resolve themselves — tied books ride through together. On Aug 13 it
   landed on ≥3 votes and returned exactly 8 books with a clean gap below.
   Simulation says a 4–8 floating window finds a workable break **82% of the
   time** even against pure noise. Nothing proposed here improves on it.

   The only gap: what happens the other 18% of the time. Define the fallback
   now rather than during a meeting — either let the shortlist overflow past 8,
   or break the tie with a ten-second tap among the tied books. At that point
   you're separating books the group finds genuinely indistinguishable, so a
   coin flip is defensible and quick.

### Why the signal is thin, and the two levers on it

11 voters × 5 picks = 55 votes across 27 books ≈ 2.0 per book, versus ≈3.2 when
the shelf was 17. The shelf grew; the cap didn't. Under the same null model:

| Change | Top book (random) | Zero-vote books (random) |
|---|---|---|
| Today: 27 books, cap 5 | 4.9 | 2.8 |
| Prune to 16 books, cap 5 | 6.4 | 0.3 |
| Keep 27 books, cap 9 | 6.9 | 0.3 |

Either lever roughly doubles the resolution of the scale, giving real
preferences room to rise above the noise floor. A cap of about **shelf ÷ 3** is
a reasonable rule — it holds the density steady as the shelf grows instead of
silently diluting every year.

Pruning is likely worth doing on its own merits regardless: 27 books is a lot
to browse on a phone, and four of them nobody voted for at all.

**And check the bottom of the shelf.** Three of the four zero-vote titles are
category romance — *By Love Undone* (Enoch), *Warrior's Woman* (Lindsey),
*His Darkest Embrace* (Stone) — sitting in a shelf that otherwise runs
Steinbeck, O'Brian, McMurtry, Conroy, Le Guin. That's not a taste signal;
that's almost certainly leftover test data, a bad import, or someone having a
laugh. Whatever they are, they're diluting every Round 1 average and they need
a delete path. Worth confirming there's a way to remove a book at all — the
edit link (§4) is the natural home for it.

*(The fourth, Hitchhiker's Guide at zero, looks like a genuine miss. Which is
its own small mystery.)*

Collect one more meeting of clean ballot data — after the §7 denominator fix —
before committing to any of this.

## Still open, not in scope

Post-read ratings/reviews, suggestion history, pruning the shelf given the four
zero-vote books, how the ranking screen felt to use.

---

## Sources

- [Open Library Search API](https://openlibrary.org/dev/docs/api/search)
- [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers) — rate limits
- [Amazon Standard Identification Number](https://en.wikipedia.org/wiki/Amazon_Standard_Identification_Number) — ASIN = ISBN-10 for books
