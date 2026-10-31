cmake_minimum_required(VERSION 3.28)
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")

set(CMAKE_BUILD_TYPE "RelWithDebInfo" CACHE STRING "")
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

set(TRAJOPT_VERSION 0.0.0)
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/../.git)
    execute_process(
        COMMAND git describe --tags --match "v[0-9]*"
        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
        OUTPUT_VARIABLE git_describe
        OUTPUT_STRIP_TRAILING_WHITESPACE
        ERROR_QUIET
    )
    if(git_describe MATCHES "^v([0-9]+\\.[0-9]+\\.[0-9]+)")
        set(TRAJOPT_VERSION ${CMAKE_MATCH_1})
    endif()
endif()

project(TrajoptLib VERSION ${TRAJOPT_VERSION} LANGUAGES CXX)

include(CMakePackageConfigHelpers)
include(CTest)
include(CompilerFlags)
include(FetchContent)
include(GNUInstallDirs)

if(PROJECT_IS_TOP_LEVEL)
    # Control where the static and shared libraries are built so that on
    # Windows, we don't need to tinker with the path to run the executable
    set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}")
    set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}")
    set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}")
endif()

option(BUILD_SHARED_LIBS "Build using shared libraries" ON)
option(TRAJOPT_BUILD_EXAMPLES "Build examples" OFF)

file(GLOB_RECURSE TrajoptLib_src CONFIGURE_DEPENDS src/*.cpp)
list(FILTER TrajoptLib_src EXCLUDE REGEX rust_ffi.cpp)

add_library(TrajoptLib ${TrajoptLib_src})
set_target_properties(TrajoptLib PROPERTIES WINDOWS_EXPORT_ALL_SYMBOLS OFF)

compiler_flags(TrajoptLib)
target_include_directories(TrajoptLib PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)
target_compile_definitions(TrajoptLib PRIVATE TRAJOPT_EXPORTS)
file(GLOB_RECURSE TrajoptLib_headers CONFIGURE_DEPENDS include/*.hpp)
target_sources(
    TrajoptLib
    PUBLIC FILE_SET HEADERS BASE_DIRS include FILES ${TrajoptLib_headers}
)

if(PROJECT_IS_TOP_LEVEL AND BUILD_TESTING)
    # Catch2 dependency
    if(CMAKE_SYSTEM_NAME STREQUAL "Generic")
        # Bare-metal targets don't support POSIX signals
        set(CATCH_CONFIG_NO_POSIX_SIGNALS ON)
    endif()
    FetchContent_Declare(
        Catch2
        GIT_REPOSITORY https://github.com/catchorg/Catch2.git
        GIT_TAG v3.16.0
        GIT_SHALLOW ON
        EXCLUDE_FROM_ALL
        SYSTEM
    )
    FetchContent_MakeAvailable(Catch2)
endif()

FetchContent_Declare(
    Sleipnir
    GIT_REPOSITORY https://github.com/SleipnirGroup/Sleipnir
    GIT_TAG v0.6.6
    GIT_SHALLOW ON
    SYSTEM
)
FetchContent_MakeAvailable(Sleipnir)

target_link_libraries(TrajoptLib PUBLIC Sleipnir::Sleipnir)

install(
    TARGETS TrajoptLib
    EXPORT TrajoptLibTargets
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
    FILE_SET HEADERS DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)
export(TARGETS TrajoptLib FILE TrajoptLib.cmake NAMESPACE TrajoptLib::)
install(
    EXPORT TrajoptLibTargets
    FILE TrajoptLib.cmake
    NAMESPACE TrajoptLib::
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/TrajoptLib
)

# Generate the config file that includes the exports
configure_package_config_file(
    ${CMAKE_CURRENT_SOURCE_DIR}/TrajoptLibConfig.cmake.in
    ${CMAKE_CURRENT_BINARY_DIR}/TrajoptLibConfig.cmake
    INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/TrajoptLib
    NO_SET_AND_CHECK_MACRO
    NO_CHECK_REQUIRED_COMPONENTS_MACRO
)

write_basic_package_version_file(
    ${CMAKE_CURRENT_BINARY_DIR}/TrajoptLibConfigVersion.cmake
    COMPATIBILITY SameMinorVersion
)

# Install the config files
install(
    FILES
        ${CMAKE_CURRENT_BINARY_DIR}/TrajoptLibConfig.cmake
        ${CMAKE_CURRENT_BINARY_DIR}/TrajoptLibConfigVersion.cmake
    COMPONENT TrajoptLib
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/TrajoptLib
)

if(PROJECT_IS_TOP_LEVEL AND BUILD_TESTING)
    enable_testing()
    list(APPEND CMAKE_MODULE_PATH ${Catch2_SOURCE_DIR}/extras)
    include(Catch)

    # Adds a Catch2 test executable named <name> built from the source list
    # <src>
    function(trajopt_add_test name src)
        add_executable(${name} ${src})
        compiler_flags(${name})
        target_link_libraries(${name} PUBLIC TrajoptLib Catch2::Catch2WithMain)
        if(NOT CMAKE_CROSSCOMPILING OR CMAKE_CROSSCOMPILING_EMULATOR)
            get_property(
                isMultiConfig
                GLOBAL
                PROPERTY GENERATOR_IS_MULTI_CONFIG
            )
            catch_discover_tests(
                ${name}
                DL_PATHS ${Sleipnir_BINARY_DIR}/$<${isMultiConfig}:$<CONFIG>>
            )
        endif()
    endfunction()

    # Build TrajoptLib tests
    file(GLOB_RECURSE trajoptlib_test_src CONFIGURE_DEPENDS test/src/*.cpp)
    trajopt_add_test(trajoptlib_test "${trajoptlib_test_src}")
    target_include_directories(
        trajoptlib_test
        PRIVATE
            ${CMAKE_CURRENT_SOURCE_DIR}/src
            ${CMAKE_CURRENT_SOURCE_DIR}/test/include
    )
endif()

# Build examples and example tests
if(TRAJOPT_BUILD_EXAMPLES)
    include(SubdirList)
    subdir_list(EXAMPLES ${CMAKE_CURRENT_SOURCE_DIR}/examples)
    foreach(example ${EXAMPLES})
        # Build example
        file(
            GLOB_RECURSE sources
            CONFIGURE_DEPENDS
            examples/${example}/src/*.cpp
        )
        add_executable(${example} ${sources})
        compiler_flags(${example})
        target_include_directories(
            ${example}
            PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/examples/${example}/include
        )
        target_link_libraries(${example} PUBLIC TrajoptLib)

        # Build example test if files exist for it
        if(
            PROJECT_IS_TOP_LEVEL
            AND BUILD_TESTING
            AND EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/examples/${example}/test
        )
            file(
                GLOB_RECURSE test_sources
                CONFIGURE_DEPENDS
                examples/${example}/test/*.cpp
            )
            trajopt_add_test(${example}_test "${sources};${test_sources}")
            target_compile_definitions(${example}_test PRIVATE RUNNING_TESTS)
            target_include_directories(
                ${example}_test
                PRIVATE
                    ${CMAKE_CURRENT_SOURCE_DIR}/examples/${example}/include
                    ${CMAKE_CURRENT_SOURCE_DIR}/examples/${example}/src
                    ${CMAKE_CURRENT_SOURCE_DIR}/examples/${example}/test
            )
        endif()
    endforeach()
endif()
