-- Pre-meeting fixes for tonight, Thursday 12 November 2026.
-- Everything below was found by reading the live database read-only.
-- Run the whole file; each block is independent and safe to re-run.

-- =========================================================================
-- 1. Born to Run — the book added on the 9th. Metadata is wrong.
-- =========================================================================
-- A member suggested it on 2026-11-09 and it IS already on tonight's ballot
-- (add_candidate_if_lobby did its job), so nothing needs adding. But Open
-- Library merged two different books called "Born to Run" into one work
-- record, exactly the contamination already documented for Bernard Beckett:
--
--   author stored as "Bruce Springsteen, Michael Morpurgo" — Morpurgo wrote
--   a completely different children's book of the same name.
--   first_publish_year stored as 1975 — that is the ALBUM. The memoir is 2016.
--
-- The edition itself is right and was verified: the member's a.co link
-- resolves to amazon.com/dp/150114152X, which is the stored ISBN, it is a
-- live product page, and 528 pages matches the Simon & Schuster memoir.
-- Only the two contaminated fields change.
--
-- Members can see the wrong author and year on the shelf right now.
update books
   set author             = 'Bruce Springsteen',
       first_publish_year = 2016,
       needs_review       = false
 where id = 'bk99jbkpd';

-- =========================================================================
-- 2. Dune and The Godfather are active but NOT on tonight's ballot
-- =========================================================================
-- Both are status 'active' with covers and full metadata, and both appear on
-- the "Books under consideration" screen — members will see 20 books there
-- but would only be able to vote on 18. Neither was ever archived
-- (archived_at and archive_reason are both null), so this is the ballot
-- drifting from the shelf rather than a deliberate cull.
--
-- This changes tonight's ballot from 18 books to 20, so it is your call —
-- but the alternative is a shelf screen that disagrees with the ballot.
--
-- Mirrors add_candidate_if_lobby: only while the lobby is open, and never
-- adds a duplicate.
update meetings m
   set candidate_ids = m.candidate_ids || array['bk13','bk11']
 where m.is_current
   and m.phase = 'lobby'
   and not ('bk13' = any(m.candidate_ids))
   and not ('bk11' = any(m.candidate_ids));

-- =========================================================================
-- 3. Tonight's venue — the address is still empty
-- =========================================================================
-- supabase/set_november_host_venue.sql was written last week but never run:
-- the schedule row and the club row both still have an empty location, so
-- the home screen shows the date and host with no address. The app now turns
-- this into a tappable maps link once there is an address to point at.
update schedule
   set location      = 'Eastern Carolina Yacht Club',
       location_note = '4005 Trent Pines Dr, Trent Woods, NC 28562'
 where meeting_date = '2026-11-12';

update club
   set location      = 'Eastern Carolina Yacht Club',
       location_note = '4005 Trent Pines Dr, Trent Woods, NC 28562'
 where date = '2026-11-12';

-- =========================================================================
-- 4. The meeting row still says 2026-10-09
-- =========================================================================
-- Cosmetic but confusing: the organizer console header reads
-- "Meeting · 2026-10-09" all night, and that date is what the record carries.
-- It does NOT affect which schedule row the winner attaches to —
-- publish_results uses the earliest still-undecided row, which is correct
-- either way (November already has its book, so tonight's winner goes to
-- 14 January; December is skipped).
update meetings
   set date = '2026-11-12'
 where is_current;

-- =========================================================================
-- Verify
-- =========================================================================
select
  (select count(*) from books where status = 'active')                        as active_books,
  (select cardinality(candidate_ids) from meetings where is_current)          as ballot_size,
  (select count(*) from meetings m, unnest(m.candidate_ids) c
     where m.is_current and c not in (select id from books))                  as ghost_ids,
  (select date from meetings where is_current)                                as meeting_date,
  (select phase from meetings where is_current)                               as phase,
  (select expected_voters from meetings where is_current)                     as expected_voters,
  (select author from books where id = 'bk99jbkpd')                           as born_to_run_author,
  (select first_publish_year from books where id = 'bk99jbkpd')               as born_to_run_year,
  (select location from club where date = '2026-11-12')                       as venue;

-- active_books and ballot_size should both read 20, ghost_ids 0.
