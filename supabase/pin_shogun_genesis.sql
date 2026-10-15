-- Pin Shōgun and Genesis to real print editions, 2026-10-14.
--
-- IMPORTANT: neither book uses the ISBN that was sent, and both were
-- checked against Amazon rather than assumed. The reasons:
--
--   Shōgun, sent as 979-8212173476. That is a valid ISBN-13, but it is the
--   BLACKSTONE AUDIO edition (Open Library confirms the publisher), so it
--   has no page count. It also could not have produced a working buy link:
--   979-prefixed ISBNs have no ISBN-10 equivalent at all, and Amazon /dp/
--   requires a 10 — isbn13to10() only converts 978 prefixes. Pinning it
--   would have left the Amazon link a search, exactly as it is today, while
--   adding an audiobook's identifier to a print shelf.
--   Used instead: Delta Trade Paperbacks, ISBN-10 0385343248, 1008 pages.
--   Verified live at amazon.com/dp/0385343248 (200, real product page).
--   The Dell mass-market 0440178002 was checked first and is DELISTED (404),
--   so it was rejected despite being the better-known printing.
--
--   Genesis, sent as 978-0547394381. Also valid, also Houghton Mifflin, but
--   amazon.com/dp/0547394381 returns Page Not Found — that printing is gone.
--   Used instead: the HMH edition that is still sold, ISBN-10 0547225490,
--   150 pages. Verified live (200). A control ISBN already on the shelf was
--   fetched in the same run and came back LIVE, so the two 404s above are
--   genuine delistings and not Amazon blocking the check.
--
-- Page counts are Amazon's own figures, not Open Library's — OL says 998 for
-- the Delta Shōgun against Amazon's 1008, and OL page counts have already
-- been measured 21 and 25 off on this shelf.
--
-- Publication years are the WORKS': 1975 for Shōgun and 2006 for Genesis,
-- not the 2009 printings, same rule as every other book here.
--
-- Covers are Google's keyless by-ISBN endpoint (zoom=3, ~80KB and ~65KB —
-- real jackets, not Google's 1.2KB placeholder).
--
-- Descriptions were selected and cleaned by the app's own
-- googleVolumeMatches() and cleanGoogleDescription(), so the text below is
-- what the app itself would have stored. The HTTP call around them was made
-- directly rather than through googleDescription(): that function sets
-- `referrer`/`referrerPolicy`, which a browser honours and Node's undici
-- does not, so the referrer-restricted key 403s from a script. The decision
-- logic is the shipped code; only the transport differs.
--
-- Finding worth keeping: fetching these turned up a real bug in normWords().
-- Without a Unicode-decomposing pass the [^a-z0-9] filter turned the macron
-- in "Shōgun" into a SPACE, giving "sh gun", so every correctly-spelled
-- Google result was rejected and the four best descriptions thrown away.
-- Fixed and regression-tested before this file was generated — which is the
-- only reason Shōgun has a description here at all.

-- Shōgun — James Clavell  (Delta Trade Paperbacks. NOT the ISBN sent — see the header.)
update books set
  isbn               = '0385343248',
  isbn13             = '9780385343244',
  cover_url          = 'https://books.google.com/books/content?vid=ISBN0385343248&printsec=frontcover&img=1&zoom=3',
  cover_large        = 'https://books.google.com/books/content?vid=ISBN0385343248&printsec=frontcover&img=1&zoom=3',
  amazon             = 'https://www.amazon.com/dp/0385343248',
  page_count         = 1008,
  first_publish_year = 1975,
  description        = '"Only by living at the edge of death can you understand the indescribable joy of life." After Englishman John Blackthorne is lost at sea, he awakens in a place few Europeans know of and even fewer have seen-Nippon. Thrust into the closed society that is late sixteenth-century Japan, a land where the line between life and death is razor-thin, Blackthorne must negotiate not only a foreign people, with unknown customs and language, but also his own definitions of morality, truth, and freedom. As internal political strife and a clash of cultures lead to seemingly inevitable conflict, Blackthorne''s loyalty and strength of character are tested by both passion and loss, and he is torn between two worlds that will each be forever changed. Powerful and engrossing, capturing both the rich pageantry and stark realities of life in feudal Japan, Shogun is a critically acclaimed powerhouse of a book. Heart-stopping, edge-of-your-seat action melds seamlessly with intricate historical detail and raw human emotion. Endlessly compelling, this sweeping saga captivated the world to become not only one of the bestselling novels of all time but also one of the highest-rated television miniseries, as well as inspiring a nationwide surge of interest in the culture of Japan. Provocative, absorbing, and endlessly fascinating, there is only one: Shogun.',
  needs_review       = false
where id = 'bkv6m3p8k';

-- Genesis — Bernard Beckett  (Houghton Mifflin Harcourt. NOT the ISBN sent — see the header.)
update books set
  isbn               = '0547225490',
  isbn13             = '9780547225494',
  cover_url          = 'https://books.google.com/books/content?vid=ISBN0547225490&printsec=frontcover&img=1&zoom=3',
  cover_large        = 'https://books.google.com/books/content?vid=ISBN0547225490&printsec=frontcover&img=1&zoom=3',
  amazon             = 'https://www.amazon.com/dp/0547225490',
  page_count         = 150,
  first_publish_year = 2006,
  description        = 'Anax is about to face her examination for the Academy, the institution which safeguards her society. The subject is close to her heart: Adam, a man whose struggle transformed the course of her country.But the examination by the panel will reveal new twists to Adam''s history. Twists that will undermine Anax''s assumptions about her country and who she is. But why is the Academy allowing Anax to open up the enigma at its heart? All young people will identify with Anax as she faces the most important examination of her life; she is on the brink of her future and discovering a new world.Beckett unlocks this beautifully wrought story about the human soul and artificial intelligence in an ingenious and devastating denouement.',
  needs_review       = false
where title = 'Genesis' and author ilike '%Beckett%';

-- No ballot changes: both books were suggested while the lobby was open
-- and are already in candidate_ids. These are UPDATEs to existing rows.

-- Verify: both complete, and the ballot still matches the shelf.
select title, author, isbn, isbn13, page_count, first_publish_year,
       (cover_url is not null) as has_cover,
       (description is not null) as has_desc, needs_review
  from books
 where id = 'bkv6m3p8k' or (title = 'Genesis' and author ilike '%Beckett%')
 order by title;
