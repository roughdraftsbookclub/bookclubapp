-- Drop three books, pin Pompeii. 2026-10-10.
--
-- Chesapeake, Space and The Right Stuff go back off the shelf. All three were
-- added this morning without a pinned edition and all three are on November's
-- ballot, so they have to come OFF the ballot as well as out of the books
-- table. Deleting the row alone would leave three ids in candidate_ids
-- pointing at nothing — the exact ghost state that blanked the ballot before
-- the September meeting. index.html survives it now, but the ballot count
-- would still be wrong and the data dirty. Ballot first, then the rows.
--
-- Pompeii was suggested by a member on the 9th with nothing but a title and
-- author. It's now pinned to the organizer's link: Random House Trade
-- Paperbacks reprint, 304 pages. The ISBN-13 computed from the ISBN-10
-- matches what Amazon lists (9780812974614). Cover fetched and checked by
-- eye. first_publish_year is 2003, the novel, not this 2005 reprint.
--
-- Note on the link: its visible text ended 081297461 — nine digits, not a
-- valid ISBN-10. The underlying href was 0812974611, which checksums, and
-- that is what's used here.

-- 1. Off the ballot first -------------------------------------------------
update meetings m
   set candidate_ids = array(
         select unnest(m.candidate_ids)
         except
         select id from books where title in ('Chesapeake', 'Space', 'The Right Stuff')
       )
 where m.is_current;

-- 2. Then the rows. delete_book's own rule is active/archived only, which
-- these are; the schedule foreign key would block anything ever discussed.
delete from books
 where title in ('Chesapeake', 'Space', 'The Right Stuff')
   and status = 'active';

-- 3. Pompeii ---------------------------------------------------------------
update books set
  author             = 'Robert Harris',
  isbn               = '0812974611',
  isbn13             = '9780812974614',
  cover_url          = 'https://m.media-amazon.com/images/I/61WHiS5vrRL._SL500_.jpg',
  cover_large        = 'https://m.media-amazon.com/images/I/61WHiS5vrRL._SL1500_.jpg',
  amazon             = 'https://www.amazon.com/dp/0812974611',
  page_count         = 304,
  first_publish_year = 2003,
  description        = 'Historical fiction set in the days before the eruption of Mount Vesuvius in AD 79, told through Marcus Attilius, the aquarius responsible for the Aqua Augusta — the aqueduct serving the towns around the bay. Sent to investigate why the water has failed, he finds his predecessor missing and the mountain behaving strangely.',
  needs_review       = false
where title = 'Pompeii';

-- Verify: active books and ballot size should match at 14, no ghosts, and
-- Pompeii complete.
select
  (select count(*) from books where status = 'active')                 as active_books,
  (select cardinality(candidate_ids) from meetings where is_current)   as ballot_size,
  (select count(*) from meetings m, unnest(m.candidate_ids) c
     where m.is_current and c not in (select id from books))           as ghost_ids,
  (select page_count from books where title = 'Pompeii')               as pompeii_pages;
