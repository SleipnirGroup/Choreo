macro (fetch_wpilib)
set(WITH_CSCORE OFF CACHE INTERNAL "With CSCore")
set(WITH_GUI OFF CACHE INTERNAL "With GUI")
set(WITH_JAVA OFF CACHE INTERNAL "With Java")
set(WITH_NTCORE OFF CACHE INTERNAL "With NTCore")
set(WITH_SIMULATION_MODULES OFF CACHE INTERNAL "With Simulation Modules")
set(WITH_TESTS OFF CACHE INTERNAL "With Tests")
set(WITH_WPIMATH ON CACHE INTERNAL "With WPIMath")
set(WITH_WPILIB OFF CACHE INTERNAL "With WPILib")
set(NO_WERROR ON)
if(MSVC)
    # set(WPILIB_TARGET_WARNINGS "/wd5105" CACHE INTERNAL "WPILib Compiler Warnings") # shueja: had to silence a warning coming from deep in the Windows SDK.
endif()
option(USE_SYSTEM_EIGEN "Use system eigen" ON)
set(USE_SYSTEM_SLEIPNIR ON CACHE INTERNAL "Use system Sleipnir")
FetchContent_Declare(
    wpilib
    GIT_REPOSITORY https://github.com/zachwaffle4/allwpilib.git
    GIT_TAG trajectory-api
    SYSTEM
     PATCH_COMMAND git apply C:\\\\Users\\\\jashu\\\\git\\\\Choreo-2026\\\\wpilib.patch
     UPDATE_DISCONNECTED 1
)
FetchContent_MakeAvailable(wpilib)
endmacro()