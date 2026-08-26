/**
 * Local SQLite document store.
 *
 * A schema-free JSON document table keyed by `(collection, id)` backs every
 * generic CRUD route, so new frontend domains persist without migrations.
 * Timestamps are stored both in columns (for ordering) and inside the
 * document body (for the frontend date conversion).
 */
use std::io;
use std::path::Path;
use std::sync::Mutex;

use rusqlite::Connection;
use serde_json::Value;

/// Tokenize a raw query into FTS5 terms: CJK bigrams + latin words. This is
/// the same segmentation basis as the keyword scorer, so indexed search and
/// fallback scoring agree on what "matches" means.
pub(crate) fn fts_terms(query: &str) -> Vec<String> {
    let mut terms: Vec<String> = Vec::new();
    let mut latin = String::new();
    let flush_latin = |latin: &mut String, terms: &mut Vec<String>| {
        if latin.chars().count() >= 2 {
            terms.push(latin.to_lowercase());
        }
        latin.clear();
    };
    let chars: Vec<char> = query.chars().collect();
    for window in chars.windows(2) {
        let (a, b) = (window[0], window[1]);
        let a_cjk = is_cjk(a);
        let b_cjk = is_cjk(b);
        if a_cjk && b_cjk {
            flush_latin(&mut latin, &mut terms);
            terms.push(format!("{a}{b}"));
        } else {
            if a.is_ascii_alphanumeric() {
                latin.push(a);
            } else {
                flush_latin(&mut latin, &mut terms);
            }
            if !b.is_ascii_alphanumeric() {
                flush_latin(&mut latin, &mut terms);
            }
        }
    }
    // Trailing single char / latin tail.
    if let Some(&last) = chars.last() {
        if last.is_ascii_alphanumeric() {
            latin.push(last);
        }
    }
    flush_latin(&mut latin, &mut terms);
    terms.sort();
    terms.dedup();
    terms.into_iter().take(24).collect()
}

fn is_cjk(c: char) -> bool {
    matches!(c as u32, 0x4E00..=0x9FFF | 0x3400..=0x4DBF)
}

/// Thin wrapper around a single SQLite connection. The embedded server is
/// single-user and local, so a mutex-guarded connection is sufficient.
pub struct Store {
    conn: Mutex<Connection>,
}

/// Space-join CJK bigrams while keeping latin words intact: the index
/// counterpart of [`fts_terms`].
fn segment_cjk(text: &str) -> String {
    let mut out = String::with_capacity(text.len() * 2);
    let mut latin = String::new();
    let chars: Vec<char> = text.chars().collect();
    for window in chars.windows(2) {
        let (a, b) = (window[0], window[1]);
        if is_cjk(a) && is_cjk(b) {
            if !latin.is_empty() {
                out.push_str(&latin);
                out.push(' ');
                latin.clear();
            }
            out.push(a);
            out.push(b);
            out.push(' ');
        } else {
            if a.is_ascii_alphanumeric() {
                latin.push(a);
            } else if !latin.is_empty() {
                out.push_str(&latin);
                out.push(' ');
                latin.clear();
            }
        }
    }
    if let Some(&last) = chars.last() {
        if last.is_ascii_alphanumeric() {
            latin.push(last);
        }
    }
    if !latin.is_empty() {
        out.push_str(&latin);
        out.push(' ');
    }
    out
}

