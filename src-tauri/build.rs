use std::fs;

/// Spoof the CLI binary to avoid CI clippy errors,
/// CLI is only required for building the app for preoduction
/// so checking debug profile is enough to prevent unwanted behavior
fn spoof_cli() {
    if std::env::var("PROFILE").unwrap() != "debug" {
        return;
    }
    let dir_path = std::env::current_dir()
        .expect("failed to get current directory")
        .parent()
        .expect("failed to get parent directory")
        .join("cli");
    if !dir_path.exists() {
        fs::create_dir_all(&dir_path).expect("failed to create cli directory");
    }
    let target_triple = std::env::var("TARGET").expect("TARGET env var is not defined");
    let extension = if cfg!(windows) { ".exe" } else { "" };
    let cli_path = dir_path.join(format!("choreo-cli-{}{}", target_triple, extension));
    if !cli_path.exists() {
        fs::write(&cli_path, "").expect("failed to create cli file");
    }
}

fn main() {
    spoof_cli();
    built::write_built_file().expect("Failed to acquire build-time information");
    tauri_build::build();
}
