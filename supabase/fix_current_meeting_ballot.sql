-- PRE-MEETING FIX for the 2026-09-10 meeting. Run this before Thursday.
--
-- The current meeting row was created on 2026-08-14 and its candidate_ids
-- has been frozen since. Two things drifted underneath it:
--
--   1. Five entries point at books that were DELETED afterwards
--      (bku9jcy56, bkyzoqff2, bkxkbdfgd, bkbkvf4di, bkcm6u1z8). book(id)
--      returns undefined for these, and both the approval grid and
--      buildArchiveQueue() dereferenced it — so opening Phase One would have
--      rendered a blank ballot on every member's phone, and publishing the
--      results would have failed too. index.html now guards both paths, but
--      the data still needs cleaning: a ballot should not carry ghosts.
--
--   2. Eight entries are the books archived by the low-vote cull on
--      2026-09-04. They are not deleted, so they would have rendered
--      normally — as fully votable candidates, quietly undoing the cull the
--      same month it was applied.
--
-- Resetting candidate_ids to exactly the active shelf fixes both. New
-- suggestions keep joining normally afterwards: the meeting is in 'lobby',
-- and add_candidate_if_lobby appends to this same array.
--
-- Also corrects the meeting's own date (2026-08-14 -> 2026-09-10). Members
-- never see it — the club table drives every member-facing date — but it
-- shows in the organizer console header and in the meeting record.

update meetings
   set candidate_ids = (
         select coalesce(array_agg(id order by added_at, id), '{}')
           from books
          where status = 'active'
       ),
       date = date '2026-09-10'
 where is_current = true;

-- Verify: expect 20 candidates, every one of them an active book, and no
-- active book left off the ballot. Both counts on the right should be 0.
select
  cardinality(m.candidate_ids)                                    as candidates,
  (select count(*) from books where status = 'active')            as active_books,
  (select count(*) from unnest(m.candidate_ids) c
     where c not in (select id from books where status = 'active')) as ghosts_or_archived,
  (select count(*) from books b where b.status = 'active'
     and not (b.id = any(m.candidate_ids)))                       as active_not_on_ballot
from meetings m
where m.is_current;
