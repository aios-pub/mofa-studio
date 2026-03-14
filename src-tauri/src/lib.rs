mod tray;

use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .setup(|app| {
            // 配置悬浮窗口的透明效果和鼠标事件
            #[cfg(target_os = "macos")]
            {
                if let Some(floating_window) = app.get_webview_window("floating") {
                    let _ = floating_window.set_decorations(false);

                    // macOS 需要额外设置才能实现真正的透明窗口
                    // 使用 objc2 API 设置窗口背景和事件处理
                    let ns_window = floating_window.ns_window().unwrap();
                    unsafe {
                        use objc2::rc::Retained;
                        use objc2_app_kit::{NSColor, NSWindow, NSWindowStyleMask};

                        let ns_window: Retained<NSWindow> = Retained::retain(ns_window as *mut NSWindow).unwrap();

                        // 设置透明
                        ns_window.setOpaque(false);
                        ns_window.setBackgroundColor(Some(&NSColor::clearColor()));

                        // 确保窗口能接收鼠标事件
                        ns_window.setAcceptsMouseMovedEvents(true);
                        ns_window.setIgnoresMouseEvents(false);

                        // 设置窗口样式为无边框
                        ns_window.setStyleMask(NSWindowStyleMask::Borderless);

                        // 设置窗口为可移动的
                        ns_window.setMovableByWindowBackground(true);
                    }
                }
            }

            tray::setup_tray(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
