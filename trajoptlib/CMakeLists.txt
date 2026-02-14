cmake_minimum_required(VERSION 3.22)
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")

set(CMAKE_BUILD_TYPE "RelWithDebInfo" CACHE STRING "")
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

project(TrajoptLib LANGUAGES CXX)

include(CMakePackageConfigHelpers)
include(CTest)
include(CompilerFlags)
include(FetchContent)

# Control where the static and shared libraries are built so that on Windows,
# we don't need to tinker with the path to run the executable
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}")
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}")
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}")

option(BUILD_EXAMPLES "Build examples" OFF)
option(BUILD_SHARED_LIBS "Build using shared libraries" ON)

file(GLOB_RECURSE TrajoptLib_src src/*.cpp)
list(FILTER TrajoptLib_src EXCLUDE REGEX rust_ffi.cpp)

set(CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS FALSE)
add_library(TrajoptLib ${TrajoptLib_src})
set(CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS TRUE)

compiler_flags(TrajoptLib)
target_include_directories(TrajoptLib PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)
target_compile_definitions(TrajoptLib PRIVATE TRAJOPT_EXPORTS)
target_include_directories(
    TrajoptLib
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

if(BUILD_TESTING)
    # Catch2 dependency
    FetchContent_Declare(
        Catch2
        GIT_REPOSITORY https://github.com/catchorg/Catch2.git
        GIT_TAG v3.12.0
        GIT_SHALLOW ON
        EXCLUDE_FROM_ALL
        SYSTEM
    )
    FetchContent_MakeAvailable(Catch2)
endif()

set(BUILD_TESTING_SAVE ${BUILD_TESTING})
set(BUILD_EXAMPLES_SAVE ${BUILD_EXAMPLES})

set(BUILD_TESTING OFF)
set(BUILD_EXAMPLES OFF)

FetchContent_Declare(
    Sleipnir
    GIT_REPOSITORY https://github.com/SleipnirGroup/Sleipnir
    GIT_TAG v0.4.0
    GIT_SHALLOW ON
    SYSTEM
)
FetchContent_MakeAvailable(Sleipnir)

set(BUILD_TESTING ${BUILD_TESTING_SAVE})
set(BUILD_EXAMPLES ${BUILD_EXAMPLES_SAVE})

target_link_libraries(TrajoptLib PUBLIC Sleipnir::Sleipnir)

install(
    TARGETS TrajoptLib
    EXPORT TrajoptLibTargets
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
    INCLUDES DESTINATION include
)
export(TARGETS TrajoptLib FILE TrajoptLib.cmake NAMESPACE TrajoptLib::)
install(DIRECTORY include/ COMPONENT TrajoptLib DESTINATION "include")
install(
    EXPORT TrajoptLibTargets
    FILE TrajoptLib.cmake
    NAMESPACE TrajoptLib::
    DESTINATION lib/cmake/TrajoptLib
)

# Generate the config file that includes the exports
configure_package_config_file(
    ${CMAKE_CURRENT_SOURCE_DIR}/TrajoptLibConfig.cmake.in
    ${CMAKE_CURRENT_BINARY_DIR}/TrajoptLibConfig.cmake
    INSTALL_DESTINATION "lib/cmake/TrajoptLib"
    NO_SET_AND_CHECK_MACRO
    NO_CHECK_REQUIRED_COMPONENTS_MACRO
)

# Install the config file
install(
    FILES ${CMAKE_CURRENT_BINARY_DIR}/TrajoptLibConfig.cmake
    COMPONENT TrajoptLib
    DESTINATION lib/cmake/TrajoptLib
)

if(BUILD_TESTING)
    enable_testing()
    list(APPEND CMAKE_MODULE_PATH ${Catch2_SOURCE_DIR}/extras)
    include(Catch)
endif()
get_cmake_property(IS_MULTI_CONFIG GENERATOR_IS_MULTI_CONFIG)
# Build TrajoptLib tests
if(BUILD_TESTING)
    file(GLOB_RECURSE trajoptlib_test_src test/src/*.cpp)
    add_executable(trajoptlib_test ${trajoptlib_test_src})
    compiler_flags(trajoptlib_test)
    target_include_directories(
        trajoptlib_test
        PRIVATE
            ${CMAKE_CURRENT_SOURCE_DIR}/src
            ${CMAKE_CURRENT_SOURCE_DIR}/test/include
    )
    target_link_libraries(trajoptlib_test TrajoptLib Catch2::Catch2WithMain)
    catch_discover_tests(
        trajoptlib_test
        DL_PATHS ${Sleipnir_BINARY_DIR}/$<${IS_MULTI_CONFIG}:$<CONFIG>>
    )
endif()

# Build examples and example tests
if(BUILD_EXAMPLES)
    include(SubdirList)
    subdir_list(EXAMPLES ${CMAKE_CURRENT_SOURCE_DIR}/examples)
    foreach(example ${EXAMPLES})
        # Build example
        file(GLOB_RECURSE sources examples/${example}/src/*.cpp)
        add_executable(${example} ${sources})
        compiler_flags(${example})
        target_include_directories(
            ${example}
            PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/examples/${example}/include
        )
        target_link_libraries(${example} TrajoptLib)

        # Build example test if files exist for it
        if(
            BUILD_TESTING
            AND EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/examples/${example}/test
        )
            file(GLOB_RECURSE test_sources examples/${example}/test/*.cpp)
            add_executable(${example}_test ${sources} ${test_sources})
            target_include_directories(
                ${example}_test
                PRIVATE
                    ${CMAKE_CURRENT_SOURCE_DIR}/examples/${example}/src
                    ${CMAKE_CURRENT_SOURCE_DIR}/examples/${example}/test
            )
            compiler_flags(${example}_test)
            target_compile_definitions(${example}_test PUBLIC RUNNING_TESTS)
            target_include_directories(
                ${example}_test
                PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/examples/${example}/include
            )
            target_link_libraries(
                ${example}_test
                TrajoptLib
                Catch2::Catch2WithMain
            )
            if(NOT CMAKE_TOOLCHAIN_FILE)
                catch_discover_tests(
                    ${example}_test
                    DL_PATHS
                        ${Sleipnir_BINARY_DIR}/$<${IS_MULTI_CONFIG}:$<CONFIG>>
                )
            endif()
        endif()
    endforeach()
endif()
