mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            state::load_state,
            state::save_state,
            state::reset_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
