# Choreo

[![Discord](https://img.shields.io/discord/975739302933856277?color=%23738ADB&label=Join%20our%20Discord&logo=discord&logoColor=white)](https://discord.gg/ad2EEZZwsS)

Choreo (_Constraint-Honoring Omnidirectional Route Editor and Optimizer_, pronounced like choreography) is a graphical tool for planning time-optimized trajectories for autonomous mobile robots in the FIRST Robotics Competition.

## Download and Install

Grab the latest release for your platform on the [releases](https://github.com/SleipnirGroup/Choreo/releases) page.

### Development System Dependencies

Requirements for **all** platforms:

- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [Rust](https://www.rust-lang.org/tools/install)
- [CMake](https://cmake.org/download)
- [clang](https://releases.llvm.org/download.html)

### Windows

Choreo can be built and run on Windows, but it requires a few extra steps because CasADi requires the MinGW toolchain.

#### Windows Environment

Buliding on Windows requires [MinGW](https://github.com/niXman/mingw-builds-binaries/releases/). On the release page, download the binary labeled `x86_64`, `posix`, and `msvcrt`. Extract the `mingw64` folder to `C:\mingw64`. Add an entry to the user or system `PATH` environment variable that points to `C:\mingw64\bin`.

After installing MinGW, run `rustup default stable-gnu` to switch to the GNU toolchain that uses MinGW. This can be reverted using `rustup default stable-msvc` when returning to other rust projects.

Run `npm install` to build Node.js dependencies and TrajoptLib. Once it is finished, the libraries will be copied into `src-tauri/*.dll`. You will need to redo this step if Choreo begins using a different version of TrajoptLib.

#### Windows Dev Server

Run `npm run tauri dev -- --release` to start the dev server.

The `--release` avoids issue [#84](https://github.com/SleipnirGroup/Choreo/issues/84).

If you're having a permissions error with CMake, try first building using the `cargo` command directly:

```console
cd src-tauri
cargo build --release
```

Then try `npm run tauri dev -- --release` again.

#### Windows Bundle

To create an NSIS `.exe` installer bundle, run `npm run tauri build`. It will report the location of the bundle upon completion.

### macOS

The following steps can be used to build for arm64 or x86_64 architectures.

#### macOS Environment

Make sure Xcode command line tools are installed:

```console
xcode-select --install
```

Run `npm install` to build Node.js dependencies and TrajoptLib. Once it is finished, the libraries will be copied into `src-tauri/lib*.dylib`. You will need to redo this step if Choreo begins using a different version of TrajoptLib.

#### macOS Cross Compilation

An `arm64` or `x86_64` Mac can be used to build for `arm64` or `x86_64` targets. The target architecture will be the currently selected Rust target triple.

You can create a `config.toml` file in `src-tauri/.cargo` containing the following definition to change the target from the native architecture to the other:

```toml
[build]
target = "aarch64-apple-darwin" # arm64 (Apple Silicon) target
```

or,

```toml
[build]
target = "x86_64-apple-darwin" # x86_64 (Intel) target
```

You must first install the Rust targets using `rustup target install <target>`.

#### macOS Dev Server

Run `npm run tauri dev` to start the dev server.

#### macOS Bundle

To create a `.dmg` macOS bundle, run `npm run tauri build`. It will report the location of the bundle upon completion.

### Linux

The following steps can be used for Ubuntu Linux; others may require additional configuration. If you find any additional required steps for your distro, please create a PR or issue to add documentation for it.

#### Linux Environment

Tauri requires some libraries to function, follow their [instructions](https://tauri.app/v1/guides/getting-started/prerequisites/#setting-up-linux).

Run `npm install` to build Node.js dependencies and TrajoptLib. Once it is finished, the libraries will be copied into `src-tauri/lib*.so*`. You will need to redo this step if Choreo begins using a different version of TrajoptLib.

#### Linux Dev Server

Run `npm run tauri dev` to start the dev server.

If there is an issue locating shared libraries, copy all files matching `src-tauri/lib*.so*` into `src-tauri/target/debug/` to ensure they can be found. If you do have to do this step, please report this as an issue on [our GitHub issues tracker](https://github.com/SleipnirGroup/Choreo/issues).

#### Linux Bundle

To create a `.deb` Debian/Ubuntu bundle, run `npm run tauri build`. It will report the location of the bundle upon completion.

## Tech stack

- 📈 [CasADi](https://github.com/casadi/casadi): Numerical optimizer
- 🖥️ [Tauri](https://tauri.app/): Desktop applications
- ⚛️ [React](https://react.dev/): JS Framework
- 🚗 [TrajoptLib](https://github.com/SleipnirGroup/TrajoptLib): Uses CasADi to generate paths
- 🦀 [Rust](https://www.rust-lang.org/): Backend code
- ⚡️ [Vite](https://vitejs.dev/)

## Physical input parameters

The trajectory optimizer depends upon the following user-specificed parameters, which are entered in the Robot Configuration panel.

- **Mass** [kg]: The mass of the robot with battery and bumpers
- **MoI** [kg * m<sup>2</sup>]: The resistance to change in rotational velocity in response to a torque applied to the robot about the vertical axis
- **Max Velocity** [m/s]: The maximum tangential speed of the wheel
  - Note: A reasonable choice of Max Velocity is that corresponding to ~80% of free speed experienced at the drive motor(s)
- **Max Torque** [N * m]: The maximum torque applied at the wheel
  - Note: A reasonable choice of Max Torque is that corresponding to a current draw of approximately `1.5 * BreakerValue` experienced at the drive motor(s)
- **Wheelbase** and **Trackwidth** [m]: The largest distances between the robot's wheel centers
- **Length** and **Width** [m]: The overall size of the robot's _bumper_

### Measuring moment of intertia

The robot's rotational inertia has a significant impact on how quickly it can follow complex paths. For the best results, it is recommended to get as accurate an estimate of this parameter as possible. This can be accomplished via:

- Faithful CAD loaded with mass properties
- Physical experimentation
- System Identification methods

If none of these techniques are possible, a reasonable estimate of MoI would be `mass * length * width / 6` based on the assumption of a rectangle of uniformly-distributed mass.

## Tauri Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
