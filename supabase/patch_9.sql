-- The home page kept showing the meeting that just happened.
--
-- `club` is what the member-facing home screen reads (date / time / host /
-- location). `schedule` is the real calendar, one row per meeting, and it
-- already knew Ken Wilkins hosts on Oct 8 — but nothing ever copied that
-- across, so the front page still read "Thursday, September 10 · Hosted by
-- David Tayloe" the morning after the September meeting. The organizer had
-- to retype it by hand every month.
--
-- publish_results already attaches the winner to the next schedule row. It
-- now rolls the club's front page onto that same row at the same moment,
-- which is the one instant we know for certain the meeting is over.
--
-- Two things this had to get right:
--
--   * Host without address is worse than neither. `schedule` had no place to
--     put a location, so rolling only the host forward would have paired a
--     new host's name with the previous host's street address — confidently
--     wrong, which is worse than blank. `schedule` gains location and
--     location_note so each meeting row stands on its own.
--
--   * An unclaimed slot must clear, not inherit. If the next row has no host
--     yet, club.host goes empty rather than keeping the last one. The home
--     screen omits the "Hosted by" and address lines when they're empty, so
--     it degrades to just the date instead of lying about who's hosting.
--
-- Note for later: club.auto_date = true makes the app ignore club.date and
-- recompute it from the second-Thursday rule, which does NOT know about the
-- December skip. The schedule table does. Leave auto_date false so these
-- dates win.

alter table schedule add column if not exists location      text;
alter table schedule add column if not exists location_note text;

-- Historical: September was at David's. Recording it so the calendar is a
-- complete record rather than starting from October.
update schedule
   set location = '4803 Trent Woods Drive'
 where meeting_date = date '2026-09-10' and location is null;

create or replace function publish_results(
  p_code           text,
  p_meeting_id     uuid,
  p_winner_id      text,
  p_approval_tally jsonb,          -- {book_id: count}
  p_archive_queue  jsonb           -- [{id, reason}]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meeting  meetings%rowtype;
  v_prev_id  text;
  v_entry    record;
  v_next_id  uuid;          -- schedule.id is uuid; text here breaks the = below
begin
  if not check_organizer_code(p_code) then
    raise exception 'wrong organizer code';
  end if;

  select * into v_meeting from meetings where id = p_meeting_id and is_current;
  if not found then
    raise exception 'not the current meeting';
  end if;

  update meetings set is_current = false where id = p_meeting_id;

  if v_meeting.is_practice then
    -- Practice runs discard everything (CLAUDE.md) — just open the next
    -- real meeting with the shelf as it stands. Deliberately does NOT roll
    -- the club's front page: a practice run must not move the real calendar.
    insert into meetings (candidate_ids, expected_voters)
      select array_agg(id), v_meeting.expected_voters from books where status = 'active';
    return;
  end if;

  update books b set
    meetings_considered = meetings_considered + 1,
    zero_vote_streak = case when coalesce((p_approval_tally ->> b.id)::int, 0) = 0
                             then zero_vote_streak + 1 else 0 end,
    shortlist_misses = case when b.id = any(v_meeting.shortlist_ids)
                             then 0 else shortlist_misses + 1 end,
    ever_shortlisted = ever_shortlisted or (b.id = any(v_meeting.shortlist_ids))
  where b.id = any(v_meeting.candidate_ids);

  for v_entry in select * from jsonb_to_recordset(p_archive_queue) as x(id text, reason text)
  loop
    update books set status = 'archived', archive_reason = v_entry.reason, archived_at = current_date
      where id = v_entry.id;
  end loop;

  select current_book_id into v_prev_id from club where id = true;
  if v_prev_id is not null then
    update books set status = 'read',
      date_read = to_char(current_date, 'FMMonth YYYY')
      where id = v_prev_id;
  end if;
  update books set status = 'current' where id = p_winner_id;
  update club set current_book_id = p_winner_id where id = true;

  -- A winner is discussed at the *next* meeting, not this one — attach it
  -- to the earliest still-undecided schedule row. Silently a no-op if the
  -- schedule hasn't been seeded that far ahead yet; publishing a result
  -- should never fail just because nobody's planned next spring.
  select id into v_next_id
    from schedule
   where book_id is null and meeting_date is not null
   order by sort_index asc limit 1;

  if v_next_id is not null then
    update schedule
       set book_id = p_winner_id, provenance = 'voted'
     where id = v_next_id;

    -- ...and roll the home screen onto that same meeting. `time` is not
    -- carried per-row because it doesn't vary by host; it stays whatever the
    -- organizer set. A null host/location clears rather than inherits.
    update club c set
      date          = s.meeting_date,
      host          = coalesce(s.host, ''),
      location      = coalesce(s.location, ''),
      location_note = coalesce(s.location_note, '')
      from schedule s
     where s.id = v_next_id and c.id = true;
  end if;

  -- Next meeting's headcount starts as a copy of this one's — the common
  -- case is confirming it's still right, not entering it from scratch.
  insert into meetings (candidate_ids, expected_voters)
    select array_agg(id), v_meeting.expected_voters from books where status = 'active';
end;
$$;
grant execute on function publish_results(text, uuid, text, jsonb, jsonb) to anon;

-- One-time catch-up for the September meeting, which published before the
-- roll-forward existed. Exactly what the function above will now do on its
-- own from October onward.
update club c set
  date          = s.meeting_date,
  host          = coalesce(s.host, ''),
  location      = coalesce(s.location, ''),
  location_note = coalesce(s.location_note, '')
  from schedule s
 where c.id = true and s.meeting_date = date '2026-10-08';

-- Verify: the home screen should now read October 8, hosted by Ken Wilkins.
-- location will be blank until someone records Ken's address — blank is
-- deliberate, the alternative was David's address under Ken's name.
select date, time, host, location, location_note from club where id = true;
