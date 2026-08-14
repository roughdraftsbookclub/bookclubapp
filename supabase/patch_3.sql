-- New feature, not a bugfix (unlike patch_1/patch_2): adds the meeting
-- schedule — who's hosting, which book gets discussed where, distinct from
-- the `meetings` table's live voting state. See schema.sql section 8 for
-- the full reasoning. Run this once, then supabase/seed_schedule.sql.

create table schedule (
  id            uuid primary key default gen_random_uuid(),
  sort_index    integer not null unique,
  meeting_date  date,                      -- null only for a skipped month
  skip_reason   text,                      -- set only when meeting_date is null
  host          text,                      -- null = open slot, claimable by anyone
  book_id       text references books(id), -- book discussed at this meeting; null until known
  provenance    text check (provenance in ('voted','seed_pick')),
  created_at    timestamptz not null default now()
);

alter table schedule enable row level security;

create policy "anyone can read the schedule"
  on schedule for select
  using (true);

create or replace function claim_host_slot(p_schedule_id uuid, p_host text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update schedule
     set host = p_host
   where id = p_schedule_id and host is null;
end;
$$;
grant execute on function claim_host_slot(uuid, text) to anon;

create or replace function update_schedule_row(
  p_code         text,
  p_schedule_id  uuid,
  p_meeting_date date,
  p_skip_reason  text,
  p_host         text,
  p_book_id      text,
  p_provenance   text
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

  update schedule set
    meeting_date = p_meeting_date,
    skip_reason  = p_skip_reason,
    host         = p_host,
    book_id      = p_book_id,
    provenance   = p_provenance
  where id = p_schedule_id;
end;
$$;
grant execute on function update_schedule_row(text, uuid, date, text, text, text, text) to anon;

-- Re-create publish_results to also attach the winner to the next open
-- schedule row (see schema.sql for the full comment on why).
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
      date_read = to_char(current_date, 'FMMonth YYYY')
      where id = v_prev_id;
  end if;
  update books set status = 'current' where id = p_winner_id;
  update club set current_book_id = p_winner_id where id = true;

  update schedule
     set book_id = p_winner_id, provenance = 'voted'
   where id = (
     select id from schedule
      where book_id is null and meeting_date is not null
      order by sort_index asc limit 1
   );

  insert into meetings (candidate_ids)
    select array_agg(id) from books where status = 'active';
end;
$$;
grant execute on function publish_results(text, uuid, text, jsonb, jsonb) to anon;

alter publication supabase_realtime add table schedule;
