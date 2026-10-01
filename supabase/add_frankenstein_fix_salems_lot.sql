-- Two shelf changes, 2026-09-30.
--
-- 1. 'Salem's Lot was on the shelf as "Salem's llot" by "Stephen king" with
--    no metadata at all and still flagged needs_review. Pinned to the
--    organizer's chosen edition (Doubleday hardcover reissue, 1990) and the
--    title/author typos fixed. The canonical title carries a LEADING
--    apostrophe -- 'Salem's Lot, short for Jerusalem's Lot -- which is how
--    Amazon's own product page renders it.
--
-- 2. Frankenstein is new to the shelf (Penguin Clothbound Classics, 2014).
--    Inserting the book is only half the job: the current meeting is in
--    lobby, so it also has to join that meeting's candidate_ids or it would
--    sit on the shelf and never appear on the October ballot. The last
--    statement is add_candidate_if_lobby's body verbatim, guard included.
--
-- Verified, not guessed: both ISBN-10s come from the /dp/ segment of the
-- organizer's links and round-trip through the app's tested isbn13to10();
-- page counts are off the Amazon product details; both covers were fetched
-- at two sizes and checked by eye (the Doubleday house, the Penguin
-- anatomical-heart cloth binding); descriptions are the Open Library work
-- records, trimmed of their 'Also contained in' boilerplate. Publish years
-- are the works' originals -- 1975 and 1818 -- not these printings.

-- 1. 'Salem's Lot ----------------------------------------------------------
update books set
  title              = '''Salem''s Lot',
  author             = 'Stephen King',
  isbn               = '0385007515',
  isbn13             = '9780385007511',
  cover_url          = 'https://m.media-amazon.com/images/I/81OSDddGLfL._SL500_.jpg',
  cover_large        = 'https://m.media-amazon.com/images/I/81OSDddGLfL._SL1500_.jpg',
  amazon             = 'https://www.amazon.com/dp/0385007515',
  page_count         = 464,
  first_publish_year = 1975,
  description        = 'Author Ben Mears returns to ''Salem''s Lot to write a book about a house that has haunted him since childhood only to find his isolated hometown infested with vampires. While the vampires claim more victims, Mears convinces a small group of believers to combat the undead.',
  needs_review       = false
where id = 'bk2rsjr22';

-- 2. Frankenstein ---------------------------------------------------------
insert into books (
  id, title, author, isbn, isbn13, cover_url, cover_large, amazon,
  c1, c2, glyph, status, added_at, by_token, needs_review,
  description, page_count, first_publish_year
) values (
  'bkq7v3m2x',
  'Frankenstein',
  'Mary Shelley',
  '0141393394',
  '9780141393391',
  'https://m.media-amazon.com/images/I/81Y4bqxd96L._SL500_.jpg',
  'https://m.media-amazon.com/images/I/81Y4bqxd96L._SL1500_.jpg',
  'https://www.amazon.com/dp/0141393394',
  '#4A3C72', '#221B3A', '📖',   -- fallback gradient; unused while the real cover loads
  'active', current_date, null, false,
  'Frankenstein; or, The Modern Prometheus is an 1818 novel written by English author Mary Shelley. Frankenstein tells the story of Victor Frankenstein, a young scientist who creates a sapient creature in an unorthodox scientific experiment. Shelley started writing the story when she was 18, and the first edition was published anonymously in London on 1 January 1818, when she was 20. Her name first appeared in the second edition, which was published in Paris in 1821.',
  352,
  1818
)
on conflict (id) do nothing;

-- ...and onto the October ballot. Verbatim add_candidate_if_lobby: the
-- phase guard means this is a no-op if voting has already opened, and the
-- any() check makes re-running it harmless.
update meetings
   set candidate_ids = array_append(candidate_ids, 'bkq7v3m2x')
 where is_current and phase = 'lobby'
   and not ('bkq7v3m2x' = any(candidate_ids));

-- Verify: 17 active books, 17 candidates, both titles correct, nothing
-- left flagged for review.
select
  (select count(*) from books where status = 'active')                      as active_books,
  (select cardinality(candidate_ids) from meetings where is_current)        as ballot_size,
  (select title from books where id = 'bk2rsjr22')                         as salem_title,
  (select title || ' / ' || author from books where id = 'bkq7v3m2x') as frankenstein,
  (select count(*) from books where needs_review)                           as still_flagged;
