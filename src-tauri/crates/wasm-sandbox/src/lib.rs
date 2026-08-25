//! WASM plugin sandbox (FLOW-11): runs user-supplied WebAssembly modules
//! as flow nodes with **capability-minimal authorization by construction**
//! — the engine instantiates modules with **no WASI host interface**,
//! so a plugin cannot touch the filesystem or the network at all; it is
//! a pure `input → output` function. Plugins receive a caller-allocated
//! string (the node input, typically JSON) via exported memory and return
//! their output the same way.
//!
//! Wire contract for plugin modules:
//! - exports `alloc(len: i32) -> i32` — plugin allocates `len` bytes and
//!   returns the address for the host to write the input into;
//! - exports `process() -> i32` — reads the input written by the host,
//!   computes, and returns the address of a NUL-terminated output string
//!   (the plugin keeps ownership of both buffers).

use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
use thiserror::Error;

/// Plugin lifecycle errors surfaced to the flow engine.
#[derive(Debug, Error)]
pub enum SandboxError {
    #[error("插件未注册: {0}")]
    NotRegistered(String),
    #[error("WASM 编译失败: {0}")]
    Compile(String),
    #[error("WASM 实例化失败（缺少 alloc/process 导出?）: {0}")]
    Instantiate(String),
    #[error("插件执行失败: {0}")]
    Execution(String),
    #[error("插件输出无效: {0}")]
    Output(String),
}

/// A registered plugin: the validated module plus its name.
pub struct Plugin {
    pub name: String,
    engine: wasmtime::Engine,
    module: wasmtime::Module,
}

impl Plugin {
    /// Compile a plugin from raw wasm bytes (or WAT text — wasmtime's
    /// `wat` feature is enabled for authoring convenience).
    pub fn compile(name: impl Into<String>, bytes: &[u8]) -> Result<Self, SandboxError> {
        let name = name.into();
        let engine = wasmtime::Engine::default();
        let module = wasmtime::Module::new(&engine, bytes)
            .map_err(|e| SandboxError::Compile(format!("{name}: {e}")))?;
        Ok(Self {
            name,
            engine,
            module,
        })
    }

    /// Run the plugin on a string input; returns the output string.
    /// No WASI is linked into the store — the plugin is pure compute.
    pub fn invoke(&self, input: &str) -> Result<String, SandboxError> {
        let mut store = wasmtime::Store::new(&self.engine, ());
        // Capability gate: a Store with no Linker additions exposes no
        // host functions; WASI is never linked, so imports beyond the
        // empty set fail instantiation — that rejection is the sandbox.
        let instance = wasmtime::Linker::new(&self.engine)
            .instantiate(&mut store, &self.module)
            .map_err(|e| SandboxError::Instantiate(format!("{}: {e}", self.name)))?;

        let alloc = instance
            .get_typed_func::<i32, i32>(&mut store, "alloc")
            .map_err(|e| {
                SandboxError::Instantiate(format!("{}: missing alloc export: {e}", self.name))
            })?;
        let process = instance
            .get_typed_func::<(), i32>(&mut store, "process")
            .map_err(|e| {
                SandboxError::Instantiate(format!("{}: missing process export: {e}", self.name))
            })?;
        let memory = instance.get_memory(&mut store, "memory").ok_or_else(|| {
            SandboxError::Instantiate(format!("{}: missing memory export", self.name))
        })?;

        // Hand the input to the plugin: it allocates, we copy in.
        let input_bytes = input.as_bytes();
        let ptr = alloc
            .call(&mut store, input_bytes.len() as i32)
            .map_err(|e| SandboxError::Execution(format!("{}: alloc failed: {e}", self.name)))?;
        memory
            .write(&mut store, ptr as usize, input_bytes)
            .map_err(|e| SandboxError::Execution(format!("{}: write failed: {e}", self.name)))?;

        let out_ptr = process
            .call(&mut store, ())
            .map_err(|e| SandboxError::Execution(format!("{}: process failed: {e}", self.name)))?;

        // Read the NUL-terminated output back out.
        let mut buf = Vec::new();
        let mut cursor = out_ptr as usize;
        loop {
            let mut byte = [0u8; 1];
            memory
                .read(&mut store, cursor, &mut byte)
                .map_err(|e| SandboxError::Output(format!("{}: read failed: {e}", self.name)))?;
            if byte[0] == 0 {
                break;
            }
            buf.push(byte[0]);
            cursor += 1;
            if buf.len() > 16 * 1024 * 1024 {
                return Err(SandboxError::Output(format!(
                    "{}: output exceeds 16MB",
                    self.name
                )));
            }
        }
        String::from_utf8(buf)
            .map_err(|e| SandboxError::Output(format!("{}: not UTF-8: {e}", self.name)))
    }
}

/// In-memory plugin registry (the flow engine mounts these as nodes).
#[derive(Default)]
pub struct PluginRegistry {
    plugins: Mutex<HashMap<String, Plugin>>,
}

