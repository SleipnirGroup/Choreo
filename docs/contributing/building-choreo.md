## Dependencies

### Requirements for Windows

- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm), [Rust](https://www.rust-lang.org/tools/install), [CMake](https://cmake.org/download)
- [Visual Studio Community 2022](https://visualstudio.microsoft.com/vs/community/) with C++ programming language selected during installation

### Requirements for macOS

- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm), [Rust](https://www.rust-lang.org/tools/install), [CMake](https://cmake.org/download)
- Xcode command-line tools via `xcode-select --install`

### Requirements for Linux

- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm), [Rust](https://www.rust-lang.org/tools/install), [CMake](https://cmake.org/download)
- GCC via `sudo apt install gcc`
- Tauri dependencies (see [here](https://tauri.app/v1/guides/getting-started/prerequisites/#setting-up-linux)).

## Recommended IDE for Tauri

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Release Build

Install Node.js dependencies.

```console
npm install
```

Build an NSIS `.exe` installer on Windows, `.dmg` bundle on macOS, or `.deb` package on Linux.

```console
npm run tauri build
```

## Development Server

Install Node.js dependencies.

```console
npm install
```

Start development server (debug).

```console
npm run tauri dev
```

Start development server (release).

```console
npm run tauri dev -- --release
```

## macOS Cross Compilation

Macs can target either `arm64` or `x86_64`.

Install the desired Rust target.

```console
rustup target install aarch64-apple-darwin  # arm64
rustup target install x86_64-apple-darwin  # x86_64
```

Create `src-tauri/.cargo/config.toml` that contains the target used above.

```toml
[build]
target = "<target>"
```

## Tech Stack

- ⚛️ [React](https://react.dev/): Frontend framework (JS)
- ⚡️ [Vite](https://vitejs.dev/): Frontend framework (JS)
- 🖥️ [Tauri](https://tauri.app/): Desktop application framework and backend (Rust)
- 🚗 [TrajoptLib](https://github.com/SleipnirGroup/TrajoptLib): Generates trajectories with Sleipnir (C++, Rust)
- 📈 [Sleipnir](https://github.com/SleipnirGroup/Sleipnir): Numerical optimizer (C++)
