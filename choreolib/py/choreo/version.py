import re
import subprocess


def get_version():
    proc = subprocess.run(
        [
            "git",
            "describe",
            "--tags",
        ],
        check=True,
        encoding="utf-8",
        stdout=subprocess.PIPE,
    )
    # If there are no tags, default to 0.0.0
    if proc.returncode:
        return "0.0.0"
    else:
        match = re.search(
            r"""
            ^v
            ( [0-9]+\.[0-9]+\.[0-9]+ ) # group 1 semver
            ( -([0-9]+) )? # group 3 commits since last tag
            ( -([a-z\d]+) )? # group 5 commit hash (if group 2) or alpha or beta (if not group 2)
            ( -([0-9]+) )? # group 7 alpha or beta number
            """,
            proc.stdout.rstrip(),
            re.X,
        )

        version = match.group(1)

        # Choreo uses tags like v2025.0.0-alpha-1. We turn that into 2025.0.0a1
        # to comply with https://peps.python.org/pep-0440/#public-version-identifiers.
        # For dev: version number: <tag>.dev<# commits since tag>
        if match.group(2):
            version += f".dev{match.group(3)}"
        elif match.group(4):
            version += match.group(5).replace("alpha", "a").replace(
                "beta", "b"
            ) + match.group(7)
        return version
