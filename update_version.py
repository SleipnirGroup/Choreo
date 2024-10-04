"""
A utility script to update the version in multiple files.

simply run `python update_version.py <version>` to update the version in the files.
"""

from dataclasses import dataclass
from pathlib import Path
import re
from typing import Literal, Callable


def default_version_string(v: str, count: str, hash: str, mod: str, num: str):
    return f"{v}-{mod}-{num}" if len(mod) > 0 else f"{v}-{count}-{hash}"


def cargo_version_string(v: str, count: str, hash: str, mod: str, num: str):
    return f"{v}-{mod}.{num}" if len(mod) > 0 else v


@dataclass(frozen=True, slots=True)
class VersionLocation:
    relative_path: Path
    version_path: list[str | int]
    file_format: Literal["json2", "json4", "toml"]
    function: Callable[[str, str, str, str, str], str] = default_version_string
    prefix: str = ""
    suffix: str = ""


LOCATIONS: list[VersionLocation] = [
    VersionLocation(
        relative_path=Path("package.json"),
        version_path=["version"],
        file_format="json2",
    ),
    VersionLocation(
        relative_path=Path("src-tauri/tauri.conf.json"),
        version_path=["package", "version"],
        file_format="json2",
    ),
    VersionLocation(
        relative_path=Path("src-tauri/tauri.conf.json"),
        version_path=["tauri", "windows", 0, "title"],
        file_format="json2",
        prefix="Choreo v",
    ),
    VersionLocation(
        relative_path=Path("src-tauri/Cargo.toml"),
        version_path=["package", "version"],
        file_format="toml",
        function=cargo_version_string,
    ),
    VersionLocation(
        relative_path=Path("src-cli/Cargo.toml"),
        version_path=["package", "version"],
        file_format="toml",
        function=cargo_version_string,
    ),
    VersionLocation(
        relative_path=Path("src-core/Cargo.toml"),
        version_path=["package", "version"],
        file_format="toml",
        function=cargo_version_string,
    ),
]


def update_version(version: str) -> None:
    # Formats:
    #
    # v2024.2.3-193-g869a3ef
    # v2025.0.0
    # v2025.0.0-alpha-1
    # v2025.0.0-beta-2
    m = re.search(
        r"""
        ^v
        ( [0-9]+\.[0-9]+\.[0-9]+ ) # group 1 semver
        ( -([0-9]+) )? # group 3 commits since last tag
        ( -([a-z\d]+) )? # group 5 commit hash (if group 2) or alpha or beta (if not group 2)
        ( -([0-9]+) )? # group 7 alpha or beta number
        """,
        version,
        re.X,
    )

    version = m.group(1)
    count = m.group(3) if m.group(2) else ""
    hash = m.group(5) if m.group(4) and m.group(2) else ""
    pre = m.group(5) if m.group(4) and not m.group(2) else ""
    num = m.group(7) if m.group(6) else ""
    for location in LOCATIONS:
        file_path = Path(__file__).parent / location.relative_path
        if location.file_format == "json2" or location.file_format == "json4":
            import json

            with open(file_path, "r") as f:
                data = json.load(f)
            og = data
            version_str = (
                location.prefix
                + location.function(version, count, hash, pre, num)
                + location.suffix
            )
            try:
                for key in location.version_path[:-1]:
                    data = data[key]
                data[location.version_path[-1]] = version_str
            except KeyError as e:
                print(
                    f"Version path not found: {location.version_path} in {location.relative_path}"
                )
                raise e
            with open(file_path, "w") as f:
                json.dump(og, f, indent=int(location.file_format[-1]))
        elif location.file_format == "toml":
            import tomlkit

            with open(file_path, "r") as f:
                data = tomlkit.load(f)
            og = data
            version_str = (
                location.prefix
                + location.function(version, count, hash, pre, num)
                + location.suffix
            )
            try:
                for key in location.version_path[:-1]:
                    data = data[key]
                data[location.version_path[-1]] = version_str
            except KeyError as e:
                print(
                    f"Version path not found: {location.version_path} in {location.relative_path}"
                )
                raise e
            with open(file_path, "w") as f:
                tomlkit.dump(og, f)
        else:
            raise ValueError(f"Unsupported file format: {location.file_format}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Update version in files")
    parser.add_argument("version", type=str, help="Version to set")
    args = parser.parse_args()
    update_version(args.version)
