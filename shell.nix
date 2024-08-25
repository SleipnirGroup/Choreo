{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  name = "Choreo";

  packages = with pkgs; [
    cargo
    rustc
    nodejs
    gcc
    pnpm
    git

    pkg-config
    cmake
    webkitgtk
    gnome.libsoup
    librsvg
    fmt_11
    cacert
  ];

  shellHook = ''
    export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$PWD/src-tauri
  '';
}
