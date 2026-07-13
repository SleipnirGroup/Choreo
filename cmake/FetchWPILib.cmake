macro (fetch_wpilib)
set(WPILIB_WITH_CSCORE OFF CACHE INTERNAL "With CSCore")
set(WPILIB_WITH_GUI OFF CACHE INTERNAL "With GUI")
set(WPILIB_WITH_JAVA OFF CACHE INTERNAL "With Java")
set(WPILIB_WITH_NTCORE ON CACHE INTERNAL "With NTCore")
set(WPILIB_WITH_SIMULATION_MODULES OFF CACHE INTERNAL "With Simulation Modules")
set(WPILIB_WITH_TESTS OFF CACHE INTERNAL "With Tests")
set(WPILIB_WITH_WPIMATH ON CACHE INTERNAL "With WPIMath")
set(WPILIB_WITH_WPILIB OFF CACHE INTERNAL "With WPILib")
set(WPILIB_NO_WERROR ON)
if(MSVC)
    # Silence warnings triggered in upstream Windows/WPILib headers when using clang-cl.
    set(
        WPILIB_TARGET_WARNINGS
        "/clang:-Wno-c++11-narrowing"
        "/clang:-Wno-unused-command-line-argument"
        "/clang:-Qunused-arguments"
        CACHE INTERNAL "WPILib Compiler Warnings"
    )
endif()
option(WPILIB_USE_SYSTEM_EIGEN "Use system eigen" ON)

    set(EIGEN_BUILD_CMAKE_PACKAGE TRUE)
    FetchContent_Declare(
        Eigen3
        GIT_REPOSITORY https://gitlab.com/libeigen/eigen.git
        # master on 2026-03-29
        GIT_TAG b7f6aed1b9974fd56cce651b4ff059c3bfc67782
        SYSTEM
        OVERRIDE_FIND_PACKAGE
    )
    FetchContent_MakeAvailable(Eigen3)
set(WPILIB_USE_SYSTEM_SLEIPNIR ON CACHE INTERNAL "Use system Sleipnir")
FetchContent_Declare(
    wpilib
    GIT_REPOSITORY https://github.com/wpilibsuite/allwpilib.git
    GIT_TAG main
    EXCLUDE_FROM_ALL
    SYSTEM
     UPDATE_DISCONNECTED 1
)
FetchContent_MakeAvailable(wpilib)


# Ensure stable namespaced targets are available in this build tree.
if(TARGET wpimath AND NOT TARGET wpimath::wpimath)
    add_library(wpimath::wpimath ALIAS wpimath)
endif()

if(TARGET wpiutil AND NOT TARGET wpiutil::wpiutil)
    add_library(wpiutil::wpiutil ALIAS wpiutil)
endif()

if(TARGET wpinet AND NOT TARGET wpinet::wpinet)
    add_library(wpinet::wpinet ALIAS wpinet)
endif()
endmacro()