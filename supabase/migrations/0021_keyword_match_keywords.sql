create table keyword_match_keywords (
  source text not null,
  external_id text not null,
  keyword text not null,
  primary key (source, external_id, keyword)
);
comment on table keyword_match_keywords is 'Which watched keyword(s) matched each keyword_matches row — a post matching two watched keywords gets one keyword_matches row and two rows here.';

insert into keyword_match_keywords (source, external_id, keyword)
select source, external_id, keyword from keyword_matches;

delete from keyword_matches a using keyword_matches b
where a.source = b.source and a.external_id = b.external_id and a.ctid < b.ctid;

alter table keyword_matches drop constraint keyword_matches_pkey;
alter table keyword_matches drop column keyword;
alter table keyword_matches add primary key (source, external_id);

alter table keyword_match_keywords
  add constraint keyword_match_keywords_match_fkey
  foreign key (source, external_id) references keyword_matches (source, external_id) on delete cascade;

alter table keyword_match_keywords enable row level security;

create index keyword_match_keywords_keyword_source_idx on keyword_match_keywords (keyword, source);
