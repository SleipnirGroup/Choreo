import json

from choreo.trajectory import load_event_marker
from choreo.trajectory import EventMarker
from choreo.trajectory import DifferentialSample
from choreo.trajectory import DifferentialTrajectory
from choreo.trajectory import SwerveSample
from choreo.trajectory import SwerveTrajectory
from choreo.spec_version import SPEC_VERSION


def load_differential_trajectory_string(
    trajectory_json_string: str,
) -> DifferentialTrajectory:
    """Load a differential trajectory from a string.

    Parameter ``trajectory_json_string``:
        The JSON string.
    """
    data = json.loads(trajectory_json_string)
    name = data["name"]
    version = data["version"]
    if version != SPEC_VERSION:
        raise ValueError(
            f"{name}.traj: Wrong version {version}. Expected {SPEC_VERSION}"
        )
    samples = [
        DifferentialSample(
            float(sample["t"]),
            float(sample["x"]),
            float(sample["y"]),
            float(sample["heading"]),
            float(sample["vl"]),
            float(sample["vr"]),
            float(sample["al"]),
            float(sample["ar"]),
            [float(x) for x in sample["fl"]],
            [float(y) for y in sample["fr"]],
        )
        for sample in data["trajectory"]["samples"]
    ]
    splits = [int(split) for split in data["trajectory"]["splits"]]
    # Add 0 as the first split index
    if len(splits) == 0 or splits[0] != 0:
        splits.insert(0, 0)
    events = list(
        filter(
            lambda marker: marker is not None,
            [load_event_marker(event) for event in data["events"]],
        )
    )

    return DifferentialTrajectory(data["name"], samples, splits, events)


def load_differential_trajectory(trajectory_name: str) -> DifferentialTrajectory:
    """Load a differential trajectory from a file.

    Parameter ``trajectory_name``:
        The path name in Choreo, which matches the file name in the deploy
        directory. Do not include ".traj" here.
    """
    with open(trajectory_name + ".traj", "r", encoding="utf-8") as trajectory_file:
        data = trajectory_file.read()
    return load_differential_trajectory_string(data)


def load_swerve_trajectory_string(trajectory_json_string: str) -> SwerveTrajectory:
    """Load a swerve trajectory from a string.

    Parameter ``trajectory_json_string``:
        The JSON string.
    """
    data = json.loads(trajectory_json_string)
    name = data["name"]
    version = data["version"]
    if version != SPEC_VERSION:
        raise ValueError(
            f"{name}.traj: Wrong version {version}. Expected {SPEC_VERSION}"
        )
    samples = [
        SwerveSample(
            float(sample["t"]),
            float(sample["x"]),
            float(sample["y"]),
            float(sample["heading"]),
            float(sample["vx"]),
            float(sample["vy"]),
            float(sample["omega"]),
            float(sample["ax"]),
            float(sample["ay"]),
            float(sample["alpha"]),
            [float(x) for x in sample["fx"]],
            [float(y) for y in sample["fy"]],
        )
        for sample in data["trajectory"]["samples"]
    ]
    splits = [int(split) for split in data["trajectory"]["splits"]]
    # Add 0 as the first split index
    if len(splits) == 0 or splits[0] != 0:
        splits.insert(0, 0)
    events = list(
        filter(
            lambda marker: marker is not None,
            [load_event_marker(event) for event in data["events"]],
        )
    )

    return SwerveTrajectory(data["name"], samples, splits, events)


def load_swerve_trajectory(trajectory_name: str) -> SwerveTrajectory:
    """Load a swerve trajectory from a file.

    Parameter ``trajectory_name``:
        The path name in Choreo, which matches the file name in the deploy
        directory. Do not include ".traj" here.
    """
    with open(trajectory_name + ".traj", "r", encoding="utf-8") as trajectory_file:
        data = trajectory_file.read()
    return load_swerve_trajectory_string(data)
