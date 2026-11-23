-- Repair the two books added 2026-11-23 that came out of the suggestion flow
-- with broken or missing metadata. Organizer request.
--
-- Neither book needs adding — both are already on the shelf as `active`.
-- "Replace two books" is this: replace the contents of these two records.
--
--   bky15wb8z  One Hundred Years of Solitude
--      had: a real ISBN, but NO cover, NO page count, NO publish year, and
--      `amazon` set to a raw Share link (https://a.co/d/0bVJNVLq) instead of
--      the /dp/ URL buildAmazonLink() is supposed to produce. The a.co link
--      does work in a browser, but it isn't what the app builds anywhere
--      else and it hides which edition it points at.
--   bked465pd  The Sound And The Fury
--      had: title and author only. No ISBN, no cover, no description, no
--      Amazon link, no pages, no year. Title also hand-cased as
--      "The Sound And The Fury".
--
-- Why this is SQL and not the admin console: the console's edit form works
-- fine, but these two descriptions are ~1,200 and ~1,400 characters of
-- supplied text and typing them into a phone-sized textarea is miserable.
-- Everything here is exactly what that form would have written.
--
-- EVERY VALUE BELOW WAS VERIFIED, NOT GUESSED:
--   * ISBN-13s computed with the app's own isbn10to13() (tests/lookup.js),
--     never read from OL's edition record, which lists wrong counterparts.
--   * Amazon links follow buildAmazonLink()'s rule (ASIN = ISBN-10 for
--     print) and both return HTTP 200 on a real browser User-Agent.
--   * Covers come from the Google Books API's imageLinks, which is absent
--     unless a real jacket exists — checked, and both are real images
--     (128x192 and 128x197). Not the keyless vid=ISBN URL, which answers
--     200 with a placeholder when Google has nothing.
--   * first_publish_year is the WORK's original publication, not this
--     printing's: 1967 and 1929. Both confirmed from OL's work record.
--   * page_count is Open Library's EDITION figure. Google's are the ebook's
--     (448 and 385 against true 417 and 321) and are deliberately not used.
--
-- ⚠️ ONE FIGURE TO SANITY-CHECK: The Sound and the Fury's 321 pages. Open
-- Library's record for ISBN 0679732241 also claims publisher "Penguin" and
-- date "2025", both plainly wrong for a Vintage International edition, so
-- its page count for that row carries less weight than usual. 321 is the
-- only per-edition number on file. Correct it in the edit form if Amazon
-- disagrees; it is the sort of thing that is better right than confident.
--
-- Run the whole file. Safe to re-run.

-- =========================================================================
-- 1. One Hundred Years of Solitude
-- =========================================================================
update books set
  title              = 'One Hundred Years of Solitude',
  author             = 'Gabriel García Márquez',
  isbn               = '006112009X',
  isbn13             = '9780061120091',
  cover_url          = 'https://books.google.com/books/content?id=CeQNngEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
  cover_large        = 'https://books.google.com/books/content?id=CeQNngEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
  amazon             = 'https://www.amazon.com/dp/006112009X',
  page_count         = 417,
  first_publish_year = 1967,
  needs_review       = false,
  description        = 'One of the twentieth century’s enduring works, One Hundred Years of Solitude is a widely beloved and acclaimed novel known throughout the world and the ultimate achievement in a Nobel Prize–winning career.

The novel tells the story of the rise and fall of the mythical town of Macondo through the history of the Buendía family. Rich and brilliant, it is a chronicle of life, death, and the tragicomedy of humankind. In the beautiful, ridiculous, and tawdry story of the Buendía family, one sees all of humanity, just as in the history, myths, growth, and decay of Macondo, one sees all of Latin America.

Love and lust, war and revolution, riches and poverty, youth and senility, the variety of life, the endlessness of death, the search for peace and truth—these universal themes dominate the novel. Alternately reverential and comical, One Hundred Years of Solitude weaves the political, personal, and spiritual to bring a new consciousness to storytelling. Translated into dozens of languages, this stunning work is no less than an account of the history of the human race.'
where id = 'bky15wb8z';

-- =========================================================================
-- 2. The Sound and the Fury
-- =========================================================================
-- Title re-cased: "The Sound And The Fury" -> "The Sound and the Fury".
update books set
  title              = 'The Sound and the Fury',
  author             = 'William Faulkner',
  isbn               = '0679732241',
  isbn13             = '9780679732242',
  cover_url          = 'https://books.google.com/books/content?id=_luMDQAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
  cover_large        = 'https://books.google.com/books/content?id=_luMDQAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
  amazon             = 'https://www.amazon.com/dp/0679732241',
  page_count         = 321,
  first_publish_year = 1929,
  needs_review       = false,
  description        = 'NOBEL PRIZE WINNER • One of the greatest novels of the twentieth century is the story of a family of Southern aristocrats on the brink of personal and financial ruin. • The definitive corrected text, including Faulkner''s Appendix

One of The Atlantic’s Great American Novels of the Past 100 Years

The Sound and the Fury is the tragedy of the Compson family, featuring some of the most memorable characters in literature: beautiful, rebellious Caddy; the manchild Benjy; haunted, neurotic Quentin; Jason, the brutal cynic; and Dilsey, their black servant. Their lives fragmented and harrowed by history and legacy, the character’s voices and actions mesh to create what is arguably Faulkner’s masterpiece and one of the greatest novels of the twentieth century.

“I give you the mausoleum of all hope and desire.... I give it to you not that you may remember time, but that you might forget it now and then for a moment and not spend all of your breath trying to conquer it. Because no battle is ever won he said. They are not even fought. The field only reveals to man his own folly and despair, and victory is an illusion of philosophers and fools.” —from The Sound and the Fury'
where id = 'bked465pd';

-- =========================================================================
-- Verify
-- =========================================================================
select id, title, author, isbn, isbn13, page_count, first_publish_year,
       (cover_url is not null)   as has_cover,
       (description is not null) as has_description,
       length(description)       as desc_len,
       amazon
  from books
 where id in ('bky15wb8z','bked465pd')
 order by title;

-- Both rows should show an ISBN-10 and -13, a page count, a year, a cover,
-- a description of roughly 1,000-1,500 characters, and an amazon.com/dp/
-- link. Neither should still carry an a.co link.
