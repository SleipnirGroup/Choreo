{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  name = "Choreo";

  packages = with pkgs; [
    cargo
    nodejs
    gcc

    pkg-config
    cmake
    webkitgtk
    gnome.libsoup
  ];

  shellHook = ''
    export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$PWD/src-tauri
  '';
}
