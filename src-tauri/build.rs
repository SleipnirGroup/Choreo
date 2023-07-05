use std::fs;
use glob::glob;

fn main() {
  #[cfg(target_os = "macos")]
  const LIB_PATTERN: &str = "lib/lib*.dylib";

  #[cfg(target_os = "linux")]
  const LIB_PATTERN: &str = "lib/lib*.so";

  #[cfg(target_os = "windows")]
  const LIB_PATTERN: &str = "bin/*.dll";
  
  #[cfg(target_os = "macos")]
  println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path/");
  
  #[cfg(target_os = "linux")]
  println!("cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN/");

  const NATIVE_LIB_OUT_DIR: &str = "target/release/bin";

  let native_lib_search_dir = format!("target/release/build/trajoptlib-*/out/{}", LIB_PATTERN);

  let target_triple = std::env::var("TARGET").unwrap();

  std::fs::create_dir_all(NATIVE_LIB_OUT_DIR).expect("Unable to create directory for native libraries");

  for entry in glob(&native_lib_search_dir).expect("Failed to find trajoptlib dylibs") {
    let file = entry.expect("error loading dylib");
    let output_file = format!("{}/{}-{}",
        NATIVE_LIB_OUT_DIR, file.file_name().unwrap().to_str().unwrap(), target_triple);
    fs::copy(file.clone(), output_file).expect("Error copying dylib");
  }

  tauri_build::build()
}
