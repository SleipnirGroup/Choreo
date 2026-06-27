cmake_minimum_required(VERSION 3.26)
project(choreo_renderer LANGUAGES CXX)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
include(FetchContent)
# Force shared library build for trajoptlib
set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build using shared libraries" FORCE)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}")

include(FetchContent)
FetchContent_Declare(
    lunasvg
    GIT_REPOSITORY https://github.com/sammycage/lunasvg.git
    GIT_TAG
        master # Specify the desired branch or tag
)
FetchContent_MakeAvailable(lunasvg)

set(WITH_TRAJOPT ON)
FetchContent_Declare(
    choreo_document
    SOURCE_DIR
    "${CMAKE_CURRENT_LIST_DIR}/../document/cpp/"
)
FetchContent_MakeAvailable(choreo_document)

FetchContent_Declare(
    TrajoptLib
    SOURCE_DIR
    "${CMAKE_CURRENT_LIST_DIR}/../trajoptlib/"
)
FetchContent_MakeAvailable(TrajoptLib)

# FetchContent_Declare(jartjson GIT_REPOSITORY "https://github.com/jart/json.cpp" GIT_TAG "ccb9195e6abe9eb060e338a04f43e8d2e67b45ea")
# FetchContent_MakeAvailable(jartjson)

include (../cmake/FetchWPILib.cmake)
fetch_wpilib()
# Collect sources for the executable
file(
    GLOB_RECURSE choreo_renderer_SOURCES
    "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp"
)

add_library(choreo_renderer ${choreo_renderer_SOURCES})

# C++ standard
#target_compile_features(choreo_renderer PRIVATE cxx_std_23)

# Public include dir for this executable (optional)
target_include_directories(
    choreo_renderer
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

target_link_libraries(
    choreo_renderer
    PRIVATE TrajoptLib wpimath wpiutil choreo_document lunasvg::lunasvg
)

# Optional: install rule
install(TARGETS choreo_renderer RUNTIME DESTINATION bin)
