cmake_minimum_required(VERSION 3.26)
project(choreo_document LANGUAGES CXX)

include(FetchContent)
option(WITH_TRAJOPT ON)
# Force shared library build for trajoptlib
set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build using shared libraries" FORCE)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}")

if (WITH_TRAJOPT)
FetchContent_Declare(
    TrajoptLib
    SOURCE_DIR
    "${CMAKE_CURRENT_LIST_DIR}/../trajoptlib/"
)
FetchContent_MakeAvailable(TrajoptLib)

endif()
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
file(GLOB_RECURSE choreo_document_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp")

add_library(choreo_document ${choreo_document_SOURCES})

if (WITH_TRAJOPT)
 target_compile_definitions(choreo_document PUBLIC -DWITH_TRAJOPT)
endif()
# C++ standard
target_compile_features(choreo_document PRIVATE cxx_std_23)

target_include_directories(
    choreo_document
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)
target_link_libraries(choreo_document PRIVATE wpimath wpiutil)
if (WITH_TRAJOPT)   
    target_link_libraries(choreo_document PRIVATE TrajoptLib)
endif()

