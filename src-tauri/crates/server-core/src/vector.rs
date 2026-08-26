/**
 * PLAT-07 向量检索: sqlite-vec (vec0 virtual tables) behind a backend
 * trait, so a future cloud deployment swaps in pgvector/Qdrant without
 * touching the retrieval callers (记忆/RAG both sit on this interface).
 *
 * Layout: one vec0 table per collection (`vec_{collection}`, fixed
 * dimension recorded at creation), with a side map from its integer rowid
 * to the caller's string id. Dimension mismatch inside a collection is an
 * honest error rather than silent corruption.
 */
use std::collections::HashMap;
use std::sync::Mutex;

use rusqlite::Connection;

/// The vector backend contract. Implementations must be internally
/// synchronized (the store shares one guarded connection).
pub trait VectorBackend: Send {
    /// Insert or replace `id`'s vector in `collection`.
    fn upsert(&self, collection: &str, id: &str, embedding: &[f32]) -> Result<(), String>;
    /// Drop `id`'s vector (missing ids are fine).
    fn remove(&self, collection: &str, id: &str) -> Result<(), String>;
    /// K nearest neighbors: `(id, distance)` ascending by distance.
    fn query(
        &self,
        collection: &str,
        embedding: &[f32],
        k: usize,
    ) -> Result<Vec<(String, f32)>, String>;
    /// Whether `collection` currently holds any vectors.
    fn is_indexed(&self, collection: &str) -> bool;
}

/// sqlite-vec backed store, sharing the document DB connection.
pub struct SqliteVecBackend {
    conn: Mutex<Connection>,
    /// collection → dimension, guarded with the tables themselves.
    dims: Mutex<HashMap<String, usize>>,
}

impl SqliteVecBackend {
    /// Register sqlite-vec as an auto extension and open the shared tables.
    /// Call once per process, BEFORE opening connections (the extension
    /// registers itself into every subsequently opened connection).
    pub fn register_extension() {
        // SAFETY: sqlite3_auto_extension registers sqlite-vec's entry point
        // process-wide; the pointer is a plain C fn from the sqlite-vec crate.
        unsafe {
            rusqlite::ffi::sqlite3_auto_extension(Some(std::mem::transmute(
                sqlite_vec::sqlite3_vec_init as *const (),
            )));
        }
    }

    pub fn new(conn: Connection) -> Result<Self, String> {
        let backend = Self {
            conn: Mutex::new(conn),
            dims: Mutex::new(HashMap::new()),
        };
        backend.init_schema()?;
        Ok(backend)
    }

    fn init_schema(&self) -> Result<(), String> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS vector_map (
                vec_rowid  INTEGER PRIMARY KEY AUTOINCREMENT,
                collection TEXT NOT NULL,
                doc_id     TEXT NOT NULL,
                UNIQUE (collection, doc_id)
            );",
        )
        .map_err(|e| format!("vector map init: {e}"))
    }

    fn table_name(collection: &str) -> String {
        // collection names come from our own code (memory/rag); sanitize
        // defensively anyway so they can only name a table we create.
        format!(
            "vec_{}",
            collection
                .chars()
                .filter(|c| c.is_ascii_alphanumeric())
                .collect::<String>()
        )
    }

    fn ensure_table(&self, collection: &str, dim: usize) -> Result<String, String> {
        let table = Self::table_name(collection);
        {
            let dims = self.dims.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(&known) = dims.get(collection) {
                if known != dim {
                    return Err(format!(
                        "vector dimension mismatch for '{collection}': indexed {known}, got {dim}"
                    ));
                }
                return Ok(table);
            }
        }
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        let exists: bool = conn
            .query_row(
                "SELECT EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name=?1)",
                [&table],
                |r| r.get(0),
            )
            .map_err(|e| format!("vector table probe: {e}"))?;
        if exists {
            // Recover the dimension from an earlier process run.
            let sql = format!("SELECT embedding FROM {table} LIMIT 1");
            let dim_from_row: Option<usize> = conn
                .query_row(&sql, [], |r| {
                    let blob: Vec<u8> = r.get(0)?;
                    Ok(blob.len() / 4)
                })
                .ok();
            if let Some(d) = dim_from_row {
                if d != dim {
                    return Err(format!(
                        "vector dimension mismatch for '{collection}': indexed {d}, got {dim}"
                    ));
                }
            }
        } else {
            conn.execute_batch(&format!(
                "CREATE VIRTUAL TABLE {table} USING vec0(embedding float[{dim}])"
            ))
            .map_err(|e| format!("create vec0 table {table}: {e}"))?;
        }
        self.dims
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .insert(collection.to_string(), dim);
        Ok(table)
    }
}

