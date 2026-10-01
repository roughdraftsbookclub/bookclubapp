-- Two organizer-console features so the shelf and the calendar can both be
-- managed from a phone on the road, instead of coming back to SQL.
--
-- 1. add_book — the console could edit and delete books but never add one.
--    ("Add books fast" and "Import from the club page" are stubs against a
--    made-up catalogue, see CLAUDE.md.) Adding is two steps, not one: the
--    row has to go into `books` AND onto the current meeting's ballot if
--    voting hasn't opened. Doing only the first is the exact drift that
--    blanked the ballot before the September meeting — a book on the shelf
--    that never reaches the vote. Both happen here, in one transaction.
--
-- 2. update_schedule_row gains location/location_note. The old signature
--    predates patch_9's columns, so there was no way to set an address for
--    any meeting, and no way at all to edit a month other than the next one.
--    Postgres treats a new parameter list as a new overload rather than a
--    replacement, so the old one is dropped first — otherwise both stay
--    callable and PostgREST can't tell which you meant.

create or replace function add_book(
  p_code               text,
  p_id                 text,
  p_title              text,
  p_author             text,
  p_isbn               text,
  p_isbn13             text,
  p_cover_url          text,
  p_cover_large        text,
  p_amazon             text,
  p_description        text,
  p_page_count         integer,
  p_first_publish_year integer,
  p_c1                 text,
  p_c2                 text
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
  if coalesce(trim(p_title), '') = '' then
    raise exception 'a book needs a title';
  end if;

  insert into books (
    id, title, author, isbn, isbn13, cover_url, cover_large, amazon,
    c1, c2, status, added_at, by_token, needs_review,
    description, page_count, first_publish_year
  ) values (
    p_id, trim(p_title), nullif(trim(coalesce(p_author,'')), ''),
    nullif(trim(coalesce(p_isbn,'')), ''), nullif(trim(coalesce(p_isbn13,'')), ''),
    nullif(trim(coalesce(p_cover_url,'')), ''), nullif(trim(coalesce(p_cover_large,'')), ''),
    nullif(trim(coalesce(p_amazon,'')), ''),
    coalesce(nullif(p_c1,''), '#1E3A5F'), coalesce(nullif(p_c2,''), '#0A1626'),
    'active', current_date, null, false,
    nullif(trim(coalesce(p_description,'')), ''), p_page_count, p_first_publish_year
  )
  on conflict (id) do nothing;

  -- ...and onto tonight's ballot, same guard as add_candidate_if_lobby. A
  -- book added once voting is open joins next month instead, which is the
  -- existing rule for member suggestions too — the candidate list must not
  -- move under a ballot already in progress.
  update meetings
     set candidate_ids = array_append(candidate_ids, p_id)
   where is_current and phase = 'lobby'
     and not (p_id = any(candidate_ids));
end;
$$;
grant execute on function add_book(text, text, text, text, text, text, text, text, text, text, integer, integer, text, text) to anon;


drop function if exists update_schedule_row(text, uuid, date, text, text, text, text);

create or replace function update_schedule_row(
  p_code          text,
  p_schedule_id   uuid,
  p_meeting_date  date,
  p_skip_reason   text,
  p_host          text,
  p_location      text,
  p_location_note text,
  p_book_id       text,
  p_provenance    text
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
    meeting_date  = p_meeting_date,
    skip_reason   = nullif(trim(coalesce(p_skip_reason,'')), ''),
    host          = nullif(trim(coalesce(p_host,'')), ''),
    location      = nullif(trim(coalesce(p_location,'')), ''),
    location_note = nullif(trim(coalesce(p_location_note,'')), ''),
    book_id       = p_book_id,
    provenance    = p_provenance
  where id = p_schedule_id;

  -- If the row just edited is the one the home screen is pointing at, keep
  -- them in step. Without this, fixing next month's address in the console
  -- would update the calendar but not the front page until the next publish.
  update club c set
    date          = s.meeting_date,
    host          = coalesce(s.host, ''),
    location      = coalesce(s.location, ''),
    location_note = coalesce(s.location_note, '')
    from schedule s
   where s.id = p_schedule_id and c.id = true and c.date = s.meeting_date;
end;
$$;
grant execute on function update_schedule_row(text, uuid, date, text, text, text, text, text, text) to anon;
