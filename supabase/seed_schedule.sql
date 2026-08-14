-- Seeds the confirmed schedule: two completed meetings, the current book's
-- discussion meeting, and the ten meetings after that (through Jul 2027,
-- with December 2026 off for the holidays). Run once, after schema.sql
-- (or patch_3.sql on the already-live project) and seed.sql.

insert into schedule (sort_index, meeting_date, skip_reason, host, book_id, provenance) values
  (1,  '2026-07-09', null, null,            'bk19', 'seed_pick'),  -- City of Thieves — first-ever meeting, no vote
  (2,  '2026-08-13', null, null,            'bk18', 'voted'),      -- Barbarian Days
  (3,  '2026-09-10', null, 'David Tayloe',  'bk15', 'voted'),      -- East of Eden — current book
  (4,  '2026-10-08', null, 'Ken Wilkins',   null,   null),
  (5,  '2026-11-12', null, 'Tom Wilson',    null,   null),
  (6,  null,          'Off for Christmas', null, null, null),
  (7,  '2027-01-14', null, 'John Robert',   null,   null),
  (8,  '2027-02-11', null, null,            null,   null),
  (9,  '2027-03-11', null, null,            null,   null),
  (10, '2027-04-08', null, null,            null,   null),
  (11, '2027-05-13', null, null,            null,   null),
  (12, '2027-06-10', null, null,            null,   null),
  (13, '2027-07-08', null, null,            null,   null);
