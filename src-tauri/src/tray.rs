use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, Runtime,
};

pub fn setup_tray<R: Runtime>(
    app: &tauri::AppHandle<R>,
    is_floating_mode: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let menu = if is_floating_mode {
        // 悬浮球模式的菜单
        let show_floating = MenuItem::with_id(app, "show_floating", "显示悬浮球", true, None::<&str>)?;
        let show_main = MenuItem::with_id(app, "show_main", "显示主窗口", true, None::<&str>)?;
        let hide_all = MenuItem::with_id(app, "hide_all", "隐藏所有窗口", true, None::<&str>)?;
        let quit = MenuItem::with_id(app, "quit", "退出应用", true, None::<&str>)?;
        Menu::with_items(app, &[&show_floating, &show_main, &hide_all, &quit])?
    } else {
        // 普通窗口模式的菜单
        let show_main = MenuItem::with_id(app, "show_main", "显示主窗口", true, None::<&str>)?;
        let hide_main = MenuItem::with_id(app, "hide_main", "隐藏主窗口", true, None::<&str>)?;
        let quit = MenuItem::with_id(app, "quit", "退出应用", true, None::<&str>)?;
        Menu::with_items(app, &[&show_main, &hide_main, &quit])?
    };

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show_floating" => {
                if let Some(floating_window) = app.get_webview_window("floating") {
                    let _ = floating_window.show();
                    let _ = floating_window.set_focus();
                }
            }
            "show_main" => {
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.show();
                    let _ = main_window.set_focus();
                }
            }
            "hide_main" | "hide_all" => {
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.hide();
                }
                if event.id.as_ref() == "hide_all" {
                    if let Some(floating_window) = app.get_webview_window("floating") {
                        let _ = floating_window.hide();
                    }
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}
