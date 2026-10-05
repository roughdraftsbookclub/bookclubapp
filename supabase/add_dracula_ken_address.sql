-- Ken's full address, and Dracula onto the shelf. 2026-10-04.
--
-- The address could also be set in the organizer console's new Schedule tab,
-- and Dracula added with its "paste an Amazon link" panel. Doing both in SQL
-- here only because it was asked for directly; neither needs SQL any more.
--
-- On Dracula's numbers: the ISBN-13 computed from the ISBN-10 matches what
-- Amazon lists exactly (9780141439846). Page count is Amazon's 560 for this
-- Penguin edition, not Open Library's 466, which is a different printing.
-- The description is written fresh -- OL's work description for Dracula is
-- in Portuguese -- and is a plain summary rather than jacket copy.
-- first_publish_year is 1897, the novel, not this 2003 reissue.

-- 1. Ken Wilkins' address ---------------------------------------------------
update schedule
   set location      = '223A Middle Street, New Bern, NC',
       location_note = null
 where meeting_date = date '2026-10-08';

-- Mirror it onto the home screen, which is pointing at this meeting.
update club c set
  location      = s.location,
  location_note = coalesce(s.location_note, '')
  from schedule s
 where s.meeting_date = date '2026-10-08' and c.id = true and c.date = s.meeting_date;

-- 2. Dracula ---------------------------------------------------------------
insert into books (
  id, title, author, isbn, isbn13, cover_url, cover_large, amazon,
  c1, c2, glyph, status, added_at, by_token, needs_review,
  description, page_count, first_publish_year
) values (
  'bkz8c4n6t', 'Dracula', 'Bram Stoker',
  '014143984X', '9780141439846',
  'https://m.media-amazon.com/images/I/71lhU-dnJeL._SL500_.jpg',
  'https://m.media-amazon.com/images/I/71lhU-dnJeL._SL1500_.jpg',
  'https://www.amazon.com/dp/014143984X',
  '#8C3B2E', '#3E1610', '📖',
  'active', current_date, null, false,
  'Bram Stoker''s 1897 novel, told through letters, diary entries and newspaper clippings. A young solicitor travels to Transylvania to close a property sale with Count Dracula, and slowly realises what his host is. The Count reaches England, and a small group — among them Mina Harker and the Dutch doctor Van Helsing — set out to hunt him down. The book that fixed the modern vampire in the popular imagination.',
  560, 1897
)
on conflict (id) do nothing;

-- ...and onto the October ballot, if voting hasn't opened yet. Verbatim
-- add_candidate_if_lobby: no-op once the round is live, harmless to re-run.
update meetings
   set candidate_ids = array_append(candidate_ids, 'bkz8c4n6t')
 where is_current and phase = 'lobby'
   and not ('bkz8c4n6t' = any(candidate_ids));

-- Verify: 18 active books, 18 on the ballot, and Ken's full address showing.
select
  (select count(*) from books where status = 'active')               as active_books,
  (select cardinality(candidate_ids) from meetings where is_current) as ballot_size,
  (select location from club where id = true)                        as home_page_address;
