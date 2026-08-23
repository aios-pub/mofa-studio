mod tray;

use serde::Deserialize;
use std::fs;
use std::net::{IpAddr, Ipv4Addr};
use tauri::Manager;

/// Floating ball mode configuration
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum FloatingMode {
    /// Floating ball mode - a small ball floating at the screen edge
    Floating,
    /// Normal window mode - standard desktop window (default)
    #[default]
    Window,
}

/// Application configuration
#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    /// Floating ball mode
    #[serde(default, rename = "floatingMode")]
    pub floating_mode: FloatingMode,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            floating_mode: FloatingMode::default(),
        }
    }
}

/// Read configuration from the config file
fn load_app_config() -> AppConfig {
    // Try multiple possible config file paths
    let config_paths = get_config_paths();

    for path in config_paths {
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                    println!("[Config] Loaded from: {:?}", path);
                    return config;
                }
            }
        }
    }

    println!("[Config] Using default config (window mode)");
    AppConfig::default()
}

/// Get the list of possible config file paths
fn get_config_paths() -> Vec<std::path::PathBuf> {
    let mut paths = Vec::new();

    // 1. src-tauri/app-config.json in the current working directory (development)
    if let Ok(cwd) = std::env::current_dir() {
        paths.push(cwd.join("src-tauri").join("app-config.json"));
        paths.push(cwd.join("app-config.json"));
    }

    // 2. Same directory as the executable (after packaging)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            paths.push(exe_dir.join("app-config.json"));
            // Inside the macOS .app bundle
            paths.push(exe_dir.join("../Resources/app-config.json"));
        }
    }

    paths
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Get the current floating ball mode configuration
#[tauri::command]
fn get_floating_mode() -> String {
    let config = load_app_config();
    match config.floating_mode {
        FloatingMode::Floating => "floating".to_string(),
        FloatingMode::Window => "window".to_string(),
    }
}

// ==================== Embedded server ====================

/// Address of the embedded local-first backend, exposed to the webview so
/// the frontend can point its API client at the loopback server.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ServerInfo {
    pub base_url: String,
    pub port: u16,
    pub version: String,
}

/// Frontend-facing handle to the embedded server-core instance.
#[tauri::command]
fn get_server_info(state: tauri::State<ServerInfo>) -> ServerInfo {
    state.inner().clone()
}

/// Spawn the embedded server-core on the loopback interface with an
/// OS-assigned dynamic port and register its address in app state.
fn start_embedded_server(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let data_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| std::env::temp_dir().join("mofa-studio"));
    fs::create_dir_all(&data_dir)?;

    let config = server_core::ServerConfig {
        host: IpAddr::V4(Ipv4Addr::LOCALHOST),
        port: 0,
        data_dir,
    };
    let addr = tauri::async_runtime::block_on(server_core::start(config))?;
    println!("[server-core] embedded backend on http://{addr}");

    app.manage(ServerInfo {
        base_url: format!("http://{addr}"),
        port: addr.port(),
        version: server_core::VERSION.to_string(),
    });
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config = load_app_config();
    let is_floating = matches!(config.floating_mode, FloatingMode::Floating);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_floating_mode,
            get_server_info
        ])
        .setup(move |app| {
            // Bring up the embedded local-first backend before any window
            // logic so the webview can resolve its API base URL on load
            start_embedded_server(app)?;

            // Get the window
            let main_window = app.get_webview_window("main");
            let floating_window = app.get_webview_window("floating");

            if is_floating {
                // Floating ball mode: hide the main window, show the floating ball
                if let Some(main) = &main_window {
                    let _ = main.hide();
                }
                if let Some(floating) = &floating_window {
                    let _ = floating.show();
                }

                // Configure transparency and mouse events for the floating window
                #[cfg(target_os = "macos")]
                {
                    if let Some(floating) = &floating_window {
                        let _ = floating.set_decorations(false);

                        let ns_window = floating.ns_window().unwrap();
                        unsafe {
                            use objc2::rc::Retained;
                            use objc2_app_kit::{
                                NSColor, NSFloatingWindowLevel, NSWindow, NSWindowStyleMask,
                                NSWindowCollectionBehavior,
                            };

                            let ns_window: Retained<NSWindow> =
                                Retained::retain(ns_window as *mut NSWindow).unwrap();

                            // Basic transparency settings
                            ns_window.setOpaque(false);
                            ns_window.setBackgroundColor(Some(&NSColor::clearColor()));
                            ns_window.setAcceptsMouseMovedEvents(true);
                            ns_window.setIgnoresMouseEvents(false);
                            ns_window.setStyleMask(NSWindowStyleMask::Borderless);
                            ns_window.setMovableByWindowBackground(true);

                            // Set the window level to floating (above other windows)
                            ns_window.setLevel(NSFloatingWindowLevel);

                            // Set window behavior: visible on all workspaces + fullscreen app support
                            ns_window.setCollectionBehavior(
                                NSWindowCollectionBehavior::CanJoinAllSpaces
                                    | NSWindowCollectionBehavior::Stationary
                                    | NSWindowCollectionBehavior::FullScreenAuxiliary,
                            );
                        }
                    }
                }

                // Windows - relies on Tauri configuration; no extra native window handling
                // tauri.conf.json already sets alwaysOnTop: true, skipTaskbar: true, transparent: true
                #[cfg(target_os = "windows")]
                {
                    if let Some(floating) = &floating_window {
                        let _ = floating.set_decorations(false);
                        // Do not modify native Windows window styles to avoid interfering with Tauri window management
                    }
                }
            } else {
                // Normal window mode: show the main window, hide the floating ball
                println!("[Config] Window mode - showing main window");
                if let Some(main) = &main_window {
                    let _ = main.show();
                    let _ = main.set_focus();
                }
                if let Some(floating) = &floating_window {
                    let _ = floating.hide();
                }
            }

            tray::setup_tray(app.handle(), is_floating)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
