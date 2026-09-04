-- One-time catch-up: applies the new low-vote cull rule (patch_8.sql,
-- CONFIG.lowVoteCullMax) retroactively to the club's first real meeting
-- (2026-08-10), since that vote happened before the rule existed. Same
-- effect buildArchiveQueue()/publish_results would have produced live —
-- same status, same reason strings, same archived_at.
--
-- Excludes anything shortlisted that night (bk15, bk9, bk3, bk12, bk7,
-- bkyo9soic, bkx5fsr2q, bk1) and the three candidates already deleted
-- (bku9jcy56, bkxkbdfgd, bkyzoqff2 — the suspect romance-novel entries).
-- Every book below is confirmed still 'active' as of this writing.

update books set status = 'archived', archive_reason = 'Got no votes at the last meeting', archived_at = current_date
  where id = 'bk6' and status = 'active';   -- The Hitchhiker's Guide to the Galaxy

update books set status = 'archived', archive_reason = 'Got only 1 vote at the last meeting', archived_at = current_date
  where id in ('bk4','bk11','bk10','bkr241ze7','bkqpuetqu','bk16','bk17') and status = 'active';
  -- In the Heart of the Sea, The Godfather, 1984, City on fire,
  -- No Country for Old Men, Meditations, Man's Search for Meaning
