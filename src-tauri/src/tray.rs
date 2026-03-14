use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, Runtime,
};

pub fn setup_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let show_main = MenuItem::with_id(app, "show_main", "显示主窗口", true, None::<&str>)?;
    let hide_all = MenuItem::with_id(app, "hide_all", "隐藏所有窗口", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出应用", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_main, &hide_all, &quit])?;

    let _tray = TrayIconBuilder::new()
        .icon(Image::from_bytes(include_bytes!("../icons/32x32.png"))?)
        .menu(&menu)
        .menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show_main" => {
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.show();
                    let _ = main_window.set_focus();
                }
                if let Some(floating_window) = app.get_webview_window("floating") {
                    let _ = floating_window.show();
                }
            }
            "hide_all" => {
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.hide();
                }
                if let Some(floating_window) = app.get_webview_window("floating") {
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
