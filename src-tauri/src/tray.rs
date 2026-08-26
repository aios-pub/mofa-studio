use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    LogicalSize, Manager, Runtime,
    Emitter,
};

pub fn setup_tray<R: Runtime>(
    app: &tauri::AppHandle<R>,
    is_floating_mode: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let menu = if is_floating_mode {
        // Desktop pet mode menu
        let show_pet = MenuItem::with_id(app, "show_pet", "显示桌宠", true, None::<&str>)?;
        let show_main = MenuItem::with_id(app, "show_main", "显示主窗口", true, None::<&str>)?;
        let hide_all = MenuItem::with_id(app, "hide_all", "隐藏所有窗口", true, None::<&str>)?;
        let quit = MenuItem::with_id(app, "quit", "退出应用", true, None::<&str>)?;
        Menu::with_items(app, &[&show_pet, &show_main, &hide_all, &quit])?
    } else {
        // Normal window mode menu
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
            "show_pet" => {
                // Show the desktop pet, hide the main window
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.hide();
                }
                if let Some(floating_window) = app.get_webview_window("floating") {
                    // Reset the window size to the pet size
                    let _ = floating_window.set_size(LogicalSize::new(64.0, 64.0));
                    // Emit an event to notify the frontend to reset state
                    let _ = floating_window.emit("tray:reset-pet", ());
                    let _ = floating_window.show();
                    let _ = floating_window.set_focus();
                }
            }
            "show_main" => {
                // Show the main window, hide the desktop pet
                if let Some(floating_window) = app.get_webview_window("floating") {
                    let _ = floating_window.hide();
                }
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.show();
                    let _ = main_window.set_focus();
                }
            }
            "hide_main" | "hide_all" => {
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.hide();
                }
                if event.id.as_ref() == "hide_all"
                    && let Some(floating_window) = app.get_webview_window("floating") {
                        let _ = floating_window.hide();
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
