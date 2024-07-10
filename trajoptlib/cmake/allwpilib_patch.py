#!/usr/bin/env python3

import os
import re
import shutil
import subprocess
import sys
import typing


def get_linesep(contents):
    """Returns string containing autodetected line separator for file.

    Keyword arguments:
    contents -- file contents string
    """
    # Find potential line separator
    pos = contents.find("\n")

    # If a newline character was found and the character preceding it is a
    # carriage return, assume CRLF line endings. LF line endings are assumed
    # for empty files.
    if pos > 0 and contents[pos - 1] == "\r":
        return "\r\n"
    else:
        return "\n"


def modify_file(filename, func: typing.Callable[[list[str]], list[str]]):
    """
    Reads a file, modifies the contents with func, then writes the file.
    """
    with open(filename, encoding="utf-8") as f:
        contents = f.read()

    sep = get_linesep(contents)
    lines = contents.split(sep)
    lines = func(lines)

    with open(filename, "w", encoding="utf-8") as f:
        f.write(sep.join(lines))


def remove_protobuf_support():
    shutil.rmtree("wpimath/src/main/native/cpp/controller/proto", ignore_errors=True)
    shutil.rmtree("wpimath/src/main/native/cpp/geometry/proto", ignore_errors=True)
    shutil.rmtree("wpimath/src/main/native/cpp/kinematics/proto", ignore_errors=True)
    shutil.rmtree("wpimath/src/main/native/cpp/system/plant/proto", ignore_errors=True)
    shutil.rmtree("wpimath/src/main/native/cpp/trajectory/proto", ignore_errors=True)
    shutil.rmtree("wpiutil/src/main/native/cpp/protobuf", ignore_errors=True)
    shutil.rmtree(
        "wpimath/src/main/native/include/frc/controller/proto", ignore_errors=True
    )
    shutil.rmtree(
        "wpimath/src/main/native/include/frc/geometry/proto", ignore_errors=True
    )
    shutil.rmtree(
        "wpimath/src/main/native/include/frc/kinematics/proto", ignore_errors=True
    )
    shutil.rmtree(
        "wpimath/src/main/native/include/frc/system/plant/proto", ignore_errors=True
    )
    shutil.rmtree(
        "wpimath/src/main/native/include/frc/trajectory/proto", ignore_errors=True
    )
    shutil.rmtree("wpiutil/src/main/native/thirdparty/protobuf", ignore_errors=True)
    shutil.rmtree("wpiutil/src/main/native/cpp/DataLog.cpp", ignore_errors=True)
    shutil.rmtree("wpiutil/src/main/native/include/wpi/DataLog.h", ignore_errors=True)

    modify_file(
        "CMakeLists.txt",
        lambda lines: [
            line for line in lines if line != "find_package(Protobuf REQUIRED)"
        ],
    )
    modify_file(
        "wpiutil/CMakeLists.txt",
        lambda lines: [line.replace("protobuf::libprotobuf", "") for line in lines],
    )
    modify_file(
        "wpiutil/wpiutil-config.cmake.in",
        lambda lines: [line for line in lines if line != "find_dependency(Protobuf)"],
    )

    filenames = [os.path.join(dp, f) for dp, dn, fn in os.walk("wpimath") for f in fn]

    def fix(lines):
        # Remove lines mentioning protobuf
        lines = [
            line
            for line in lines
            if "$<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/protobuf>" not in line
            and not re.search(r"#include \"\w+\.pb\.h\"", line)
            and not re.search(r"#include \"frc/.*?Proto\.h\"", line)
        ]

        # Remove protobuf_generate_cpp() call
        filtered_lines = []
        found = False
        for i in range(len(lines)):
            if lines[i].startswith("# workaround for makefiles"):
                found = True
            if not found:
                filtered_lines.append(lines[i])
            if found and lines[i].startswith(")"):
                found = False
        lines = filtered_lines

        return lines

    for filename in filenames:
        modify_file(filename, fix)


def main():
    remove_protobuf_support()

    # Disable psabi warning
    subprocess.run(
        [
            "git",
            "apply",
            "--ignore-whitespace",
            os.path.join(sys.argv[1], "cmake/allwpilib-disable-psabi-warning.patch"),
        ],
        check=True,
    )


if __name__ == "__main__":
    main()
