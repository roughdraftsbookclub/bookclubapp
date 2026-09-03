-- Books scoring 0 or 1 approval votes now get culled the same night
-- (buildArchiveQueue / publish_results in index.html — no schema change
-- needed for that part, it's client-side logic feeding the existing
-- archive_queue plumbing).
--
-- What IS new here: any member can put a culled book straight back on the
-- table without the organizer passcode — same low-stakes trust model as
-- suggesting a book or claiming a host slot. This is deliberately a
-- separate, narrower function from toggle_book_archived (which stays
-- passcode-gated for the organizer's own admin-console archive/unarchive
-- toggle) — reactivate_book only ever moves archived -> active, nothing else.

create or replace function reactivate_book(p_book_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update books set
    status = 'active',
    archive_reason = null,
    archived_at = null,
    zero_vote_streak = 0,
    shortlist_misses = 0
  where id = p_book_id and status = 'archived';
end;
$$;
grant execute on function reactivate_book(text) to anon;
