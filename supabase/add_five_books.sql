-- Five books onto the shelf, 2026-10-10, plus two bits of housekeeping.
--
-- 1929 is pinned to the exact edition from the organizer's /dp/ link, with
-- a verified page count and cover, the same as every other pinned book.
--
-- The other four came as Amazon SEARCH links, so no edition was chosen. They
-- go on with title, author, original publication year and (where one could
-- be verified) a cover, and their Amazon link is a search rather than a
-- fabricated /dp/. No ISBN and no page count is stored for them, because
-- those belong to a specific printing and none was picked. Send a /dp/ link
-- for any of them and it can be pinned properly in a minute.
--
-- What Open Library got wrong, and was therefore NOT used:
--   * Its search index dates The Right Stuff to 1973. The work record says
--     1979, which is correct; 1979 is stored.
--   * It disagrees with itself on Chesapeake (1978 vs 1980) and Space
--     (1982 vs 1984). The first of each is right and is what's stored.
--   * Its cover for Space is the French edition (La course aux etoiles) and
--     for The Right Stuff the Spanish (Lo que hay que tener). Both were
--     checked by eye and rejected; those two fall back to the app's drawn
--     cover instead of showing a foreign jacket.
--   * Its top search hits for Chesapeake and Space are the Spanish and
--     French titles. The English titles are stored.

