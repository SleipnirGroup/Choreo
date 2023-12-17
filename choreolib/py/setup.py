from setuptools import setup, find_packages
import subprocess, re

gitDescribeResult = (
    subprocess.check_output(["git", "describe", "--tags", "--match=v*", "--always"])
    .decode("utf-8")
    .strip()
)

m = re.search(r"v([0-9]{4}\.[0-9]{1}.[0-9]{1})", gitDescribeResult)

# Extract the first portion of the git describe result
# which should be PEP440 compliant
if m:
    versionString = m.group(1)
else:
    print("Warning, no valid version found")
    versionString = gitDescribeResult

# Put the version info into a python file for runtime access
with open("choreolib/version.py", "w", encoding="utf-8") as fp:
    fp.write(f'CHOREOLIB_VERSION="{versionString}"\n')
    fp.write(f'CHOREOLIB_GIT_DESCRIBE="{gitDescribeResult}"\n')


print(f"Building version {versionString}")


descriptionStr = f"""
Pure-python implementation of ChoreoLib for parsing .traj files
Implemented with Choreo version {gitDescribeResult} .
"""

setup(
    name="choreolib",
    packages=find_packages(),
    version=versionString,
    install_requires=[
        "wpilib<2025,>=2024.0.0b2",
    ],
    description=descriptionStr,
    url="https://github.com/SleipnirGroup/Choreo",
    author="Choreo Development Team",
)
