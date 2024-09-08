fn main() {
    built::write_built_file().expect("Failed to acquire build-time information");
    std::env::set_var(
        "TAURI_CONFIG",
        "{ \"tauri\": { \"bundle\": { \"externalBin\": null } } }",
    );
    tauri_build::build();
    std::env::set_var("TAURI_CONFIG", "{}");
}
