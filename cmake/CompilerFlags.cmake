macro(compiler_flags target)
    if(NOT MSVC)
        target_compile_options(${target} PRIVATE -Wall -Wextra -pedantic)
    else()
        # Suppress the following warnings:
        #   * C4244: lossy conversion
        #   * C4251: missing dllexport/dllimport attribute on data member
        target_compile_options(${target} PRIVATE /wd4244 /wd4251)
    endif()
    set_property(TARGET ${target} PROPERTY COMPILE_WARNING_AS_ERROR ON)

    if(MSVC)
        target_compile_options(${target} PUBLIC /utf-8 /bigobj)
    endif()
endmacro()

macro(suppress_clangcl_unused_command_line_argument target)
    if(MSVC AND CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
        target_compile_options(${target} PRIVATE
            "/clang:-Wno-unused-command-line-argument"
            "/clang:-Qunused-arguments"
        )
    endif()
endmacro()