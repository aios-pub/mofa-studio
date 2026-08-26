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
#[derive(Default)]
pub struct AppConfig {
    /// Floating ball mode
    #[serde(default, rename = "floatingMode")]
    pub floating_mode: FloatingMode,
}


/// Read configuration from the config file
fn load_app_config() -> AppConfig {
    // Try multiple possible config file paths
    let config_paths = get_config_paths();

    for path in config_paths {
        if path.exists()
            && let Ok(content) = fs::read_to_string(&path)
                && let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                    println!("[Config] Loaded from: {:?}", path);
                    return config;
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
    if let Ok(exe_path) = std::env::current_exe()
        && let Some(exe_dir) = exe_path.parent() {
            paths.push(exe_dir.join("app-config.json"));
            // Inside the macOS .app bundle
            paths.push(exe_dir.join("../Resources/app-config.json"));
        }

    paths
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// ==================== Floating pet native window ops ====================
// The core window-plugin IPC path deadlocks on macOS for the pet window
// shape (upstream tauri#14822), so the pet drives its window state through
// these commands, which touch AppKit directly on the main thread.

/// Logical frame plus containing screen, top-left-origin coordinates.
#[cfg(target_os = "macos")]
#[derive(serde::Serialize)]
struct PetFrame {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[cfg(target_os = "macos")]
#[derive(serde::Serialize)]
struct PetEnv {
    frame: PetFrame,
    monitor: Option<PetFrame>,
    scale: f64,
}

/// Frame of the calling window plus its screen (logical, top-left origin).
#[tauri::command]
fn pet_env(window: tauri::WebviewWindow) -> Option<PetEnv> {
    #[cfg(target_os = "macos")]
    {
        let Ok(ptr) = window.ns_window() else {
            return None;
        };
        unsafe { pet_env_impl(ptr) }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = window;
        None
    }
}

#[cfg(target_os = "macos")]
unsafe fn pet_env_impl(ptr: *mut std::ffi::c_void) -> Option<PetEnv> {
    unsafe {
        use objc2::MainThreadMarker;
        use objc2::rc::Retained;
        use objc2_app_kit::{NSScreen, NSWindow};

        let Some(win) = Retained::<NSWindow>::retain(ptr as *mut NSWindow) else {
            return None;
        };

        let mtm = MainThreadMarker::new_unchecked();
        let screens = NSScreen::screens(mtm);
        if screens.len() == 0 {
            return None;
        }
        // AppKit screen coordinates are bottom-left-origin; flip to top-left
        // using the primary screen height so values match Tauri logical coords.
        let primary_height = screens.objectAtIndex(0).frame().size.height;

        let frame = win.frame();
        let scale = win.backingScaleFactor();
        let frame = PetFrame {
            x: frame.origin.x,
            y: primary_height - frame.origin.y - frame.size.height,
            width: frame.size.width,
            height: frame.size.height,
        };

        // Screen containing the window centre, in the same coordinate space
        let cx = frame.x + frame.width / 2.0;
        let cy = frame.y + frame.height / 2.0;
        let mut monitor = None;
        for i in 0..screens.len() {
            let f = screens.objectAtIndex(i).frame();
            let sx = f.origin.x;
            let sy = primary_height - f.origin.y - f.size.height;
            if cx >= sx && cx <= sx + f.size.width && cy >= sy && cy <= sy + f.size.height {
                monitor = Some(PetFrame {
                    x: sx,
                    y: sy,
                    width: f.size.width,
                    height: f.size.height,
                });
                break;
            }
        }

        Some(PetEnv {
            frame,
            monitor,
            scale,
        })
    }
}

/// Move/resize the calling window; coordinates are logical top-left-origin.
#[tauri::command]
fn pet_set_frame(window: tauri::WebviewWindow, x: f64, y: f64, width: f64, height: f64) -> bool {
    #[cfg(target_os = "macos")]
    {
        let Ok(ptr) = window.ns_window() else {
            return false;
        };
        unsafe { pet_set_frame_impl(ptr, x, y, width, height) }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (&window, x, y, width, height);
        false
    }
}

#[cfg(target_os = "macos")]
unsafe fn pet_set_frame_impl(
    ptr: *mut std::ffi::c_void,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> bool {
    unsafe {
        use objc2::MainThreadMarker;
        use objc2::rc::Retained;
        use objc2_app_kit::{NSScreen, NSWindow};

        let Some(win) = Retained::<NSWindow>::retain(ptr as *mut NSWindow) else {
            return false;
        };

        let mtm = MainThreadMarker::new_unchecked();
        let screens = NSScreen::screens(mtm);
        if screens.len() == 0 {
            return false;
        }
        let primary_height = screens.objectAtIndex(0).frame().size.height;

        let mut frame = win.frame();
        frame.origin.x = x;
        frame.origin.y = primary_height - y - height;
        frame.size.width = width;
        frame.size.height = height;
        win.setFrame_display(frame, false);
        true
    }
}

/// Primitive window state ops: hide | show | focus | always_on_top |
/// show_main (reveal and focus the main window).
#[tauri::command]
fn pet_window_op(window: tauri::WebviewWindow, op: String, value: Option<bool>) -> bool {
    if op == "show_main" {
        if let Some(main) = window.get_webview_window("main") {
            #[cfg(target_os = "macos")]
            {
                if let Ok(ptr) = main.ns_window() {
                    return unsafe { pet_window_op_impl(ptr, "focus", false) };
                }
            }
            #[cfg(not(target_os = "macos"))]
            {
                let _ = main.show();
                let _ = main.set_focus();
                return true;
            }
        }
        return false;
    }

    #[cfg(target_os = "macos")]
    {
        let Ok(ptr) = window.ns_window() else {
            return false;
        };
        unsafe { pet_window_op_impl(ptr, &op, value.unwrap_or(false)) }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (&window, &op, value);
        false
    }
}

#[cfg(target_os = "macos")]
unsafe fn pet_window_op_impl(ptr: *mut std::ffi::c_void, op: &str, value: bool) -> bool {
    unsafe {
        use objc2::rc::Retained;
        use objc2_app_kit::{NSFloatingWindowLevel, NSNormalWindowLevel, NSWindow};

        let Some(win) = Retained::<NSWindow>::retain(ptr as *mut NSWindow) else {
            return false;
        };
        match op {
            "hide" => {
                win.orderOut(None);
                true
            }
            "show" | "focus" => {
                win.makeKeyAndOrderFront(None);
                true
            }
            "always_on_top" => {
                win.setLevel(if value {
                    NSFloatingWindowLevel
                } else {
                    NSNormalWindowLevel
                });
                true
            }
            _ => false,
        }
    }
}

/// Quit the whole application (pet menu exit).
#[tauri::command]
fn pet_exit(window: tauri::WebviewWindow) {
    window.app_handle().exit(0);
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

/// Start an interactive window-drag session.
///
/// tao's built-in dragging reads `NSApp.currentEvent`, which is often nil by
/// the time the mousedown IPC reaches the main thread, panicking with
/// "messaging type to nil". Synthesizing a mouse-down event here avoids
/// that code path entirely.
#[tauri::command]
fn start_window_drag(window: tauri::WebviewWindow) {
    #[cfg(target_os = "macos")]
    {
        let handle = window.clone();
        let _ = window.run_on_main_thread(move || {
            if let Ok(ns_window_ptr) = handle.ns_window() {
                unsafe { begin_drag_session(ns_window_ptr) };
            }
        });
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = window.start_dragging();
    }
}

/// Begin the native drag loop for a borderless NSWindow with a synthesized
/// left-mouse-down event; the session ends when the user releases the button.
#[cfg(target_os = "macos")]
unsafe fn begin_drag_session(ns_window_ptr: *mut std::ffi::c_void) {
    use objc2::rc::Retained;
    use objc2::runtime::AnyObject;
    use objc2_app_kit::{NSEvent, NSWindow};

    let Some(ns_window) =
        (unsafe { Retained::<NSWindow>::retain(ns_window_ptr as *mut NSWindow) })
    else {
        return;
    };

    // NSEventTypeLeftMouseDown
    const LEFT_MOUSE_DOWN: usize = 1;
    let location = NSEvent::mouseLocation();
    let window_number = ns_window.windowNumber();
    let modifier_flags: usize = 0;
    let context: *mut AnyObject = std::ptr::null_mut();
    let event_number: isize = 0;
    let click_count: isize = 1;
    let pressure: f64 = 1.0;

    let event: *mut AnyObject = objc2::msg_send![
        objc2::class!(NSEvent),
        mouseEventWithType: LEFT_MOUSE_DOWN,
        location: location,
        modifierFlags: modifier_flags,
        timestamp: 0.0f64,
        windowNumber: window_number,
        context: context,
        eventNumber: event_number,
        clickCount: click_count,
        pressure: pressure,
    ];
    if event.is_null() {
        return;
    }

    if let Some(event) = unsafe { Retained::<NSEvent>::retain(event as *mut NSEvent) } {
        ns_window.performWindowDragWithEvent(&event);
    }
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
        // The inference engine boots in-process inside server-core::start,
        // rooted at <data_dir>/engine (config.toml + artifacts).
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
            pet_env,
            pet_set_frame,
            pet_window_op,
            pet_exit,
            get_floating_mode,
            get_server_info,
            start_window_drag
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
                    #[cfg(target_os = "macos")]
                    {
                        let _ = main.show();
                        // Use native macOS centering to ensure correct position
                        // (the event-loop center() message is unreliable for hidden windows)
                        if let Ok(ns_window_ptr) = main.ns_window() {
                            unsafe {
                                use objc2::rc::Retained;
                                use objc2_app_kit::NSWindow;
                                let ns_window: Retained<NSWindow> =
                                    Retained::retain(ns_window_ptr as *mut NSWindow).unwrap();
                                ns_window.center();
                            }
                        }
                        let _ = main.set_focus();
                    }
                    #[cfg(not(target_os = "macos"))]
                    {
                        let _ = main.show();
                        let _ = main.center();
                        let _ = main.set_focus();
                    }
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
