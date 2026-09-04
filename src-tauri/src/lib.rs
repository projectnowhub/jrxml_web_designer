use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // IMPORTANT:
    // single-instance MUST be registered before deep-link.
    #[cfg(desktop)]
    {
        builder = builder.plugin(
            tauri_plugin_single_instance::init(|app, argv, cwd| {
                println!("Single instance callback");
                println!("argv: {:?}", argv);
                println!("cwd: {}", cwd);

                // The deep-link plugin will already have processed
                // the deep-link arguments because the "deep-link"
                // feature is enabled on tauri-plugin-single-instance.

                if let Some(main) = app.get_webview_window("main") {
                    let _ = main.show();
                    let _ = main.set_focus();
                }
            }),
        );
    }

    // Deep-link plugin MUST come after single-instance.
    builder = builder.plugin(tauri_plugin_deep_link::init());

    // Opener
    builder = builder.plugin(tauri_plugin_opener::init());

    // Development logging
    builder = builder.setup(|app| {
        #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
        {
            use tauri_plugin_deep_link::DeepLinkExt;

            // Register configured schemes during development.
            app.deep_link().register_all()?;
        }

        if cfg!(debug_assertions) {
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;
        }

        Ok(())
    });

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}