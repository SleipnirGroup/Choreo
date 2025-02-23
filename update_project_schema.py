#!/usr/bin/env python3

"""
A utility script to update the project schema in multiple files.

simply run `python update_project_schema.py <version>` to update the version in the files.
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
        relative_path=Path("src/document/2025/ProjectSchemaVersion.ts"),
        template=lambda version: f"""// Auto-generated by update_project_schema.py
export const PROJECT_SCHEMA_VERSION = {version};""",
    ),
    # Choreo backend
    Location(
        relative_path=Path("src-core/src/spec/project_schema_version.rs"),
        template=lambda version: f"""// Auto-generated by update_project_schema.py
pub const PROJECT_SCHEMA_VERSION: u32 = {version};""",
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
    parser.add_argument("version", type=int, help="Project schema version")
    args = parser.parse_args()
    update_version(args.version)
