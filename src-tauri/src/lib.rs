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
                    // 使用 cocoa API 设置窗口背景和事件处理
                    let ns_window = floating_window.ns_window().unwrap();
                    unsafe {
                        use cocoa::appkit::{NSColor, NSWindow};
                        use cocoa::base::{id, nil, NO, YES};

                        let ns_window = ns_window as id;

                        // 设置透明
                        ns_window.setOpaque_(NO);
                        let clear_color = NSColor::clearColor(nil);
                        ns_window.setBackgroundColor_(clear_color);

                        // 确保窗口能接收鼠标事件
                        ns_window.setAcceptsMouseMovedEvents_(YES);
                        ns_window.setIgnoresMouseEvents_(NO);

                        // 设置窗口样式为无边框
                        ns_window.setStyleMask_(cocoa::appkit::NSWindowStyleMask::NSBorderlessWindowMask);

                        // 设置窗口为可移动的
                        ns_window.setMovableByWindowBackground_(YES);
                    }
                }
            }

            tray::setup_tray(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
