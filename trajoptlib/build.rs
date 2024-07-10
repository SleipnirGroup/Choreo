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
        .file("src/RustFFI.cpp")
        .include("src")
        .include(format!("{}/include", cmake_dest.display()))
        .include(format!("{}/include/eigen3", cmake_dest.display()))
        .std("c++20");

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
    println!("cargo:rustc-link-lib=TrajoptLibRust");
    println!("cargo:rustc-link-lib=TrajoptLib");
    println!("cargo:rustc-link-lib=Sleipnir");
    println!("cargo:rustc-link-lib=fmt");

    println!("cargo:rerun-if-changed=src/RustFFI.hpp");
    println!("cargo:rerun-if-changed=src/RustFFI.cpp");
    println!("cargo:rerun-if-changed=src/lib.rs");
}
