function(pybind11_mkdoc target headers)
    find_package(Python3 REQUIRED COMPONENTS Interpreter)
    if(UNIX AND NOT APPLE)
        set(env_vars LLVM_DIR_PATH=/usr/lib LIBCLANG_PATH=/usr/lib/libclang.so)
    endif()

    get_target_property(target_dirs ${target} INCLUDE_DIRECTORIES)
    list(TRANSFORM target_dirs PREPEND "-I")

    get_target_property(eigen_dirs Eigen3::Eigen INTERFACE_INCLUDE_DIRECTORIES)
    list(FILTER eigen_dirs INCLUDE REGEX "\\$<BUILD_INTERFACE:.*>")
    list(TRANSFORM eigen_dirs PREPEND "-I")

    add_custom_command(
        OUTPUT ${CMAKE_CURRENT_SOURCE_DIR}/jormungandr/cpp/Docstrings.hpp
        COMMAND
            ${env_vars} ${Python3_EXECUTABLE} -m pybind11_mkdoc ${headers} -o
            ${CMAKE_CURRENT_SOURCE_DIR}/jormungandr/cpp/Docstrings.hpp
            -I/usr/lib/clang/18/include ${target_dirs} ${eigen_dirs} -std=c++23
        COMMAND
            ${Python3_EXECUTABLE}
            ${CMAKE_CURRENT_SOURCE_DIR}/cmake/fix_docstrings.py
            ${CMAKE_CURRENT_SOURCE_DIR}/jormungandr/cpp/Docstrings.hpp
        DEPENDS ${headers}
        USES_TERMINAL
    )
    add_custom_target(
        ${target}_docstrings
        DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/jormungandr/cpp/Docstrings.hpp
    )
endfunction()
