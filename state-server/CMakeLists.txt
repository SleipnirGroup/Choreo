cmake_minimum_required(VERSION 3.26)
project(state_server LANGUAGES CXX)

set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build using shared libraries" FORCE)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}")
set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(../cmake/FetchWPILib.cmake)
fetch_wpilib()

if(NOT TARGET choreo_document)
    add_subdirectory(
        "${CMAKE_CURRENT_LIST_DIR}/../document/cpp"
        "${CMAKE_CURRENT_BINARY_DIR}/choreo_document"
    )
endif()

if(NOT TARGET rest_router)
    add_subdirectory(
        "${CMAKE_CURRENT_LIST_DIR}/../rest-router"
        "${CMAKE_CURRENT_BINARY_DIR}/rest_router"
    )
endif()

if(NOT TARGET choreo_history_engine)
    add_subdirectory(
        "${CMAKE_CURRENT_LIST_DIR}/../history-engine"
        "${CMAKE_CURRENT_BINARY_DIR}/choreo_history_engine"
    )
endif()

include(../cmake/CompilerFlags.cmake)

file(GLOB_RECURSE state_server_SOURCES CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp")

add_executable(state-server ${state_server_SOURCES})

suppress_clangcl_unused_command_line_argument(state-server)
compiler_flags(state-server)
target_compile_features(state-server PRIVATE cxx_std_23)

target_include_directories(
    state-server
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/include
        ${CMAKE_CURRENT_LIST_DIR}/../generator/include
)

target_link_libraries(
    state-server
    PRIVATE
    choreo_history_engine
        rest_router
        choreo_document
        wpinet
        wpiutil
)
