cmake_minimum_required(VERSION 3.26)
project(history_engine LANGUAGES CXX)

include(../cmake/FetchWPILib.cmake)
fetch_wpilib()

include(../cmake/CompilerFlags.cmake)

add_library(choreo_history_engine SHARED
    ${CMAKE_CURRENT_SOURCE_DIR}/history_engine.cpp
)

set_target_properties(choreo_history_engine PROPERTIES
    WINDOWS_EXPORT_ALL_SYMBOLS ON
)

suppress_clangcl_unused_command_line_argument(choreo_history_engine)
compiler_flags(choreo_history_engine)
target_compile_features(choreo_history_engine PRIVATE cxx_std_23)

target_include_directories(
    choreo_history_engine
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}
)

target_link_libraries(
    choreo_history_engine
    PUBLIC
        wpiutil
)
