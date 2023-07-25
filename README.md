# Choreo

[![Discord](https://img.shields.io/discord/975739302933856277?color=%23738ADB&label=Join%20our%20Discord&logo=discord&logoColor=white)](https://discord.gg/ad2EEZZwsS)

Choreo (_Constraint-Honoring Omnidirectional Route Editor and Optimizer_, pronounced like choreography) is a graphical tool for planning time-optimized trajectories for autonomous mobile robots in the FIRST Robotics Competition.

## Download and Install

Grab the latest release for your platform on the [releases](https://github.com/SleipnirGroup/Choreo/releases) page.

### Development System Dependencies

Requirements for __all__ platforms:

- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [Rust](https://www.rust-lang.org/tools/install)
- [CMake](https://cmake.org/download)

### Windows

Choreo can be built and run on Windows, but it requires a few extra steps because CasADi requires the MinGW toolchain.

#### Windows Environment

Buliding on Windows requires [MinGW](https://github.com/niXman/mingw-builds-binaries/releases/). On the release page, download the x86_64, posix, and msvcrt version. Extract the mingw64 folder to C:\mingw64. Add an entry to the user or system PATH that points to C:\mingw64\bin.

After installing MinGW, run `rustup default stable-gnu` to switch to the GNU toolchain that uses MinGW.

#### Windows Dev Server

Run `npm install` to build Node.js dependencies and TrajoptLib. Once it is finished, the
libraries will be copied into `src-tauri/*.dll`.

Run `npm run tauri dev -- --release` to start the dev server.

The `--release` avoids issue #84.

If you're having a permissions error with CMake, try first building using the `cargo` command directly:

```console
cd src-tauri
cargo build
```

Then try `npm run tauri dev -- --release` again.

### macOS

The following steps can be used to build for arm64 or x86_64 architectures.

#### macOS Environment

Make sure Xcode command line tools are installed:

```console
xcode-select --install
```

#### macOS Cross-Compilation

An arm64 or x86_64 Mac can be used to build for arm64 or x86_64 targets. The target architecture will be the currently selected Rust target triple.

You can create a `config.toml` file in `src-tauri/.cargo` containing the following definition to change the target:

```toml
[build]
target = "aarch64-apple-darwin" # arm64 (Apple Silicon) target
```

or,

```toml
[build]
target = "x86_64-apple-darwin" # x86_64 (Intel) target
```

You can install those targets using `rustup target install <target>`.


## To run in Tauri

- Have Node.js, npm, and rust installed.
- Navigate to the root directory of the project.
- `npm install` and `npm run tauri dev`

## To build an executable

- Coming soon...

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
