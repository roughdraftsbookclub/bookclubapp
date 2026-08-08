-- Incremental patch on top of the schema.sql you already ran. Paste into the
-- SQL editor and run once. (schema.sql itself has been updated to match, so
-- a fresh project would only ever need schema.sql + seed.sql — this file is
-- just for the project that's already running the first version.)

-- Fix: the original insert policy required needs_review = true, which would
-- have silently rejected every normal, confirmed-cover suggestion (those
-- deliberately set needs_review = false — see CLAUDE.md). Only the "add
-- without a cover" fallback needs review.
drop policy if exists "anyone can suggest a book" on books;
create policy "anyone can suggest a book"
  on books for insert
  with check (status = 'active' and by_token is not null);

-- New: a book suggested while the lobby is open joins tonight's ballot.
-- No passcode — suggesting was never organizer-gated — just the lobby guard.
create or replace function add_candidate_if_lobby(p_book_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update meetings
     set candidate_ids = array_append(candidate_ids, p_book_id)
   where is_current and phase = 'lobby'
     and not (p_book_id = any(candidate_ids));
end;
$$;
grant execute on function add_candidate_if_lobby(text) to anon;

-- New: publishing results, as one transaction (see schema.sql for the full
-- comment on why this isn't just several client-side updates).
create or replace function publish_results(
  p_code           text,
  p_meeting_id     uuid,
  p_winner_id      text,
  p_approval_tally jsonb,
  p_archive_queue  jsonb
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
    insert into meetings (candidate_ids)
      select array_agg(id) from books where status = 'active';
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
      date_read = trim(to_char(current_date, 'Month YYYY'))
      where id = v_prev_id;
  end if;
  update books set status = 'current' where id = p_winner_id;
  update club set current_book_id = p_winner_id where id = true;

  insert into meetings (candidate_ids)
    select array_agg(id) from books where status = 'active';
end;
$$;
grant execute on function publish_results(text, uuid, text, jsonb, jsonb) to anon;

-- New: organizer-editable club settings.
create or replace function update_club_settings(
  p_code          text,
  p_auto_date     boolean,
  p_date          date,
  p_time          text,
  p_host          text,
  p_location      text,
  p_location_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not check_organizer_code(p_code) then
    raise exception 'wrong organizer code';
  end if;

  update club set
    auto_date     = p_auto_date,
    date          = p_date,
    time          = p_time,
    host          = p_host,
    location      = p_location,
    location_note = p_location_note
  where id = true;
end;
$$;
grant execute on function update_club_settings(text, boolean, date, text, text, text, text) to anon;

-- New: turn on realtime broadcasting for the four tables the client
-- subscribes to. Without this the client's postgres_changes subscriptions
-- connect successfully but never receive an event — RLS still applies to
-- what gets broadcast, this just turns broadcasting on at all.
alter publication supabase_realtime add table books, club, meetings, ballots;
