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

/// Thin wrapper around a single SQLite connection. The embedded server is
/// single-user and local, so a mutex-guarded connection is sufficient.
pub struct Store {
    conn: Mutex<Connection>,
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

        let body = serde_json::to_string(&doc)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
        {
            let conn = self.conn.lock().map_err(poisoned)?;
            conn.execute(
                "INSERT INTO documents (collection, id, data, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?4)",
                rusqlite::params![collection, id, body, now],
            )
            .map_err(sql_err)?;
        }
        Ok(doc)
    }

    /// Shallow-merge a patch into an existing document and return it.
    pub fn update(&self, collection: &str, id: &str, patch: &Value) -> Option<Value> {
        let mut doc = self.get(collection, id)?;
        let obj = doc.as_object_mut()?;
        let patch_obj = patch.as_object()?;
        for (key, value) in patch_obj {
            obj.insert(key.clone(), value.clone());
        }
        obj.insert(
            "updated_at".to_string(),
            Value::String(now_iso8601()),
        );

        let body = serde_json::to_string(&doc).ok()?;
        {
            let conn = self.conn.lock().ok()?;
            conn.execute(
                "UPDATE documents SET data = ?3, updated_at = ?4
                 WHERE collection = ?1 AND id = ?2",
                rusqlite::params![collection, id, body, now_iso8601()],
            )
            .ok()?;
        }
        Some(doc)
    }

    /// Delete a document; returns whether a row was removed.
    pub fn delete(&self, collection: &str, id: &str) -> bool {
        let Ok(conn) = self.conn.lock() else {
            return false;
        };
        conn.execute(
            "DELETE FROM documents WHERE collection = ?1 AND id = ?2",
            [collection, id],
        )
        .map(|n| n > 0)
        .unwrap_or(false)
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
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
}

fn poisoned<T>(_: T) -> io::Error {
    io::Error::new(io::ErrorKind::Other, "sqlite mutex poisoned")
}

fn sql_err(e: rusqlite::Error) -> io::Error {
    io::Error::new(io::ErrorKind::Other, format!("sqlite: {e}"))
}
