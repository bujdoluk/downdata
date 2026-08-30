-- Splits keyword_matches (0020) into the captured post/comment content and
-- a separate many-to-many join to whichever watched keyword(s) found it.
-- Previously keyed (source, keyword, external_id), so the same real post
-- matching two watched keywords was stored as two duplicate rows with
-- identical content — no way to show "this one post matched both terms",
-- and the Early Warnings feed showed it twice. 0020 is already live in
-- production (confirmed: keyword_matches/keyword_watches already exist in
-- Supabase), so this reshapes real data rather than a fresh create.

-- Join table first (no FK yet — added below, once keyword_matches has its
-- new primary key to reference). Same "global cache, service-role only,
-- zero policies" shape as keyword_matches itself.
create table keyword_match_keywords (
  source text not null,
  external_id text not null,
  keyword text not null,
  primary key (source, external_id, keyword)
);
comment on table keyword_match_keywords is 'Which watched keyword(s) matched each keyword_matches row — a post matching two watched keywords gets one keyword_matches row and two rows here.';

-- Backfill before keyword_matches loses its keyword column below — this is
-- the only place that information still exists.
insert into keyword_match_keywords (source, external_id, keyword)
select source, external_id, keyword from keyword_matches;

-- Collapse the old (source, keyword, external_id)-keyed duplicates down to
-- one row per real post. Content is identical across the duplicates (same
-- post, captured under different keyword searches), so which physical row
-- survives doesn't matter — the old primary key is still in effect here,
-- which is fine, this delete doesn't violate it (each remaining row still
-- has a distinct keyword value until the column is dropped next).
delete from keyword_matches a using keyword_matches b
where a.source = b.source and a.external_id = b.external_id and a.ctid < b.ctid;

alter table keyword_matches drop constraint keyword_matches_pkey;
alter table keyword_matches drop column keyword;
alter table keyword_matches add primary key (source, external_id);

alter table keyword_match_keywords
  add constraint keyword_match_keywords_match_fkey
  foreign key (source, external_id) references keyword_matches (source, external_id) on delete cascade;

alter table keyword_match_keywords enable row level security;

-- Supports the read path's `.in("keyword", ownKeywords).in("source",
-- enabledSources)` filter (lib/earlyWarnings.ts's getMatchesForOwnKeywords)
-- — the primary key's leading column is source, not keyword, so that query
-- shape needs its own index rather than reusing the PK.
create index keyword_match_keywords_keyword_source_idx on keyword_match_keywords (keyword, source);
