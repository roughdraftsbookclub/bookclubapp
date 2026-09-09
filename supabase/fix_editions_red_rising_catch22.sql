-- Pin two books to the specific editions the organizer picked on Amazon.
-- Both records were bare before this: no ISBN, no cover, and either a
-- shortened a.co share link (Red Rising) or no link at all (Catch-22).
--
-- Everything below is verified, not guessed:
--   * ISBNs, page counts and publication dates were read off the organizer's
--     own Amazon product pages. Each ISBN-10 also round-trips correctly
--     through the app's own tested isbn13to10() (tests/lookup.js), and
--     matches the ISBN-13 Amazon lists.
--   * Amazon links follow the app's own buildAmazonLink() rule
--     (ASIN = ISBN-10 for print books).
--   * Covers come from Amazon rather than Open Library, by request: OL's
--     scans for both are low-resolution and the Red Rising one carries
--     "Copyrighted Material" watermark stripes. Every URL below was fetched
--     and confirmed to return a real image at both sizes. Note this is a
--     documented departure from CLAUDE.md's "cover IDs, never ISBNs" rule —
--     that rule exists because OL rate-limits ISBN-based cover lookups, and
--     it doesn't apply to Amazon's CDN at all.
--
-- NOT set here: description. openlibrary.org (the data API, as distinct from
-- the covers host) was down when this ran, and a publisher's marketing blurb
-- copied off Amazon isn't ours to store. Both stay null until OL is back.

-- Red Rising — Pierce Brown, Del Rey reprint (July 15, 2014).
-- first_publish_year is 2014 either way: the work and this edition share it.
update books set
  isbn               = '034553980X',
  isbn13             = '9780345539809',
  cover_url          = 'https://m.media-amazon.com/images/I/81wGzzxqHSL._SL500_.jpg',
  cover_large        = 'https://m.media-amazon.com/images/I/81wGzzxqHSL._SL1500_.jpg',
  amazon             = 'https://www.amazon.com/dp/034553980X',
  page_count         = 416,
  first_publish_year = 2014
where id = 'bk8u0zhia';

-- Catch-22 — Joseph Heller, Simon & Schuster 50th Anniversary Edition
-- (April 5, 2011), with Christopher Buckley's introduction. Also fixes the
-- stored title ("Catch 22" -> "Catch-22") and the author's capitalisation.
--
-- first_publish_year is 1961, NOT this edition's 2011 — CLAUDE.md is explicit
-- that the year is the *work's* original publication, not whichever edition
-- was picked ("a 2001 reprint of a 1952 novel still shows 1952"). The cover
-- corroborates it: a 50th Anniversary Edition published in 2011 puts the
-- original at 1961.
update books set
  title              = 'Catch-22',
  author             = 'Joseph Heller',
  isbn               = '1451626657',
  isbn13             = '9781451626650',
  cover_url          = 'https://m.media-amazon.com/images/I/71Ym0vDDWsL._SL500_.jpg',
  cover_large        = 'https://m.media-amazon.com/images/I/71Ym0vDDWsL._SL1500_.jpg',
  amazon             = 'https://www.amazon.com/dp/1451626657',
  page_count         = 544,
  first_publish_year = 1961
where id = 'bkbw12juh';
