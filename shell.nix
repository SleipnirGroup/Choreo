{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  name = "Choreo";

  packages = with pkgs; [
    cargo
    gcc
    git
    nodejs
    pnpm
    rustc

    cacert
    cmake
    gnome.libsoup
    librsvg
    pkg-config
    webkitgtk
  ];

  shellHook = ''
    export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$PWD/src-tauri
  '';
}
