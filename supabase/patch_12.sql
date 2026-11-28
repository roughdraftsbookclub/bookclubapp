-- patch_12 — theme selection, stored as data so it can be switched and
-- reverted without a deploy.
--
-- The client reads club.theme and sets <html data-theme="...">. An empty or
-- unrecognised value means the ORIGINAL palette, so:
--
--   * the client is safe to ship before this runs (select('*') simply does
--     not return a column that doesn't exist, and absent = default), and
--   * a bad value cannot leave the app half-painted — THEMES_ALLOWED in
--     index.html is the whitelist and anything else falls back.
--
-- Why data and not a deploy: switching propagates to every open phone over
-- the rd-club realtime channel that already exists, and REVERTING IS ONE
-- ROW UPDATE. During a meeting that is the difference between five seconds
-- and a git revert plus a Pages rebuild. That is the whole reason this
-- column exists.
--
-- Run the whole file. Safe to re-run.

-- 1. The column -----------------------------------------------------------
alter table club add column if not exists theme text;

-- 2. Turn the theme on -----------------------------------------------------
-- Comment this out if you would rather deploy it dormant and flip it later.
update club set theme = 'lonesome' where id = true;

-- 3. An RPC so a console button can do it later ----------------------------
-- A new function, not a changed signature, so there is no overload to drop
-- (see the patch_10 note). Passcode-gated like every other organizer write.
create or replace function set_theme(p_code text, p_theme text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not check_organizer_code(p_code) then
    raise exception 'wrong organizer code';
  end if;
  -- Deliberately not validated against a list here. The client whitelist is
  -- the real gate, and a value it does not recognise renders the default
  -- palette rather than something broken. Keeping the database permissive
  -- means a future theme needs no migration.
  update club set theme = nullif(btrim(coalesce(p_theme, '')), '') where id = true;
end;
$$;
grant execute on function set_theme(text, text) to anon;

-- =========================================================================
-- TO REVERT, DURING A MEETING OR OTHERWISE
-- =========================================================================
--     update club set theme = null where id = true;
--
-- Every open phone repaints to the original palette within a second or two.
-- No deploy, no cache, nothing to rebuild.

-- Verify
select theme,
       case when theme is null or theme = '' then 'ORIGINAL palette'
            else 'themed: ' || theme end as rendering
  from club where id = true;
