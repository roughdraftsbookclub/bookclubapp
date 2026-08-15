# Rough Drafts Book Club App — for discussion

I run a book club (9-11 friends, in person, monthly). I built a small app with
Claude that runs the voting. I want to talk through ideas for changes — no
code yet, just discussion. Here's how it works and how it actually performed
at last night's real meeting.

## The idea

The app is not the book club — it should take a few minutes of the meeting
and then get out of the way. No accounts, no logins. Someone texts a link,
people tap it, vote, done.

## How a meeting works

1. **Suggest.** Anytime between meetings, anyone can suggest a book (just a
   title — search finds the cover/author automatically). It goes straight on
   the shelf. Suggestions lock the moment voting opens for the night.
2. **Round 1 — Interest vote.** Everyone picks up to 5 books they'd enjoy
   reading, out of everything on the shelf. Approval voting, not ranking.
3. **The shortlist.** The books with the most interest votes move to Round 2
   — usually 5 to 8 of them, not a fixed number. It's cut wherever the vote
   counts naturally break, so nobody has to eyeball a tie.
4. **Round 2 — Ranked runoff.** Everyone ranks their top 3 of the shortlist.
   Instant-runoff: lowest vote-getter is eliminated each round, their votes
   move to voters' next choice, repeat until someone has a majority.
5. **Winner.** That book becomes "this month's book." The old current book
   moves to "previously read." Books that keep getting zero interest, or keep
   missing the shortlist, eventually get archived off the active shelf.

Everyone's vote is anonymous — no names anywhere, not even to the organizer.

## Last night's real meeting (2026-08-13) — first real run

- 27 books on the shelf, 11 people voted (bigger and smaller than the
  numbers I originally designed around — 9 voters, ~17 books)
- Round 1: votes ranged 0-4. Four books got zero interest votes at all.
- 8 books advanced to Round 2 (near the top of the usual 5-8 range)
- Round 2 took 6 rounds of instant-runoff to settle — several rounds needed
  a tiebreak for last place, resolved automatically, never shown to anyone
  as a "decision" to make
- Winner: *East of Eden* by John Steinbeck, won with a clean majority in the
  final round
- No genuine tie for the actual win this time, though I know from testing
  that at this ratio of books-to-voters it's a real possibility most months
  (roughly 1 in 9), not a rare edge case
- Everything ran live on people's own phones, votes synced in real time,
  nobody needed to refresh or ask "did that go through"

## What I want to think through next

(fill in what's actually on your mind — a few ideas, not commitments:
book rating/reviews after reading, a lighter way to see suggestion history,
whether the shelf needs pruning given tonight's four zero-vote books, anything
about how the ranking screen felt to use)
