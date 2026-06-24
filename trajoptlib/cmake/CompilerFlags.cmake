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

    target_compile_features(${target} PUBLIC cxx_std_23)
    if(MSVC)
        target_compile_options(${target} PUBLIC /MP /utf-8 /bigobj)
        # /Zf is an MSVC argument not currently supported by clang-cl.
        # See https://github.com/llvm/llvm-project/issues/51578.
        if(
            NOT (
                ${CMAKE_CXX_COMPILER_ID} STREQUAL "Clang"
                AND ${CMAKE_CXX_COMPILER_FRONTEND_VARIANT} STREQUAL "MSVC"
            )
        )
            target_compile_options(${target} PUBLIC /Zf)
        endif()
    endif()
endmacro()
