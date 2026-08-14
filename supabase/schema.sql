-- Rough Drafts Book Club — Supabase schema, step 1 of the backend plan in
-- CLAUDE.md ("Schema from the data model" + "Row Level Security from day
-- one"). Paste this whole file into the Supabase SQL editor for a fresh
-- project and run it once. No CLI, no migrations tool — matches the app's
-- own no-build-step philosophy.
--
-- Field names mirror STORE in index.html on purpose (see CLAUDE.md's Data
-- model section) so the mapping in app code stays obvious.

create extension if not exists pgcrypto;   -- gen_random_uuid()

create type book_status   as enum ('active','current','read','archived');
create type meeting_phase as enum ('lobby','approval','shortlist_review','ranked','results');


-- ============================================================================
-- 1. BOOKS
-- ============================================================================
create table books (
  id                  text primary key,                 -- 'bk' + short id, matches uid('bk')
  title               text not null,
  author              text,
  isbn                text,
  cover_url           text,
  cover_large         text,
  amazon              text,                              -- direct /dp/ link or a search fallback
  c1                  text not null,                      -- fallback-cover gradient colors
  c2                  text not null,
  glyph               text not null default '📖',
  status              book_status not null default 'active',
  added_at            date not null default current_date,
  by_token            text,                               -- null for the imported seed shelf
  needs_review        boolean not null default false,     -- member suggestion, metadata unverified
  meetings_considered integer not null default 0,
  zero_vote_streak    integer not null default 0,
  shortlist_misses    integer not null default 0,
  ever_shortlisted    boolean not null default false,
  archive_reason      text,
  archived_at         date,
  date_read           text                                -- "July 2026" style label, not a real date
);

-- Suggestions lock the moment Phase One opens (CLAUDE.md), so the app reads
-- books once per meeting rather than live — no realtime subscription needed
-- on this table, just a normal select on page load / after a suggestion.
alter table books enable row level security;

create policy "anyone can read the shelf"
  on books for select
  using (true);

-- Members can suggest a book any time. They can only ever insert as
-- 'active' + needs_review, never as archived/current/read, and never
-- pre-clear the review flag for themselves — the organizer clears that.
-- needs_review is NOT forced true here: a suggestion confirmed through the
-- Open Library lookup already carries a real cover and author and skips the
-- review queue (CLAUDE.md); only the "add without a cover" fallback path sets
-- needs_review = true client-side. Requiring it here would silently reject
-- every normal, confirmed suggestion.
create policy "anyone can suggest a book"
  on books for insert
  with check (status = 'active' and by_token is not null);

-- No update/delete policy for the anon role at all: editing metadata,
-- archiving, sparing, and status changes are organizer actions and go
-- through the SECURITY DEFINER functions below instead, so a passcode
-- check always sits between "anyone on the internet" and a book mutation.


-- ============================================================================
-- 2. CLUB SETTINGS (singleton row)
-- ============================================================================
create table club (
  id             boolean primary key default true,
  constraint club_singleton check (id),   -- only one row can ever exist
  auto_date      boolean not null default true,
  date           date,
  time           text,
  host           text,
  location       text,
  location_note  text,
  current_book_id text references books(id)
);
insert into club (id) values (true);

alter table club enable row level security;

create policy "anyone can read club settings"
  on club for select
  using (true);
-- Writes go through update_club_settings() below.


-- ============================================================================
-- 3. MEETINGS
-- One row per meeting; is_current marks the one live meeting phones should
-- be looking at. The organizer's browser still computes the shortlist, the
-- archive queue, and the IRV winner — that logic already has a 20,000- and
-- 4,000-meeting fuzzed test suite in tests/. The database's job is to make
-- the transition durable and visible to every phone, not to recompute it.
-- ============================================================================
create table meetings (
  id             uuid primary key default gen_random_uuid(),
  date           date not null default current_date,
  is_practice    boolean not null default false,
  phase          meeting_phase not null default 'lobby',
  is_current     boolean not null default true,
  candidate_ids  text[] not null default '{}',
  shortlist_ids  text[],
  cut_short      jsonb,
  tie            jsonb,
  result         jsonb,
  archive_queue  jsonb,
  expected_voters integer not null default 9,
  created_at     timestamptz not null default now()
);

-- Only one "current" meeting at a time, so phones never have to guess which
-- row to subscribe to.
create unique index one_current_meeting on meetings (is_current) where is_current;

alter table meetings enable row level security;

create policy "anyone can read meetings"
  on meetings for select
  using (true);
-- Writes go through advance_phase() / publish_results() / start_meeting()
-- below — never a direct anon update, so a stray client bug can't skip a
-- phase or reopen a closed round for everyone at once.


-- ============================================================================
-- 4. BALLOTS
-- One row per token per phase per meeting. This is the one table where the
-- write credential really is just "knowing the token" — the same "speed
-- bump, not security" trust model CLAUDE.md already accepts for the
-- organizer passcode, sized for nine friends, not a public API.
-- ============================================================================
create table ballots (
  id          uuid primary key default gen_random_uuid(),
  meeting_id  uuid not null references meetings(id) on delete cascade,
  token       text not null,
  phase       text not null check (phase in ('approval','ranked')),
  book_ids    text[] not null default '{}',
  updated_at  timestamptz not null default now(),
  unique (meeting_id, token, phase)          -- re-voting is an upsert, not a new row
);

alter table ballots enable row level security;

create policy "anyone can read ballots"
  on ballots for select
  using (true);

create policy "anyone can cast or change their own ballot"
  on ballots for insert
  with check (true);

create policy "anyone can update a ballot by token"
  on ballots for update
  using (true)
  with check (true);


-- ============================================================================
-- 5. ORGANIZER SECRET
-- Deliberately its own table with NO policies at all — RLS defaults to deny
-- when a table has rows but no matching policy, so the anon key can never
-- select this table under any circumstance. Only a SECURITY DEFINER
-- function (owned by the table owner, bypassing RLS) can read it.
-- ============================================================================
create table organizer_secret (
  id    boolean primary key default true,
  constraint organizer_secret_singleton check (id),
  code  text not null
);
insert into organizer_secret (id, code) values (true, '4021');   -- change after go-live
alter table organizer_secret enable row level security;
-- No create policy statements here on purpose.


-- ============================================================================
-- 6. ORGANIZER ACTIONS
-- Every organizer mutation is a SECURITY DEFINER function that re-checks the
-- passcode server-side before touching anything — this is what "move the
-- passcode server-side" (CLAUDE.md, What's stubbed) actually means: today
-- the check is a JS string compare anyone can read in page source, so
-- nothing stops a request that skips the UI. After this, the database
-- itself refuses the write without the code, regardless of what called it.
--
-- Two examples below establish the pattern. More organizer actions (editing
-- a book's metadata, sparing/archiving individual books, updating club
-- settings) get added the same way as the client code that calls them is
-- written, rather than speculatively now.
-- ============================================================================

create or replace function check_organizer_code(p_code text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from organizer_secret where code = p_code);
$$;
-- Callable by anon so the console gate can validate what the organizer just
-- typed, but it only ever returns true/false — it never returns the code.
grant execute on function check_organizer_code(text) to anon;


create or replace function advance_phase(
  p_code          text,
  p_meeting_id    uuid,
  p_new_phase     meeting_phase,
  p_shortlist_ids text[]  default null,
  p_cut_short     jsonb   default null,
  p_result        jsonb   default null,
  p_archive_queue jsonb   default null
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

  update meetings
     set phase         = p_new_phase,
         shortlist_ids = coalesce(p_shortlist_ids, shortlist_ids),
         cut_short     = coalesce(p_cut_short, cut_short),
         result        = coalesce(p_result, result),
         archive_queue = coalesce(p_archive_queue, archive_queue)
   where id = p_meeting_id and is_current;
end;
$$;
grant execute on function advance_phase(text, uuid, meeting_phase, text[], jsonb, jsonb, jsonb) to anon;


-- Suggesting a book is never organizer-gated (CLAUDE.md), but a book added
-- while the lobby is open still has to join tonight's ballot — that's
-- bookkeeping on the meetings row, which anon otherwise can't touch. No
-- passcode check here on purpose; only the phase='lobby' guard.
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


-- Publishing is the one moment that mutates permanent book records, so it's
-- a single transaction rather than several round trips a half-loaded phone
-- could leave half-applied. The organizer's browser has already computed
-- the winner, the approval tally and the (possibly spared-down) archive
-- queue via the existing tested JS — this just makes it durable and visible
-- to every phone at once.
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
    -- real meeting with the shelf as it stands.
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
  update schedule
     set book_id = p_winner_id, provenance = 'voted'
   where id = (
     select id from schedule
      where book_id is null and meeting_date is not null
      order by sort_index asc limit 1
   );

  -- Next meeting's headcount starts as a copy of this one's — the common
  -- case is confirming it's still right, not entering it from scratch.
  insert into meetings (candidate_ids, expected_voters)
    select array_agg(id), v_meeting.expected_voters from books where status = 'active';
end;
$$;
grant execute on function publish_results(text, uuid, text, jsonb, jsonb) to anon;


-- Club settings (date/time/host/location) are organizer-editable, same
-- passcode-gated pattern as everything above.
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


-- ============================================================================
-- 8. SCHEDULE
-- One row per meeting, past or future — not to be confused with `meetings`,
-- which is live voting state for whichever meeting is happening right now.
-- This is calendar/planning: who's hosting, which book gets discussed there,
-- and where that book came from (a real vote, or a seed pick from before the
-- app existed — City of Thieves has no vote behind it at all).
--
-- Rows are seeded directly, not computed from the second-Thursday rule —
-- the rule still holds most months, but every row needs to exist anyway to
-- hang a host and a book off, and a skipped month (December) has to be an
-- exception regardless. Rows are cheaper than a rule plus an override table.
-- `sort_index` orders rows explicitly rather than by `meeting_date`, since a
-- skipped month has no date at all.
-- ============================================================================
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

-- Claiming an empty slot is exactly as low-stakes as suggesting a book —
-- no passcode, just a guard that you can't overwrite someone already there.
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

-- Everything else about the schedule — reassigning a host, fixing a date,
-- correcting which book landed where — is an organizer correction, same
-- passcode-gated pattern as every other organizer action.
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

-- Attendance drives the "X of N voted" display only — nothing is gated by
-- it. Editable any time, including mid-vote, since people arrive late; the
-- existing realtime subscription on `meetings` is what makes a change here
-- push to every phone live, same as a vote count already does.
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


-- ============================================================================
-- 7. REALTIME
-- Turns on broadcasting for the tables the client subscribes to. RLS still
-- governs what any given connection actually receives — this only flips
-- broadcasting on at all.
-- ============================================================================
alter publication supabase_realtime add table books, club, meetings, ballots, schedule;
