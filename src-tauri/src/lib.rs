mod tray;

use serde::Deserialize;
use std::fs;
use tauri::Manager;

/// 悬浮球模式配置
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum FloatingMode {
    /// 悬浮球模式 - 小球悬浮在屏幕边缘
    Floating,
    /// 普通窗口模式 - 使用标准桌面窗口 (默认)
    #[default]
    Window,
}

/// 应用配置
#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    /// 悬浮球模式
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

/// 从配置文件读取配置
fn load_app_config() -> AppConfig {
    // 尝试多个可能的配置文件路径
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

/// 获取可能的配置文件路径列表
fn get_config_paths() -> Vec<std::path::PathBuf> {
    let mut paths = Vec::new();

    // 1. 当前工作目录下的 src-tauri/app-config.json (开发时)
    if let Ok(cwd) = std::env::current_dir() {
        paths.push(cwd.join("src-tauri").join("app-config.json"));
        paths.push(cwd.join("app-config.json"));
    }

    // 2. 可执行文件同目录 (打包后)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            paths.push(exe_dir.join("app-config.json"));
            // macOS .app 包内
            paths.push(exe_dir.join("../Resources/app-config.json"));
        }
    }

    paths
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// 获取当前悬浮球模式配置
#[tauri::command]
fn get_floating_mode() -> String {
    let config = load_app_config();
    match config.floating_mode {
        FloatingMode::Floating => "floating".to_string(),
        FloatingMode::Window => "window".to_string(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config = load_app_config();
    let is_floating = matches!(config.floating_mode, FloatingMode::Floating);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, get_floating_mode])
        .setup(move |app| {
            // 获取窗口
            let main_window = app.get_webview_window("main");
            let floating_window = app.get_webview_window("floating");

            if is_floating {
                // 悬浮球模式：隐藏主窗口，显示悬浮球
                if let Some(main) = &main_window {
                    let _ = main.hide();
                }
                if let Some(floating) = &floating_window {
                    let _ = floating.show();
                }

                // 配置悬浮窗口的透明效果和鼠标事件
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

                            // 基础透明设置
                            ns_window.setOpaque(false);
                            ns_window.setBackgroundColor(Some(&NSColor::clearColor()));
                            ns_window.setAcceptsMouseMovedEvents(true);
                            ns_window.setIgnoresMouseEvents(false);
                            ns_window.setStyleMask(NSWindowStyleMask::Borderless);
                            ns_window.setMovableByWindowBackground(true);

                            // 设置窗口层级为悬浮级别 (在其他窗口之上)
                            ns_window.setLevel(NSFloatingWindowLevel);

                            // 设置窗口行为: 在所有工作空间显示 + 支持全屏应用
                            ns_window.setCollectionBehavior(
                                NSWindowCollectionBehavior::CanJoinAllSpaces
                                    | NSWindowCollectionBehavior::Stationary
                                    | NSWindowCollectionBehavior::FullScreenAuxiliary,
                            );
                        }
                    }
                }

                // Windows 平台 - 依赖 Tauri 配置，不做额外的原生窗口处理
                // tauri.conf.json 中已配置 alwaysOnTop: true, skipTaskbar: true, transparent: true
                #[cfg(target_os = "windows")]
                {
                    if let Some(floating) = &floating_window {
                        let _ = floating.set_decorations(false);
                        // 不修改 Windows 原生窗口样式，避免干扰 Tauri 的窗口管理
                    }
                }
            } else {
                // 普通窗口模式：显示主窗口，隐藏悬浮球
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
