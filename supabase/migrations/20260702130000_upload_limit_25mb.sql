-- Lower the archive size cap to 25 MB (matches the web form + push API).
-- Keeps the free-tier 1 GB storage bucket from filling up fast; source-only
-- vibe projects fit comfortably. Existing larger files are unaffected.
update storage.buckets
   set file_size_limit = 26214400  -- 25 MB
 where id = 'repositories';
