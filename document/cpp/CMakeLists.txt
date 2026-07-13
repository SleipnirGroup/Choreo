cmake_minimum_required(VERSION 3.26)
project(choreo_document LANGUAGES CXX)

include(FetchContent)
option(WITH_TRAJOPT ON)
# Force shared library build for trajoptlib
set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build using shared libraries" FORCE)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}")
set(CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_STANDARD 23)
if(WITH_TRAJOPT AND NOT TARGET TrajoptLib)
    add_subdirectory(
        "${CMAKE_CURRENT_SOURCE_DIR}/../../trajoptlib"
        "${CMAKE_CURRENT_BINARY_DIR}/TrajoptLib"
    )
endif()
# FetchContent_Declare(jartjson GIT_REPOSITORY "https://github.com/jart/json.cpp" GIT_TAG "ccb9195e6abe9eb060e338a04f43e8d2e67b45ea")
# FetchContent_MakeAvailable(jartjson)

include (../../cmake/FetchWPILib.cmake)
fetch_wpilib()

include(../../cmake/CompilerFlags.cmake)
# Collect sources for the executable
file(
    GLOB_RECURSE choreo_document_SOURCES
    "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp"
)

add_library(choreo_document ${choreo_document_SOURCES})

suppress_clangcl_unused_command_line_argument(choreo_document)

if(WITH_TRAJOPT)
    target_compile_definitions(choreo_document PUBLIC CHOREO_WITH_TRAJOPT)
endif()
# C++ standard
target_compile_features(choreo_document PRIVATE cxx_std_23)

target_include_directories(
    choreo_document
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)
target_link_libraries(choreo_document PUBLIC wpimath wpiutil)
if(WITH_TRAJOPT)
    # Trajopt headers are included by public choreo_document headers, so this
    # dependency must be PUBLIC for consumers to inherit include directories.
    target_link_libraries(choreo_document PUBLIC TrajoptLib)
endif()
