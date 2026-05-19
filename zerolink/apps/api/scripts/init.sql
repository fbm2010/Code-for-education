-- Enable extensions needed by ZeroLink
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Full-text search configuration using unaccent
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS zerolink_fts (COPY = pg_catalog.english);
ALTER TEXT SEARCH CONFIGURATION zerolink_fts
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, english_stem;
