cmake_minimum_required(VERSION 3.26)
project(rest_router LANGUAGES CXX)

set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build using shared libraries" FORCE)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}")
set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(../cmake/FetchWPILib.cmake)
fetch_wpilib()

include(../cmake/CompilerFlags.cmake)

file(GLOB_RECURSE rest_router_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp")

add_library(rest_router ${rest_router_SOURCES})
add_library(choreo_rest_router ALIAS rest_router)

suppress_clangcl_unused_command_line_argument(rest_router)

target_compile_features(rest_router PUBLIC cxx_std_23)
compiler_flags(rest_router)

target_include_directories(
    rest_router
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

target_link_libraries(rest_router PUBLIC wpiutil wpinet)

if(BUILD_TESTING AND NOT CMAKE_CROSSCOMPILING)
    enable_testing()
    add_executable(rest_router_smoke_test
        "${CMAKE_CURRENT_SOURCE_DIR}/test/rest_router_smoke_test.cpp"
    )
    suppress_clangcl_unused_command_line_argument(rest_router_smoke_test)
    compiler_flags(rest_router_smoke_test)
    target_compile_features(rest_router_smoke_test PRIVATE cxx_std_23)
    target_link_libraries(rest_router_smoke_test PRIVATE rest_router)
    add_test(NAME rest_router_smoke_test COMMAND rest_router_smoke_test)
endif()
