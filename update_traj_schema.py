#!/usr/bin/env python3

"""
A utility script to update the trajectory schema in multiple files.

simply run `python update_trajectory_schema.py <version>` to update the version in the files.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Callable


@dataclass(frozen=True, slots=True)
class Location:
    relative_path: Path
    # length, width
    template: Callable[[int], str]


LOCATIONS: list[Location] = [
    # Choreo UI
    Location(
        relative_path=Path("src/document/2025/TrajSchemaVersion.ts"),
        template=lambda version: f"""// Auto-generated by update_traj_schema.py
export const TRAJ_SCHEMA_VERSION = {version};""",
    ),
    # Choreo backend
    Location(
        relative_path=Path("src-core/src/spec/traj_schema_version.rs"),
        template=lambda version: f"""// Auto-generated by update_traj_schema.py
pub const TRAJ_SCHEMA_VERSION: u32 = {version};""",
    ),
    # Java ChoreoLib
    Location(
        relative_path=Path(
            "choreolib/src/main/java/choreo/util/TrajSchemaVersion.java"
        ),
        template=lambda version: f"""// Copyright (c) Choreo contributors

// Auto-generated by update_traj_schema.py
package choreo.util;

/** Internal autogenerated class for storing the current trajectory schema version. */
public class TrajSchemaVersion {{
  /** The current trajectory schema version. */
  public static final int TRAJ_SCHEMA_VERSION = {version};
}}""",
    ),
    # Python ChoreoLib
    Location(
        relative_path=Path("choreolib/py/choreo/util/traj_schema_version.py"),
        template=lambda version: f"""# Auto-generated by update_traj_schema.py
TRAJ_SCHEMA_VERSION = {version}""",
    ),
    # C++ ChoreoLib
    Location(
        relative_path=Path(
            "choreolib/src/main/native/include/choreo/util/TrajSchemaVersion.h"
        ),
        template=lambda version: f"""// Copyright (c) Choreo contributors

// Auto-generated by update_traj_schema.py
#pragma once
namespace choreo {{
[[deprecated("Use kTrajSchemaVersion.")]]
inline constexpr uint32_t kTrajSpecVersion = {version};
inline constexpr uint32_t kTrajSchemaVersion = {version};
}}  // namespace choreo""",
    ),
]


def update_version(version: int) -> None:

    for location in LOCATIONS:
        file_path = Path(__file__).parent / location.relative_path

        with open(file_path, "w") as f:
            f.write(location.template(version))
            f.write("\n")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Update version in files")
    parser.add_argument("version", type=int, help="Trajectory schema version")
    args = parser.parse_args()
    update_version(args.version)