-- 1929: Inside the Greatest Crash in Wall Street History — Andrew Ross Sorkin  (pinned to the organizer's link (Viking hardcover, Oct 2025))
insert into books (id, title, author, isbn, isbn13, cover_url, cover_large, amazon,
  c1, c2, glyph, status, added_at, by_token, needs_review, description, page_count, first_publish_year)
values ('bkt4r9x2w', '1929: Inside the Greatest Crash in Wall Street History', 'Andrew Ross Sorkin', '0593296966', '9780593296967',
  'https://m.media-amazon.com/images/I/71ojtb1VxuL._SL500_.jpg', 'https://m.media-amazon.com/images/I/71ojtb1VxuL._SL1500_.jpg', 'https://www.amazon.com/dp/0593296966',
  '#245E6B', '#0C2C33', '📖', 'active', current_date, null, false,
  'Andrew Ross Sorkin''s account of the 1929 Wall Street crash and the people at the centre of it — the bankers, speculators and officials whose decisions in the months either side of October 1929 turned a market collapse into the Great Depression. From the author of Too Big to Fail, published by Viking in October 2025.', 592, 2025)
on conflict (id) do nothing;

-- Shōgun — James Clavell  (no edition pinned)
insert into books (id, title, author, isbn, isbn13, cover_url, cover_large, amazon,
  c1, c2, glyph, status, added_at, by_token, needs_review, description, page_count, first_publish_year)
values ('bkv6m3p8k', 'Shōgun', 'James Clavell', null, null,
  'https://covers.openlibrary.org/b/id/2394441-M.jpg', 'https://covers.openlibrary.org/b/id/2394441-L.jpg', 'https://www.amazon.com/s?k=Shogun%20James%20Clavell',
  '#8C3B2E', '#3E1610', '📖', 'active', current_date, null, false,
  'After Englishman John Blackthorne is lost at sea, he awakens in a place few Europeans know of and even fewer have seen--Nippon. Thrust into the closed society that is seventeenth-century Japan, a land where the line between life and death is razor-thin, Blackthorne must negotiate not only a foreign people, with unknown customs and language, but also his own definitions of morality, truth, and freedom. As internal political strife and a clash of cultures lead to seemingly inevitable conflict, Blackthorne''s loyalty and strength of character are tested by both passion and loss, and he is torn between two worlds that will each be forever changed.

Powerful and engrossing, capturing both the rich pageantry and stark realities of life in feudal Japan, Shōgun is a critically acclaimed powerhouse of a book. Heart-stopping, edge-of-your-seat action melds seamlessly with intricate historical detail and raw human emotion. Endlessly compelling, this sweeping saga captivated the world to become not only one of the best-selling novels of all time but also one of the highest-rated television miniseries, as well as inspiring a nationwide surge of interest in the culture of Japan. Shakespearean in both scope and depth, Shōgun is, as the New York Times put it, "...not only something you read--you live it." Provocative, absorbing, and endlessly fascinating, there is only one: Shōgun.', null, 1975)
on conflict (id) do nothing;

-- Chesapeake — James A. Michener  (no edition pinned)
insert into books (id, title, author, isbn, isbn13, cover_url, cover_large, amazon,
  c1, c2, glyph, status, added_at, by_token, needs_review, description, page_count, first_publish_year)
values ('bkw2h7y4n', 'Chesapeake', 'James A. Michener', null, null,
  'https://covers.openlibrary.org/b/id/4431495-M.jpg', 'https://covers.openlibrary.org/b/id/4431495-L.jpg', 'https://www.amazon.com/s?k=Chesapeake%20James%20Michener',
  '#2E5B44', '#173226', '📖', 'active', current_date, null, false,
  'James A. Michener''s enthralling new novel tells a magnificent historical saga of our land and its people, focusing on the generations of seven brawling, burgeoning families—their failures and triumphs, their uniquely American spirit and drive—living on Maryland''s Chesapeake Bay.

Chesapeake is the first work of fiction in ten years to make its debut on The New York Times Best Seller List as number one. Read this panoramic novel, and you will see why critics and readers agree that it is Michener''s finest work to date.', null, 1978)
on conflict (id) do nothing;

-- Space — James A. Michener  (no edition pinned; OL cover was the French edition, so none stored)
insert into books (id, title, author, isbn, isbn13, cover_url, cover_large, amazon,
  c1, c2, glyph, status, added_at, by_token, needs_review, description, page_count, first_publish_year)
values ('bkp9s5c3d', 'Space', 'James A. Michener', null, null,
  null, null, 'https://www.amazon.com/s?k=Space%20James%20Michener',
  '#1E3A5F', '#0A1626', '📖', 'active', current_date, null, false,
  'Already a renowned chronicler of the epic events of world history, James A. Michener tackles the most ambitious subject of his career: space, the last great frontier. This astounding novel brings to life the dreams and daring of countless men and women—people like Stanley Mott, the engineer whose irrepressible drive for knowledge places him at the center of the American exploration effort; Norman Grant, the war hero and U.S. senator who takes his personal battle not only to a nation, but to the heavens; Dieter Kolff, a German rocket scientist who once worked for the Nazis; Randy Claggett, the astronaut who meets his destiny on a mission to the far side of the moon; and Cynthia Rhee, the reporter whose determined crusade brings their story to a breathless world.', null, 1982)
on conflict (id) do nothing;

-- The Right Stuff — Tom Wolfe  (no edition pinned; OL cover was the Spanish edition, so none stored)
insert into books (id, title, author, isbn, isbn13, cover_url, cover_large, amazon,
  c1, c2, glyph, status, added_at, by_token, needs_review, description, page_count, first_publish_year)
values ('bkj7d2k9f', 'The Right Stuff', 'Tom Wolfe', null, null,
  null, null, 'https://www.amazon.com/s?k=The%20Right%20Stuff%20Tom%20Wolfe',
  '#4A3C72', '#221B3A', '📖', 'active', current_date, null, false,
  'Tom Wolfe''s account of the test pilots who became America''s first astronauts — the Mercury Seven, the men who flew the X-1 and X-15 before them, and the culture of nerve and competition that produced them. Wolfe follows the programme from Chuck Yeager breaking the sound barrier through the Mercury flights, and the phrase he coined for what the job demanded gave the book its title.', null, 1979)
on conflict (id) do nothing;

-- All five onto November's ballot. Verbatim add_candidate_if_lobby: the
-- phase guard makes it a no-op once voting opens, and the any() check
-- makes re-running it harmless.
update meetings
   set candidate_ids = candidate_ids || array['bkt4r9x2w', 'bkv6m3p8k', 'bkw2h7y4n', 'bkp9s5c3d', 'bkj7d2k9f']
 where is_current and phase = 'lobby'
   and not ('bkt4r9x2w' = any(candidate_ids));

-- Housekeeping 1: Lonesome Dove was reactivated after November's meeting
-- row was created, and reactivate_book doesn't touch the ballot the way
-- suggesting a book does — so it was active on the shelf but invisible to
-- the vote. Put it on.
update meetings m
   set candidate_ids = array_append(m.candidate_ids, b.id)
  from books b
 where m.is_current and m.phase = 'lobby'
   and b.title = 'Lonesome Dove' and b.status = 'active'
   and not (b.id = any(m.candidate_ids));

-- Housekeeping 2: Genesis came out of the suggestion flow with its author
-- stored three times over.
update books set author = 'Bernard Beckett'
 where title = 'Genesis' and author like '%,%';

-- Verify: active books and ballot size should match, and nothing odd left.
select
  (select count(*) from books where status = 'active')               as active_books,
  (select cardinality(candidate_ids) from meetings where is_current) as ballot_size,
  (select author from books where title = 'Genesis')                as genesis_author;
