cmake_minimum_required(VERSION 3.26)
project(generator LANGUAGES CXX)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
include(FetchContent)
# Force shared library build for trajoptlib
set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build using shared libraries" FORCE)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}")
set(CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_STANDARD 23)
if (MSVC)
    message(STATUS "Building with MSVC") 
endif()



# FetchContent_Declare(jartjson GIT_REPOSITORY "https://github.com/jart/json.cpp" GIT_TAG "ccb9195e6abe9eb060e338a04f43e8d2e67b45ea")
# FetchContent_MakeAvailable(jartjson)


FetchContent_Declare(
    TCLAP
    EXCLUDE_FROM_ALL
    GIT_REPOSITORY "https://github.com/mirror/tclap"
)
FetchContent_MakeAvailable(TCLAP)

if(NOT TARGET TrajoptLib)
    add_subdirectory(
        "${CMAKE_CURRENT_LIST_DIR}/../trajoptlib"
        "${CMAKE_CURRENT_BINARY_DIR}/trajoptlib"
    )
endif()

include(../cmake/CompilerFlags.cmake)

include (../cmake/FetchWPILib.cmake)
fetch_wpilib()
if(NOT TARGET choreo_document)
    add_subdirectory(
        "${CMAKE_CURRENT_LIST_DIR}/../document/cpp"
        "${CMAKE_CURRENT_BINARY_DIR}/choreo_document"
    )
endif()

if(NOT TARGET choreo_renderer)
    add_subdirectory(
        "${CMAKE_CURRENT_LIST_DIR}/../renderer"
        "${CMAKE_CURRENT_BINARY_DIR}/choreo_renderer"
    )
endif()

if(NOT TARGET choreo_progress_update_sender)
    add_subdirectory(
        "${CMAKE_CURRENT_LIST_DIR}/../progress-update-sender"
        "${CMAKE_CURRENT_BINARY_DIR}/choreo_progress_update_sender"
    )
endif()
# Collect sources for the executable
file(
    GLOB_RECURSE generator_SOURCES
    "${CMAKE_CURRENT_SOURCE_DIR}/src/main.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/cli_parser.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/split_to_segments.cpp"
)

add_executable(generator ${generator_SOURCES})

suppress_clangcl_unused_command_line_argument(generator)

target_compile_definitions(generator PRIVATE CHOREO_WITH_TRAJOPT)

# C++ standard
#target_compile_features(generator PRIVATE cxx_std_23)

# Public include dir for this executable (optional)
target_include_directories(
    generator
    PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include
    # Add TCLAP include directory
    ${tclap_SOURCE_DIR}/include
)

target_link_libraries(
    generator
    PRIVATE TrajoptLib wpimath wpiutil choreo_document choreo_renderer choreo_progress_update_sender
)

# Optional: install rule
install(TARGETS generator RUNTIME DESTINATION bin)
