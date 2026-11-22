-- patch_11 — an optional note from whoever suggested a book.
--
-- Organizer's call, 2026-11-22, reversing the original "no 'why do you
-- recommend it' field" decision in CLAUDE.md. Recorded there too so nobody
-- removes it again on the strength of the old note.
--
-- Capped at 280 characters in the UI and again here. The brief's governing
-- rule is that the app is not the book club: a short line for the group is
-- the point, a review nobody reads on a phone is not.
--
-- Run the whole file. Safe to re-run.

-- 1. The column -----------------------------------------------------------
-- Nullable, no default: a book with no note is the normal case, including
-- every one of the 43 already on the shelf.
alter table books add column if not exists member_note text;

-- Belt and braces behind the UI's maxlength, which a determined client can
-- simply ignore. Dropped first so re-running doesn't error on the existing
-- constraint.
alter table books drop constraint if exists books_member_note_len;
alter table books add  constraint books_member_note_len
  check (member_note is null or char_length(member_note) <= 280);

-- No RLS change needed: the members-can-insert policy is
--   with check (status = 'active' and by_token is not null)
-- which is column-agnostic, so the new column rides along with the insert
-- commitSuggestion() already does.

-- 2. update_book gains p_member_note ---------------------------------------
-- The OLD signature is dropped FIRST and explicitly. Postgres treats a
-- different parameter list as a NEW overload rather than a replacement, so
-- `create or replace` alone would leave both callable — and PostgREST then
-- cannot decide which one a request means, failing with an ambiguity error
-- that looks nothing like the actual cause. Same trap as patch_10.
drop function if exists update_book(
  text, text, text, text, text, text, text, text, text, text, integer, integer);

create or replace function update_book(
  p_code               text,
  p_book_id            text,
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
  p_member_note        text
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
  update books set
    title = p_title, author = p_author, isbn = p_isbn, isbn13 = p_isbn13,
    cover_url = p_cover_url, cover_large = p_cover_large, amazon = p_amazon,
    description = p_description, page_count = p_page_count,
    first_publish_year = p_first_publish_year,
    -- Clearing the box removes the note. This is the only free text a member
    -- can put in front of the whole club, so the organizer needs a way to
    -- take it down without reaching for SQL.
    member_note = nullif(btrim(coalesce(p_member_note, '')), ''),
    needs_review = false
  where id = p_book_id;
end;
$$;
grant execute on function update_book(
  text, text, text, text, text, text, text, text, text, text, integer, integer, text) to anon;

-- 3. Verify ----------------------------------------------------------------
select
  (select count(*) from information_schema.columns
     where table_name = 'books' and column_name = 'member_note')          as member_note_column,
  (select count(*) from pg_proc where proname = 'update_book')            as update_book_overloads,
  (select count(*) from books where member_note is not null)              as books_with_a_note;

-- member_note_column should be 1.
-- update_book_overloads MUST be 1 — a 2 means the old signature survived and
-- PostgREST will start failing on ambiguity. Re-run the drop above if so.
