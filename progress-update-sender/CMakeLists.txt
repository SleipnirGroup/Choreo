cmake_minimum_required(VERSION 3.26)
project(progress_update_sender LANGUAGES CXX)

include(FetchContent)

set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build using shared libraries" FORCE)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}")
set(CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_STANDARD 23)

set(WITH_TRAJOPT ON)
if(NOT TARGET choreo_document)
    add_subdirectory(
        "${CMAKE_CURRENT_LIST_DIR}/../document/cpp"
        "${CMAKE_CURRENT_BINARY_DIR}/choreo_document"
    )
endif()

include(../cmake/FetchWPILib.cmake)
fetch_wpilib()

include(../cmake/CompilerFlags.cmake)

file(
    GLOB_RECURSE progress_update_sender_SOURCES
    "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp"
)

add_library(progress_update_sender ${progress_update_sender_SOURCES})
add_library(choreo_progress_update_sender ALIAS progress_update_sender)

suppress_clangcl_unused_command_line_argument(progress_update_sender)

target_compile_features(progress_update_sender PUBLIC cxx_std_23)

target_include_directories(
    progress_update_sender
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

target_link_libraries(
    progress_update_sender
    PUBLIC wpinet wpiutil choreo_document
)