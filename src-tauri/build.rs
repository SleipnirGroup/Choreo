fn main() {
  if cfg!(target_os = "macos") {
    println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path/");
  }
  tauri_build::build()
}
