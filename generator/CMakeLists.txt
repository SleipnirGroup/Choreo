cmake_minimum_required(VERSION 3.26)
project(generator LANGUAGES CXX)

include(FetchContent)
# Force shared library build for trajoptlib
set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build using shared libraries" FORCE)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}")

FetchContent_Declare(
    TrajoptLib
    SOURCE_DIR
    "${CMAKE_CURRENT_LIST_DIR}/../trajoptlib/"
)
FetchContent_MakeAvailable(TrajoptLib)

set(WITH_TRAJOPT ON)
FetchContent_Declare(
    choreo_document
    SOURCE_DIR
    "${CMAKE_CURRENT_LIST_DIR}/../document/cpp/"

)
FetchContent_MakeAvailable(choreo_document)

FetchContent_Declare(
    choreo_renderer
    SOURCE_DIR
    "${CMAKE_CURRENT_LIST_DIR}/../renderer/"
)
FetchContent_MakeAvailable(choreo_renderer)

# FetchContent_Declare(jartjson GIT_REPOSITORY "https://github.com/jart/json.cpp" GIT_TAG "ccb9195e6abe9eb060e338a04f43e8d2e67b45ea")
# FetchContent_MakeAvailable(jartjson)

set(WITH_CSCORE OFF CACHE INTERNAL "With CSCore")
set(WITH_GUI OFF CACHE INTERNAL "With GUI")
set(WITH_JAVA OFF CACHE INTERNAL "With Java")
set(WITH_NTCORE OFF CACHE INTERNAL "With NTCore")
set(WITH_SIMULATION_MODULES OFF CACHE INTERNAL "With Simulation Modules")
set(WITH_TESTS OFF CACHE INTERNAL "With Tests")
set(WITH_WPIMATH ON CACHE INTERNAL "With WPIMath")
set(WITH_WPILIB OFF CACHE INTERNAL "With WPILib")
set(NO_WERROR ON)
if (MSVC)
# set(WPILIB_TARGET_WARNINGS "/wd5105" CACHE INTERNAL "WPILib Compiler Warnings") # shueja: had to silence a warning coming from deep in the Windows SDK.
endif()
FetchContent_Declare(
    wpilib
    GIT_REPOSITORY https://github.com/wpilibsuite/allwpilib.git
    GIT_TAG main
    SYSTEM
)
FetchContent_MakeAvailable(wpilib)
# Collect sources for the executable
file(GLOB_RECURSE generator_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/src/main.cpp" "${CMAKE_CURRENT_SOURCE_DIR}/src/split_to_segments.cpp")

add_executable(generator ${generator_SOURCES})

# C++ standard
target_compile_features(generator PRIVATE cxx_std_23)

# Public include dir for this executable (optional)
target_include_directories(
    generator
    PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include
)


target_link_libraries(generator PRIVATE TrajoptLib wpimath wpiutil choreo_document choreo_renderer)

# Optional: install rule
install(TARGETS generator RUNTIME DESTINATION bin)
