-- November 2026 meeting: host, venue and address. 2026-11-05.
--
-- Thursday 12 November 2026 — the second Thursday, which is what
-- secondThursday() computes and what the home screen is already showing.
--
-- NOTE: you can do all of this in the app instead, with no SQL — the
-- organizer console's Schedule tab (Host / Venue / Directions on the
-- 12 November row) writes exactly these fields through update_schedule_row
-- and rolls the club row itself. This file exists because it was asked for
-- from here, and as a record of what changed.
--
-- On the Google Maps link you sent: it is not stored. It was resolved and
-- it does point at Eastern Carolina Yacht Club (35.0736, -77.0880, which is
-- Trent Woods), so it is right — but location_note is rendered as escaped
-- plain text, so a URL in it would show as an unclickable string of
-- characters on the card. The app now builds the maps link itself from the
-- venue and address below, which works for every future meeting without
-- storing a URL that can rot.

-- 1. The schedule row is the authority ------------------------------------
update schedule
   set host          = 'Tom Wilson',
       location      = 'Eastern Carolina Yacht Club',
       location_note = '4005 Trent Pines Dr, Trent Woods, NC 28562'
 where meeting_date = '2026-11-12';

-- 2. Roll the club row, which is what the home screen reads ---------------
-- Guarded on the date so this can never stamp November's venue onto some
-- other meeting if the club row has already moved on.
update club
   set host          = 'Tom Wilson',
       location      = 'Eastern Carolina Yacht Club',
       location_note = '4005 Trent Pines Dr, Trent Woods, NC 28562'
 where date = '2026-11-12';

-- Verify: both rows should agree, and the club row should be the one the
-- home page is showing. If club_rows comes back 0, the club row is pointing
-- at a different date — check it before assuming this worked.
select
  (select count(*) from schedule where meeting_date = '2026-11-12')        as schedule_rows,
  (select count(*) from club     where date         = '2026-11-12')        as club_rows,
  (select host          from schedule where meeting_date = '2026-11-12')   as sched_host,
  (select location      from schedule where meeting_date = '2026-11-12')   as sched_venue,
  (select location_note from schedule where meeting_date = '2026-11-12')   as sched_address,
  (select host          from club     limit 1)                             as club_host,
  (select location      from club     limit 1)                             as club_venue,
  (select date          from club     limit 1)                             as club_date;
