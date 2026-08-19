mod state;
mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            state::load_state,
            state::save_state,
            state::reset_state,
            vault::scan_notes,
            vault::read_note,
            vault::write_note,
            vault::delete_note,
            vault::create_vault,
            vault::open_note_in_obsidian,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
