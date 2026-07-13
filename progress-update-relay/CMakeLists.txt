cmake_minimum_required(VERSION 3.26)
project(progress_update_relay LANGUAGES CXX)

include(FetchContent)

set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build using shared libraries" FORCE)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}")
set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(../cmake/FetchWPILib.cmake)
fetch_wpilib()

include(../cmake/CompilerFlags.cmake)

file(GLOB_RECURSE progress_update_relay_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp")

add_executable(progress-update-relay ${progress_update_relay_SOURCES})

suppress_clangcl_unused_command_line_argument(progress-update-relay)

target_compile_features(progress-update-relay PRIVATE cxx_std_23)
compiler_flags(progress-update-relay)

target_include_directories(
    progress-update-relay
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(progress-update-relay PRIVATE wpinet wpiutil wpimath)

install(TARGETS progress-update-relay RUNTIME DESTINATION bin)
