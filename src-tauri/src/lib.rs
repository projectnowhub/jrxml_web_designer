use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Deep link
        .plugin(tauri_plugin_deep_link::init())
        // Open URLs in browser
        .plugin(tauri_plugin_opener::init())
        // Single instance
        // IMPORTANT: register this before deep-link handling
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            println!("A new app instance was opened with: {argv:?}");

            // Bring existing window to front
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.show();
                let _ = main.set_focus();
            }
        }))
        .setup(|app| {
            // Linux development:
            // register the custom URL scheme
            #[cfg(target_os = "linux")]
            {
                use tauri_plugin_deep_link::DeepLinkExt;

                app.deep_link().register("cdp-report-app")?;
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
