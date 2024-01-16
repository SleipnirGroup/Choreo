fn main() {
    #[cfg(target_os = "macos")]
    {
        println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path/");
        println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path/../Resources/");
        println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path/../../");
    }

    #[cfg(target_os = "linux")]
    {
        println!("cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN/");
        println!("cargo:rustc-link-arg=-Wl,-rpath,/opt/trajopt/lib");
        println!("cargo:rustc-link-arg=-Wl,-rpath,/usr/local/lib");
        println!("cargo:rustc-link-arg=-Wl,-rpath,/usr/lib");
    }

    tauri_build::build()
}
