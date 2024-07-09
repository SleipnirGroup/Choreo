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
        return re.search(r"v([0-9]+\.[0-9]+\.[0-9]+)", proc.stdout).group(1)
