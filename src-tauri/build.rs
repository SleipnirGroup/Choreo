fn main() {
    built::write_built_file().expect("Failed to acquire build-time information");
    unsafe {
        std::env::set_var("TAURI_CONFIG", "{ \"bundle\": { \"externalBin\": null } }");
    }
    tauri_build::build();
    unsafe {
        std::env::set_var("TAURI_CONFIG", "{}");
    }
}
