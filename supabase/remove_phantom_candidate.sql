-- Remove the phantom candidate 'nope' from the current meeting's ballot.
--
-- MY FAULT, not a member's. On 2026-11-22 I probed which RPCs were deployed
-- by calling each one with dummy arguments. For add_candidate_if_lobby I
-- passed p_book_id = 'nope' and read the 204 as "harmless no-op". 204 means
-- the call SUCCEEDED — the function appended 'nope' to candidate_ids on the
-- then-current meeting, and that row is still current (2026-11-13, lobby).
--
-- Impact is small but real: the approval grid and buildArchiveQueue both skip
-- candidates with no matching book (the guard added after the September
-- blanking, tests/engine.js C5), so nothing crashes. But the ballot carries
-- 15 ids for 14 real books, and any count taken off candidate_ids is one too
-- many.
--
-- This is precisely the "candidate_ids is a frozen snapshot and drifts away
-- from books" gotcha in CLAUDE.md, arrived at from a new direction: a write
-- that was only ever meant to be a liveness check.
--
-- Lesson worth keeping: probe a mutating RPC with arguments that fail the
-- function's OWN guard (a bad passcode), never with plausible-looking data.
-- A 2xx from a mutating endpoint is evidence it mutated.

update meetings
   set candidate_ids = array_remove(candidate_ids, 'nope')
 where is_current;

-- Verify: expect 14 candidates, 0 ghosts.
select date,
       phase,
       cardinality(candidate_ids) as ballot_size,
       (select count(*) from books where status = 'active') as active_books,
       (select count(*) from meetings m2, unnest(m2.candidate_ids) c
          where m2.is_current and c not in (select id from books)) as ghost_ids
  from meetings
 where is_current;
