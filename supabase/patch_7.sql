-- New columns for the Open Library ingestion rewrite: description and page
-- count come from the specific edition the suggester picks, first_publish_year
-- from the work (the original publication, not the picked edition's). All
-- cached at suggestion time — never re-fetched on page render.

alter table books add column if not exists isbn13 text;
alter table books add column if not exists description text;
alter table books add column if not exists page_count integer;
alter table books add column if not exists first_publish_year integer;

-- update_book grows three params to match. Drop the old signature first —
-- Postgres treats a different parameter list as a new overload, not a
-- replacement, which would leave both callable and ambiguous via PostgREST.
drop function if exists update_book(text, text, text, text, text, text, text, text);

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
  p_first_publish_year integer
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
    description = p_description, page_count = p_page_count, first_publish_year = p_first_publish_year,
    needs_review = false
  where id = p_book_id;
end;
$$;
grant execute on function update_book(text, text, text, text, text, text, text, text, text, text, integer, integer) to anon;