impl Store {
    /// Open (and migrate) the database file.
    pub fn open(path: &Path) -> io::Result<Self> {
        let conn = Connection::open(path)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("open sqlite: {e}")))?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS documents (
                collection  TEXT NOT NULL,
                id          TEXT NOT NULL,
                data        TEXT NOT NULL,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL,
                PRIMARY KEY (collection, id)
            );
            CREATE INDEX IF NOT EXISTS idx_documents_collection
                ON documents (collection, created_at);
            CREATE TABLE IF NOT EXISTS meta (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            -- PLAT-07 FTS5 full-text index over every stored document's
            -- string values (会话/文档 both land here). Kept in sync by the
            -- insert/update/delete paths below.
            CREATE VIRTUAL TABLE IF NOT EXISTS fts_documents USING fts5(
                collection UNINDEXED,
                doc_id UNINDEXED,
                body
            );",
        )
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("migrate sqlite: {e}")))?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Read a metadata value.
    pub fn get_meta(&self, key: &str) -> Option<String> {
        let conn = self.conn.lock().ok()?;
        conn.query_row("SELECT value FROM meta WHERE key = ?1", [key], |row| {
            row.get::<_, String>(0)
        })
        .ok()
    }

    /// Write a metadata value.
    pub fn set_meta(&self, key: &str, value: &str) {
        if let Ok(conn) = self.conn.lock() {
            let _ = conn.execute(
                "INSERT INTO meta (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                [key, value],
            );
        }
    }

    /// Return the persistent JWT secret, creating one on first run.
    pub fn get_or_create_secret(&self) -> String {
        if let Some(secret) = self.get_meta("jwt_secret") {
            return secret;
        }
        // Two random UUIDs concatenated yield 32 bytes of entropy (hex)
        let secret = format!("{}{}", uuid::Uuid::new_v4(), uuid::Uuid::new_v4());
        self.set_meta("jwt_secret", &secret);
        secret
    }

    /// List all documents of a collection in creation order.
    pub fn list(&self, collection: &str) -> Vec<Value> {
        self.query_docs(
            "SELECT data FROM documents WHERE collection = ?1 ORDER BY created_at ASC",
            collection,
        )
    }

    /// Fetch a single document.
    pub fn get(&self, collection: &str, id: &str) -> Option<Value> {
        let conn = self.conn.lock().ok()?;
        conn.query_row(
            "SELECT data FROM documents WHERE collection = ?1 AND id = ?2",
            [collection, id],
            |row| row.get::<_, String>(0),
        )
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
    }

    /// Insert a document. `doc` must be a JSON object; its `id` field is
    /// enforced to match `id`. Returns the stored document with timestamps.
    pub fn insert(&self, collection: &str, id: &str, mut doc: Value) -> io::Result<Value> {
        let now = now_iso8601();
        if !doc.is_object() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "document must be a JSON object",
            ));
        }
        let obj = doc.as_object_mut().expect("checked is_object");
        obj.insert("id".to_string(), Value::String(id.to_string()));
        obj.insert("created_at".to_string(), Value::String(now.clone()));
        obj.insert("updated_at".to_string(), Value::String(now.clone()));

        let body =
            serde_json::to_string(&doc).map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
        {
            let conn = self.conn.lock().map_err(poisoned)?;
            conn.execute(
                "INSERT INTO documents (collection, id, data, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?4)",
                rusqlite::params![collection, id, body, now],
            )
            .map_err(sql_err)?;
            let _ = conn.execute(
                "INSERT INTO fts_documents (collection, doc_id, body) VALUES (?1, ?2, ?3)",
                rusqlite::params![collection, id, Self::fts_body(&doc)],
            );
        }
        Ok(doc)
    }

    /// Extract every string value from a JSON document (depth-first) as the
    /// full-text body — titles, message contents, names all become searchable.
    /// CJK runs are segmented into space-joined bigrams so FTS5's unicode61
    /// tokenizer (which treats a CJK run as ONE token) indexes them the same
    /// way the query side phrases its bigram terms.
    fn fts_body(doc: &Value) -> String {
        fn walk(value: &Value, out: &mut String) {
            match value {
                Value::String(s) => {
                    out.push_str(&segment_cjk(s));
                    out.push(' ');
                }
                Value::Array(items) => items.iter().for_each(|v| walk(v, out)),
                Value::Object(map) => map.values().for_each(|v| walk(v, out)),
                _ => {}
            }
        }
        let mut body = String::new();
        walk(doc, &mut body);
        body
    }

    /// FTS5 MATCH query over a collection's documents (PLAT-07 会话/文档
    /// 全文检索). CJK queries arrive as OR-joined bigrams so unsegmented
    /// text still matches, mirroring the scoring basis of the v1 keyword path.
    pub fn search(&self, collection: &str, query: &str, limit: usize) -> Vec<Value> {
        let terms = fts_terms(query);
        if terms.is_empty() {
            return Vec::new();
        }
        let match_expr = terms
            .iter()
            .map(|t| format!("\"{t}\""))
            .collect::<Vec<_>>()
            .join(" OR ");
        let conn = match self.conn.lock() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };
        let mut stmt = match conn.prepare(
            "SELECT d.data FROM fts_documents f
             JOIN documents d ON d.collection = f.collection AND d.id = f.doc_id
             WHERE fts_documents MATCH ?1 AND f.collection = ?2
             ORDER BY rank LIMIT ?3",
        ) {
            Ok(stmt) => stmt,
            Err(_) => return Vec::new(),
        };
        let rows = stmt
            .query_map(
                rusqlite::params![match_expr, collection, limit as i64],
                |r| {
                    let data: String = r.get(0)?;
                    Ok(data)
                },
            )
            .ok();
        let Some(rows) = rows else {
            return Vec::new();
        };
        rows.filter_map(|row| {
            let data = row.ok()?;
            serde_json::from_str(&data).ok()
        })
        .collect()
    }

    /// Shallow-merge a patch into an existing document and return it.
    pub fn update(&self, collection: &str, id: &str, patch: &Value) -> Option<Value> {
        let mut doc = self.get(collection, id)?;
        let obj = doc.as_object_mut()?;
        let patch_obj = patch.as_object()?;
        for (key, value) in patch_obj {
            obj.insert(key.clone(), value.clone());
        }
        obj.insert("updated_at".to_string(), Value::String(now_iso8601()));

        let body = serde_json::to_string(&doc).ok()?;
        {
            let conn = self.conn.lock().ok()?;
            conn.execute(
                "UPDATE documents SET data = ?3, updated_at = ?4
                 WHERE collection = ?1 AND id = ?2",
                rusqlite::params![collection, id, body, now_iso8601()],
            )
            .ok()?;
            let _ = conn.execute(
                "DELETE FROM fts_documents WHERE collection = ?1 AND doc_id = ?2",
                [collection, id],
            );
            let _ = conn.execute(
                "INSERT INTO fts_documents (collection, doc_id, body) VALUES (?1, ?2, ?3)",
                rusqlite::params![collection, id, Self::fts_body(&doc)],
            );
        }
        Some(doc)
    }

    /// Delete a document; returns whether a row was removed.
    pub fn delete(&self, collection: &str, id: &str) -> bool {
        let Ok(conn) = self.conn.lock() else {
            return false;
        };
        let removed = conn
            .execute(
                "DELETE FROM documents WHERE collection = ?1 AND id = ?2",
                [collection, id],
            )
            .map(|n| n > 0)
            .unwrap_or(false);
        let _ = conn.execute(
            "DELETE FROM fts_documents WHERE collection = ?1 AND doc_id = ?2",
            [collection, id],
        );
        removed
    }

    /// Count documents in a collection.
    pub fn count(&self, collection: &str) -> i64 {
        let Ok(conn) = self.conn.lock() else {
            return 0;
        };
        conn.query_row(
            "SELECT COUNT(*) FROM documents WHERE collection = ?1",
            [collection],
            |row| row.get::<_, i64>(0),
        )
        .unwrap_or(0)
    }

    /// List documents where `field` equals `value` (in-memory filter).
    pub fn filter_eq(&self, collection: &str, field: &str, value: &str) -> Vec<Value> {
        self.list(collection)
            .into_iter()
            .filter(|doc| {
                doc.get(field)
                    .and_then(Value::as_str)
                    .map(|v| v == value)
                    .unwrap_or(false)
            })
            .collect()
    }

    fn query_docs(&self, sql: &str, collection: &str) -> Vec<Value> {
        let Ok(conn) = self.conn.lock() else {
            return Vec::new();
        };
        let Ok(mut stmt) = conn.prepare(sql) else {
            return Vec::new();
        };
        let rows = stmt.query_map([collection], |row| row.get::<_, String>(0));
        match rows {
            Ok(rows) => rows
                .filter_map(|row| row.ok())
                .filter_map(|raw| serde_json::from_str(&raw).ok())
                .collect(),
            Err(_) => Vec::new(),
        }
    }
}

