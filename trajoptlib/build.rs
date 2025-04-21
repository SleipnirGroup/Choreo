use cmake::Config;

fn main() {
    let mut cmake_config = Config::new(".");

    cmake_config
        .profile("Release")
        .define("BUILD_TESTING", "OFF");

    cmake_config.define("BUILD_SHARED_LIBS", "OFF");

    if cfg!(target_os = "windows") {
        cmake_config
            .generator("Visual Studio 17 2022")
            .cxxflag("/EHsc");
    }

    let cmake_dest = cmake_config.build();

    let mut bridge_build = cxx_build::bridge("src/lib.rs");

    bridge_build
        .file("src/rust_ffi.cpp")
        .include("src")
        .include(format!("{}/include", cmake_dest.display()))
        .include(format!("{}/include/eigen3", cmake_dest.display()))
        .flag_if_supported("-std=c++23")
        .flag_if_supported("-std=c++2b")
        .flag_if_supported("/std:c++23preview");

    if cfg!(target_os = "windows") {
        bridge_build.flag("/EHsc").flag("/utf-8");
    }

    bridge_build.compile("TrajoptLibRust");

    println!(
        "cargo:rustc-link-search=native={}/bin",
        cmake_dest.display()
    );
    println!(
        "cargo:rustc-link-search=native={}/lib",
        cmake_dest.display()
    );
    println!(
        "cargo:rustc-link-search=native={}/build/_deps/sleipnir-build/",
        cmake_dest.display()
    );
    println!("cargo:rustc-link-lib=TrajoptLibRust");
    println!("cargo:rustc-link-lib=TrajoptLib");
    println!("cargo:rustc-link-lib=Sleipnir");

    println!("cargo:rerun-if-changed=CMakeLists.txt");
    println!("cargo:rerun-if-changed=cmake");
    println!("cargo:rerun-if-changed=include");
    println!("cargo:rerun-if-changed=src");
}
