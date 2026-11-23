-- Teljes szöveges kereső index (FTS5). Az alkalmazás tartja karban (src/server/search.ts).
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  profile_id UNINDEXED,
  content,
  tokenize = "unicode61 remove_diacritics 2"
);
