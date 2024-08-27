# TrajoptLib

![Build](https://github.com/SleipnirGroup/Choreo/actions/workflows/trajoptlib-cpp.yml/badge.svg)

This library is used to generate time-optimal trajectories for FRC robots.

Trajectory optimization works by mathematically formulating the problem of travelling along a given path with the minimum possible time. The physical constraints of motor power capacity are applied along with waypoint constraints, which force the robot to begin and end a segment of the trajectory with a certain state. A mathematical solver must vary the position of the robot at each discrete timestamp to minimize total time.

## Features

* Currently only supports swerve drives with arbitray module configurations
* Position and velocity constraints at each waypoint
* Circle and polygon obstacle avoidance
* Custom physical constraints of robot
* Custom bumper shape

## Build

### Dependencies

* C++20 compiler
  * On Windows 10 or greater, install [Visual Studio Community 2022](https://visualstudio.microsoft.com/vs/community/) and select the C++ programming language during installation
  * On Ubuntu 22.04 or greater, install GCC 11 via `sudo apt install g++-11`
  * On macOS 13.3 or greater, install the Xcode 14 command-line build tools via `xcode-select --install`
* [CMake](https://cmake.org/download/) 3.21 or greater
  * On Windows, install from the link above
  * On Linux, install via `sudo apt install cmake`
  * On macOS, install via `brew install cmake`
* [Rust](https://www.rust-lang.org/) compiler
* [Sleipnir](https://github.com/SleipnirGroup/Sleipnir) (optional backend)
* [Catch2](https://github.com/catchorg/Catch2) (tests only)

Library dependencies which aren't installed locally will be automatically downloaded and built by CMake.

### C++ library

On Windows, open a [Developer PowerShell](https://learn.microsoft.com/en-us/visualstudio/ide/reference/command-prompt-powershell?view=vs-2022). On Linux or macOS, open a Bash shell.

```bash
# Clone the repository
git clone git@github.com:SleipnirGroup/TrajoptLib
cd TrajoptLib

# Configure
cmake -B build -S .

# Build
cmake --build build

# Test
ctest --test-dir build --output-on-failure

# Install
cmake --install build --prefix pkgdir
```

The following build types can be specified via `-DCMAKE_BUILD_TYPE` during CMake configure:

* Debug
  * Optimizations off
  * Debug symbols on
* Release
  * Optimizations on
  * Debug symbols off
* RelWithDebInfo (default)
  * Release build type, but with debug info
* MinSizeRel
  * Minimum size release build

### Rust library

On Windows, open a [Developer PowerShell](https://learn.microsoft.com/en-us/visualstudio/ide/reference/command-prompt-powershell?view=vs-2022). On Linux or macOS, open a Bash shell.

```bash
# Clone the repository
git clone git@github.com:SleipnirGroup/TrajoptLib
cd TrajoptLib

cargo build
```
