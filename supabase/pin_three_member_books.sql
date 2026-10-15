-- Pin three member-suggested books to real editions, 2026-10-14.
--
-- All three were suggested on the 13th and arrived with nothing attached:
-- no cover, no page count, no year, no description, and a shortened a.co
-- share link. These are UPDATEs to those rows, not new books — they are
-- already on November's ballot.
--
-- Open Library had NOTHING for two of these three. It is up (a known-good
-- ISBN still resolves) and simply has no record of The Rush or the
-- Deerslayer edition — so every field below came off the Amazon product
-- pages instead, and all three covers were fetched and checked by eye.
-- Each ISBN-13 was computed from its ISBN-10 and matches what Amazon
-- lists, so the pairs are right.
--
-- On the two identifiers that weren't ISBNs:
--
--   The Brothers Karamazov — the link was the Kindle edition (B0GJ6HSC37),
--   a Kindle ASIN rather than an ISBN, so nothing could be pinned to it.
--   Its print counterpart is the same Katz translation: Liveright
--   paperback 1324095105, 928 pages. That is what's stored.
--
--   The Deerslayer — the link was again a Kindle ASIN (B00DVT7Z00), and the
--   ISBN-13 supplied alongside it (978-1627552080) belongs to that *ebook*,
--   published by SMK Books. It has no print product: amazon.com/dp/
--   1627552081 returns Page Not Found. Of the three print editions Amazon
--   lists for the book, this uses the Bantam Classics mass-market
--   paperback (0553210858, 688 pages) — the one that also came top when
--   searching Amazon for the ISBN-13 itself. Say the word if you'd rather
--   have the hardcover (1731700962) or the trade paperback (1717469507).
--
-- Publication years are the works', as always: 1880 for Karamazov and 1841
-- for The Deerslayer, not the 2024 and 1991 printings. The Rush is genuinely
-- new, so 2026 is both.

-- The Brothers Karamazov — Fyodor Dostoevsky
--   Katz translation, Liveright paperback (2024). The link you sent was the Kindle edition; this is its print counterpart.
update books set
  title              = 'The Brothers Karamazov',
  author             = 'Fyodor Dostoevsky',
  isbn               = '1324095105',
  isbn13             = '9781324095101',
  cover_url          = 'https://m.media-amazon.com/images/I/719B2bgJ8XL._SL500_.jpg',
  cover_large        = 'https://m.media-amazon.com/images/I/719B2bgJ8XL._SL1500_.jpg',
  amazon             = 'https://www.amazon.com/dp/1324095105',
  page_count         = 928,
  first_publish_year = 1880,
  description        = 'Dostoevsky''s last novel, in Michael R. Katz''s 2024 translation. Three brothers — the sensualist Dmitri, the sceptic Ivan and the novice monk Alyosha — are drawn into the orbit of their grasping father Fyodor Pavlovich, whose murder sets off the trial at the book''s centre. Around it Dostoevsky builds his argument about faith, doubt and responsibility, including the Grand Inquisitor parable that is often read on its own.',
  needs_review       = false
where id = 'bkl0hve4j';

-- The Rush: California Gold, the Civil War, and the Making of  — Nathaniel Philbrick
--   exactly the edition you linked (Viking hardcover)
update books set
  title              = 'The Rush: California Gold, the Civil War, and the Making of the Modern World',
  author             = 'Nathaniel Philbrick',
  isbn               = '0525562230',
  isbn13             = '9780525562238',
  cover_url          = 'https://m.media-amazon.com/images/I/91DMGiaEkLL._SL500_.jpg',
  cover_large        = 'https://m.media-amazon.com/images/I/91DMGiaEkLL._SL1500_.jpg',
  amazon             = 'https://www.amazon.com/dp/0525562230',
  page_count         = 464,
  first_publish_year = 2026,
  description        = 'Nathaniel Philbrick on the California gold rush and the decade that followed — the migration west, the wealth it moved, and the part that wealth played in the run-up to the Civil War and in what the United States became afterwards. Published by Viking in October 2026.',
  needs_review       = false
where id = 'bk80ve2ia';

-- The Deerslayer — James Fenimore Cooper
--   Bantam Classics mass-market paperback — see the note below about the ISBN you sent
update books set
  title              = 'The Deerslayer',
  author             = 'James Fenimore Cooper',
  isbn               = '0553210858',
  isbn13             = '9780553210859',
  cover_url          = 'https://m.media-amazon.com/images/I/81xn-MCC2XL._SL500_.jpg',
  cover_large        = 'https://m.media-amazon.com/images/I/81xn-MCC2XL._SL1500_.jpg',
  amazon             = 'https://www.amazon.com/dp/0553210858',
  page_count         = 688,
  first_publish_year = 1841,
  description        = 'The first of the Leatherstocking Tales by the order of its own story, though the last Cooper wrote. Natty Bumppo, young and not yet called Hawkeye, comes of age on Lake Otsego in the 1740s among the fighting between the Huron and the British colonists, and earns the name Deerslayer.',
  needs_review       = false
where id = 'bkwgf3per';

-- No ballot changes: all three are already on November's ballot, since
-- they were suggested while the lobby was open and add_candidate_if_lobby
-- put them there at the time. 17 active, 17 candidates, before and after.

-- Verify: every one of the three now complete, and nothing drifted.
select title, author, isbn, page_count, first_publish_year,
       (cover_url is not null) as has_cover, (description is not null) as has_desc
  from books
 where id in ('bkl0hve4j', 'bk80ve2ia', 'bkwgf3per')
 order by title;
