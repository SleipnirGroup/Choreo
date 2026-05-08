let
  pkgs = import <nixpkgs> { };
in
pkgs.mkShell {
  nativeBuildInputs = with pkgs; [
    pkg-config
    wrapGAppsHook4
    cargo
    rustc
    cargo-tauri
    nodejs
    corepack

    pipx
    ninja
    gcc
    cmake
    clang-tools
  ];

  buildInputs = with pkgs; [
    librsvg
    webkitgtk_4_1
  ];

  shellHook = ''
    export XDG_DATA_DIRS="$GSETTINGS_SCHEMAS_PATH" # Needed on Wayland to report the correct display scale
    pipx install wpiformat
    export PATH="~/.local/bin:$PATH"
  '';
}
