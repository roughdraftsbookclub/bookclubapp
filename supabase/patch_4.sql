-- New: organizer-editable attendance count, live-synced through the
-- existing meetings realtime subscription. Also re-creates publish_results
-- so the next meeting's headcount starts as a copy of this one's instead of
-- resetting to the schema default of 9.

create or replace function set_expected_voters(p_code text, p_meeting_id uuid, p_count integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not check_organizer_code(p_code) then
    raise exception 'wrong organizer code';
  end if;
  if p_count < 1 or p_count > 30 then
    raise exception 'expected_voters out of range';
  end if;

  update meetings set expected_voters = p_count where id = p_meeting_id and is_current;
end;
$$;
grant execute on function set_expected_voters(text, uuid, integer) to anon;

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

  update schedule
     set book_id = p_winner_id, provenance = 'voted'
   where id = (
     select id from schedule
      where book_id is null and meeting_date is not null
      order by sort_index asc limit 1
   );

  insert into meetings (candidate_ids, expected_voters)
    select array_agg(id), v_meeting.expected_voters from books where status = 'active';
end;
$$;
grant execute on function publish_results(text, uuid, text, jsonb, jsonb) to anon;
