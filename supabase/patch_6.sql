-- Fix: toggle_book_archived's CASE expression returned plain text, which
-- Postgres won't implicitly cast to the book_status enum column. Caught
-- live during verification — confirm_book, update_book, and delete_book
-- all worked correctly; only the archive/reactivate toggle needed this.

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
    status = (case when status = 'archived' then 'active' else 'archived' end)::book_status,
    archive_reason = case when status = 'archived' then null else 'Archived by organizer' end,
    archived_at = case when status = 'archived' then null else current_date end
  where id = p_book_id and status in ('active', 'archived');
end;
$$;
grant execute on function toggle_book_archived(text, text) to anon;