/// UTC timestamp in ISO 8601 (parseable by the frontend date converter).
fn now_iso8601() -> String {
    chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string()
}

fn poisoned<T>(_: T) -> io::Error {
    io::Error::new(io::ErrorKind::Other, "sqlite mutex poisoned")
}

fn sql_err(e: rusqlite::Error) -> io::Error {
    io::Error::new(io::ErrorKind::Other, format!("sqlite: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn store(tag: &str) -> Store {
        let dir = std::env::temp_dir().join(format!("mofa-fts-test-{tag}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("mkdir");
        Store::open(&dir.join("t.db")).expect("open")
    }

    #[test]
    fn fts_terms_segments_cjk_bigrams_and_latin_words() {
        assert_eq!(fts_terms("橘猫 窗台"), vec!["橘猫", "窗台"]);
        assert_eq!(fts_terms("橘猫坐"), vec!["橘猫", "猫坐"]);
        assert_eq!(fts_terms("Hello World"), vec!["hello", "world"]);
        assert!(fts_terms("a").is_empty());
        assert!(fts_terms("、。").is_empty());
    }

    #[test]
    fn search_finds_cjk_and_latin_and_stays_in_collection() {
        let store = store("search");
        store
            .insert(
                "conversation",
                "c1",
                serde_json::json!({ "title": "橘猫饲养记录" }),
            )
            .unwrap();
        store
            .insert(
                "conversation",
                "c2",
                serde_json::json!({ "title": "咖啡冲煮笔记" }),
            )
            .unwrap();
        store
            .insert("rag_doc", "d1", serde_json::json!({ "name": "橘猫手册" }))
            .unwrap();

        let hits = store.search("conversation", "橘猫", 10);
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0]["id"], "c1");

        store
            .insert(
                "conversation",
                "c3",
                serde_json::json!({ "title": "Latte recipe notes" }),
            )
            .unwrap();
        assert_eq!(store.search("conversation", "latte", 10).len(), 1);

        assert_eq!(store.search("conversation", "手册", 10).len(), 0);

        store
            .update(
                "conversation",
                "c1",
                &serde_json::json!({ "title": "布偶猫饲养记录" }),
            )
            .unwrap();
        assert_eq!(store.search("conversation", "橘猫", 10).len(), 0);
        assert_eq!(store.search("conversation", "布偶", 10).len(), 1);

        assert!(store.delete("conversation", "c3"));
        assert_eq!(store.search("conversation", "latte", 10).len(), 0);
    }
}
