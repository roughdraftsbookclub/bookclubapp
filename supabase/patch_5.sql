-- Wires the admin Books tab for real. Four organizer-gated functions —
-- confirm, edit, archive/reactivate, delete — replacing what used to be
-- in-memory-only mutations that silently reverted on reload.

create or replace function confirm_book(p_code text, p_book_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not check_organizer_code(p_code) then
    raise exception 'wrong organizer code';
  end if;
  update books set needs_review = false where id = p_book_id;
end;
$$;
grant execute on function confirm_book(text, text) to anon;

create or replace function update_book(
  p_code        text,
  p_book_id     text,
  p_title       text,
  p_author      text,
  p_isbn        text,
  p_cover_url   text,
  p_cover_large text,
  p_amazon      text
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
    title = p_title, author = p_author, isbn = p_isbn,
    cover_url = p_cover_url, cover_large = p_cover_large, amazon = p_amazon,
    needs_review = false
  where id = p_book_id;
end;
$$;
grant execute on function update_book(text, text, text, text, text, text, text, text) to anon;

create or replace function toggle_book_archived(p_code text, p_book_id text)
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
    status = case when status = 'archived' then 'active' else 'archived' end,
    archive_reason = case when status = 'archived' then null else 'Archived by organizer' end,
    archived_at = case when status = 'archived' then null else current_date end
  where id = p_book_id and status in ('active', 'archived');
end;
$$;
grant execute on function toggle_book_archived(text, text) to anon;

create or replace function delete_book(p_code text, p_book_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not check_organizer_code(p_code) then
    raise exception 'wrong organizer code';
  end if;
  delete from books where id = p_book_id and status in ('active', 'archived');
end;
$$;
grant execute on function delete_book(text, text) to anon;
