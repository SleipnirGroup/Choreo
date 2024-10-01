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
        m = re.search(
            r"^v([0-9]+\.[0-9]+\.[0-9]+)(-([0-9]+))?(-(.*))?",
            proc.stdout.rstrip(),
            re.X,
        )

        # Choreo uses tags like v2025.0.0-alpha-1. We turn that into 2025.0.0a1
        # to comply with https://peps.python.org/pep-0440/#public-version-identifiers.
        # For dev: version number: <tag>.dev<# commits since tag>
        version = m.group(1)
        if m.group(2):
            version += f".dev{m.group(3)}"
        elif m.group(4):
            version += m.group(5).replace("alpha", "a").replace("beta", "b")
        return version
