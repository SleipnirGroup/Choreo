cmake_minimum_required(VERSION 3.26)
project(generator LANGUAGES CXX)

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
    TrajoptLib
    SOURCE_DIR
    "${CMAKE_CURRENT_LIST_DIR}/../trajoptlib/"
)
FetchContent_MakeAvailable(TrajoptLib)

include (../cmake/FetchWPILib.cmake)
fetch_wpilib()
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
# Collect sources for the executable
file(
    GLOB_RECURSE generator_SOURCES
    "${CMAKE_CURRENT_SOURCE_DIR}/src/main.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/split_to_segments.cpp"
)

add_executable(generator ${generator_SOURCES})

# C++ standard
#target_compile_features(generator PRIVATE cxx_std_23)

# Public include dir for this executable (optional)
target_include_directories(
    generator
    PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(
    generator
    PRIVATE TrajoptLib wpimath wpiutil choreo_document choreo_renderer
)

# Optional: install rule
install(TARGETS generator RUNTIME DESTINATION bin)