impl PluginRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    /// Register a compiled plugin by id.
    pub fn register(&self, id: impl Into<String>, plugin: Plugin) {
        self.plugins.lock().unwrap().insert(id.into(), plugin);
    }

    pub fn remove(&self, id: &str) -> bool {
        self.plugins.lock().unwrap().remove(id).is_some()
    }

    pub fn list(&self) -> Vec<String> {
        self.plugins.lock().unwrap().keys().cloned().collect()
    }

    /// Invoke a plugin with a JSON value; the plugin's string output is
    /// re-parsed as JSON when possible, otherwise returned as a JSON
    /// string (plugins may return plain text).
    pub fn invoke_json(&self, id: &str, input: Value) -> Result<Value, SandboxError> {
        let plugins = self.plugins.lock().unwrap();
        let plugin = plugins
            .get(id)
            .ok_or_else(|| SandboxError::NotRegistered(id.to_string()))?;
        let input_text = input.to_string();
        let output = plugin.invoke(&input_text)?;
        Ok(serde_json::from_str(&output).unwrap_or(Value::String(output)))
    }
}

/// Build a plugin from raw bytes through the registry (convenience).
pub fn compile_plugin(name: &str, bytes: &[u8]) -> Result<Plugin, SandboxError> {
    Plugin::compile(name, bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    /// A minimal WAT plugin implementing the wire contract: echoes the
    /// input with a prefix. Exercises alloc/memory/process end to end.
    const ECHO_WAT: &str = r#"
(module
  (memory (export "memory") 2)
  (global $in_len (mut i32) (i32.const 0))
  (func (export "alloc") (param $len i32) (result i32)
    (global.set $in_len (local.get $len))
    (i32.const 16384))
  (func (export "process") (result i32)
    (local $i i32)
    (i32.store8 (i32.const 8192) (i32.const 112))
    (i32.store8 (i32.const 8193) (i32.const 108))
    (i32.store8 (i32.const 8194) (i32.const 117))
    (i32.store8 (i32.const 8195) (i32.const 103))
    (i32.store8 (i32.const 8196) (i32.const 58))
    (i32.store8 (i32.const 8197) (i32.const 32))
    (local.set $i (i32.const 0))
    (block $done
      (loop $copy
        (br_if $done (i32.ge_u (local.get $i) (global.get $in_len)))
        (i32.store8
          (i32.add (i32.const 8198) (local.get $i))
          (i32.load8_u (i32.add (i32.const 16384) (local.get $i))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $copy)))
    (i32.store8 (i32.add (i32.const 8198) (global.get $in_len)) (i32.const 0))
    (i32.const 8192)))
"#;

    // A plugin that tries to import a host function — instantiation must
    // fail because the sandbox links nothing.
    const IMPORTING_WAT: &str = r#"
(module
  (import "env" "host_read_file" (func $read (param i32) (result i32)))
  (memory (export "memory") 1)
  (func (export "alloc") (param $len i32) (result i32) (i32.const 0))
  (func (export "process") (result i32)
    (drop (call $read (i32.const 0)))
    (i32.const 0)))
"#;

    #[test]
    fn echo_plugin_round_trips_the_wire_contract() {
        let plugin = Plugin::compile("echo", ECHO_WAT.as_bytes()).unwrap();
        let out = plugin.invoke("{\"a\":1}").unwrap();
        assert_eq!(out, "plug: {\"a\":1}");
        // Larger input crossing page boundaries still works.
        let big = "x".repeat(100_000);
        let out = plugin.invoke(&big).unwrap();
        assert_eq!(out.len(), 6 + big.len());
        assert!(out.starts_with("plug: "));
    }

    #[test]
    fn plugins_importing_host_functions_fail_instantiation() {
        // Capability gate: no host functions are linked, so a module that
        // imports one cannot even instantiate — it never runs.
        let plugin = Plugin::compile("evil", IMPORTING_WAT.as_bytes()).unwrap();
        let err = match plugin.invoke("x") {
            Err(e) => e,
            Ok(_) => panic!("importing plugin must not instantiate"),
        };
        assert!(matches!(err, SandboxError::Instantiate(_)), "{err}");
    }

    #[test]
    fn garbage_bytes_fail_compilation_with_context() {
        let err = match Plugin::compile("bad", b"not wasm at all") {
            Err(e) => e,
            Ok(_) => panic!("garbage must not compile"),
        };
        assert!(matches!(err, SandboxError::Compile(_)));
        assert!(err.to_string().contains("bad"));
    }

    #[test]
    fn registry_invokes_and_parses_json() {
        let registry = PluginRegistry::new();
        let plugin = Plugin::compile("json-echo", ECHO_WAT.as_bytes()).unwrap();
        registry.register("p1", plugin);

        // JSON in → string out (the echo prefixes it, so it stops being
        // valid JSON and comes back as a JSON string).
        let out = registry.invoke_json("p1", json!({"k": "v"})).unwrap();
        assert_eq!(out, json!("plug: {\"k\":\"v\"}"));

        // Unknown ids report NotRegistered.
        assert!(matches!(
            registry.invoke_json("missing", json!({})),
            Err(SandboxError::NotRegistered(_))
        ));

        assert!(registry.remove("p1"));
        assert!(!registry.remove("p1"));
        assert!(registry.list().is_empty());
    }
}
