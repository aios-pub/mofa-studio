/**
 * Standalone server-core binary.
 *
 * The same codebase that is embedded inside the Tauri app can run headless
 * (dev tooling, future web deployment). Configuration via CLI flags:
 *   server-core [--port N] [--data-dir PATH]
 * or environment: MOFA_SERVER_PORT / MOFA_SERVER_DATA_DIR.
 */
use std::path::PathBuf;

use server_core::ServerConfig;

fn main() -> std::io::Result<()> {
    let runtime = tokio::runtime::Runtime::new()?;
    runtime.block_on(run())
}

async fn run() -> std::io::Result<()> {
    let mut config = ServerConfig::for_data_dir(
        std::env::var("MOFA_SERVER_DATA_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("server-data")),
    );
    config.port = std::env::var("MOFA_SERVER_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(0);

    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--port" => {
                if let Some(port) = args.next().and_then(|p| p.parse().ok()) {
                    config.port = port;
                }
            }
            "--data-dir" => {
                if let Some(dir) = args.next() {
                    config.data_dir = PathBuf::from(dir);
                }
            }
            "--engine-url" => {
                if let Some(url) = args.next() {
                    config.engine_base_url = Some(url);
                }
            }
            other => {
                eprintln!("Unknown argument: {other}");
                eprintln!("Usage: server-core [--port N] [--data-dir PATH] [--engine-url URL]");
                std::process::exit(1);
            }
        }
    }

    let addr = server_core::start(config).await?;
    println!(
        "server-core {} standalone ready on http://{addr}",
        server_core::VERSION
    );

    tokio::signal::ctrl_c().await?;
    println!("server-core shutting down");
    Ok(())
}