impl VectorBackend for SqliteVecBackend {
    fn upsert(&self, collection: &str, id: &str, embedding: &[f32]) -> Result<(), String> {
        let table = self.ensure_table(collection, embedding.len())?;
        let mut conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        let tx = conn
            .transaction()
            .map_err(|e| format!("vector upsert tx: {e}"))?;
        let existing: Option<i64> = tx
            .query_row(
                "SELECT vec_rowid FROM vector_map WHERE collection=?1 AND doc_id=?2",
                [collection, id],
                |r| r.get(0),
            )
            .ok();
        let rowid = match existing {
            Some(rowid) => rowid,
            None => {
                tx.execute(
                    "INSERT INTO vector_map (collection, doc_id) VALUES (?1, ?2)",
                    [collection, id],
                )
                .map_err(|e| format!("vector map insert: {e}"))?;
                tx.last_insert_rowid()
            }
        };
        let bytes: Vec<u8> = embedding.iter().flat_map(|f| f.to_le_bytes()).collect();
        let exists: bool = tx
            .query_row(
                &format!("SELECT EXISTS (SELECT 1 FROM {table} WHERE rowid=?1)"),
                [rowid],
                |r| r.get(0),
            )
            .map_err(|e| format!("vector probe: {e}"))?;
        if exists {
            tx.execute(
                &format!("UPDATE {table} SET embedding=?1 WHERE rowid=?2"),
                rusqlite::params![bytes, rowid],
            )
            .map_err(|e| format!("vector update: {e}"))?;
        } else {
            tx.execute(
                &format!("INSERT INTO {table} (rowid, embedding) VALUES (?1, ?2)"),
                rusqlite::params![rowid, bytes],
            )
            .map_err(|e| format!("vector insert: {e}"))?;
        }
        tx.commit()
            .map_err(|e| format!("vector upsert commit: {e}"))
    }

    fn remove(&self, collection: &str, id: &str) -> Result<(), String> {
        let table = Self::table_name(collection);
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        let rowid: Option<i64> = conn
            .query_row(
                "SELECT vec_rowid FROM vector_map WHERE collection=?1 AND doc_id=?2",
                [collection, id],
                |r| r.get(0),
            )
            .ok();
        if let Some(rowid) = rowid {
            conn.execute(&format!("DELETE FROM {table} WHERE rowid=?1"), [rowid])
                .map_err(|e| format!("vector delete: {e}"))?;
            conn.execute(
                "DELETE FROM vector_map WHERE collection=?1 AND doc_id=?2",
                [collection, id],
            )
            .map_err(|e| format!("vector map delete: {e}"))?;
        }
        Ok(())
    }

    fn query(
        &self,
        collection: &str,
        embedding: &[f32],
        k: usize,
    ) -> Result<Vec<(String, f32)>, String> {
        let table = self.ensure_table(collection, embedding.len())?;
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        let bytes: Vec<u8> = embedding.iter().flat_map(|f| f.to_le_bytes()).collect();
        let mut stmt = conn
            .prepare(&format!(
                "SELECT m.doc_id, v.distance
                 FROM {table} v
                 JOIN vector_map m ON m.vec_rowid = v.rowid
                 WHERE v.embedding MATCH ?1 AND k = ?2
                 ORDER BY v.distance"
            ))
            .map_err(|e| format!("vector knn prepare: {e}"))?;
        let rows = stmt
            .query_map(rusqlite::params![bytes, k as i64], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, f32>(1)?))
            })
            .map_err(|e| format!("vector knn query: {e}"))?;
        let mut out = Vec::new();
        for row in rows {
            let (id, distance) = row.map_err(|e| format!("vector knn row: {e}"))?;
            out.push((id, distance));
        }
        Ok(out)
    }

    fn is_indexed(&self, collection: &str) -> bool {
        self.dims
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .contains_key(collection)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn backend() -> SqliteVecBackend {
        SqliteVecBackend::register_extension();
        let conn = Connection::open_in_memory().expect("open memory db");
        SqliteVecBackend::new(conn).expect("backend")
    }

    fn embedding(base: f32) -> Vec<f32> {
        vec![base, 0.0, 0.0, 0.0]
    }

    #[test]
    fn upsert_query_knn_round_trip() {
        let backend = backend();
        backend.upsert("memory", "a", &embedding(1.0)).unwrap();
        backend.upsert("memory", "b", &embedding(0.5)).unwrap();
        backend.upsert("memory", "c", &embedding(-1.0)).unwrap();

        // Nearest to 0.9 is a (0.9,0,0,0), then b, then c.
        let hits = backend.query("memory", &embedding(0.9), 3).unwrap();
        assert_eq!(hits.len(), 3);
        assert_eq!(hits[0].0, "a");
        assert!(hits[0].1 < hits[1].1);
        assert_eq!(hits[2].0, "c");
    }

    #[test]
    fn upsert_replaces_and_remove_drops() {
        let backend = backend();
        backend.upsert("memory", "x", &embedding(1.0)).unwrap();
        // Replace flips the direction.
        backend.upsert("memory", "x", &embedding(-1.0)).unwrap();
        let hits = backend.query("memory", &embedding(-0.9), 5).unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].0, "x");

        backend.remove("memory", "x").unwrap();
        backend.remove("memory", "never-there").unwrap();
        assert!(backend
            .query("memory", &embedding(1.0), 5)
            .unwrap()
            .is_empty());
    }

    #[test]
    fn dimension_mismatch_is_an_honest_error() {
        let backend = backend();
        backend.upsert("memory", "a", &embedding(1.0)).unwrap();
        let err = backend.upsert("memory", "b", &[0.0; 8]);
        assert!(err.unwrap_err().contains("dimension mismatch"),);
    }

    #[test]
    fn collections_are_isolated() {
        let backend = backend();
        backend.upsert("memory", "a", &embedding(1.0)).unwrap();
        backend.upsert("rag", "a", &embedding(-1.0)).unwrap();
        let memory = backend.query("memory", &embedding(0.9), 5).unwrap();
        let rag = backend.query("rag", &embedding(-0.9), 5).unwrap();
        assert_eq!(memory.len(), 1);
        assert_eq!(rag.len(), 1);
    }

    #[test]
    fn is_indexed_reflects_usage() {
        let backend = backend();
        assert!(!backend.is_indexed("memory"));
        backend.upsert("memory", "a", &embedding(1.0)).unwrap();
        assert!(backend.is_indexed("memory"));
    }
}
