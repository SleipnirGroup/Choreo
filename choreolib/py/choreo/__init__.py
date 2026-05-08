import json
import os

import hal
from choreo.trajectory import (
    DifferentialSample,
    DifferentialTrajectory,
    EventMarker,
    SwerveSample,
    SwerveTrajectory,
    load_event_marker,
    marker_is_not_none,
)
from choreo.util.traj_schema_version import (
    TRAJ_SCHEMA_VERSION as generated_TRAJ_SCHEMA_VERSION,
)
from wpilib import getDeployDirectory

TRAJ_SCHEMA_VERSION = generated_TRAJ_SCHEMA_VERSION


def load_differential_trajectory_string(
    trajectory_json_string: str,
) -> DifferentialTrajectory:
    """Load a differential trajectory from a string.

    Parameter ``trajectory_json_string``:
        The JSON string.
    """
    # Usage report
    hal.report(hal.tResourceType.kResourceType_ChoreoTrajectory, 2)

    data = json.loads(trajectory_json_string)
    name = data["name"]
    try:
        version = int(data["version"])
        if version != TRAJ_SCHEMA_VERSION:
            raise ValueError(
                f"{name}.traj: Wrong version {version}. Expected {TRAJ_SCHEMA_VERSION}"
            )
    except ValueError:
        raise ValueError(
            f"{name}.traj: Wrong version {data['version']}. Expected {TRAJ_SCHEMA_VERSION}"
        )
    samples = [
        DifferentialSample(
            float(sample["t"]),
            float(sample["x"]),
            float(sample["y"]),
            float(sample["heading"]),
            float(sample["vl"]),
            float(sample["vr"]),
            float(sample["omega"]),
            float(sample["al"]),
            float(sample["ar"]),
            float(sample["alpha"]),
            float(sample["fl"]),
            float(sample["fr"]),
        )
        for sample in data["trajectory"]["samples"]
    ]
    splits = [int(split) for split in data["trajectory"]["splits"]]
    # Add 0 as the first split index
    if len(splits) == 0 or splits[0] != 0:
        splits.insert(0, 0)
    events = list[EventMarker](
        filter(
            marker_is_not_none,
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
    with open(
        os.path.join(getDeployDirectory(), "choreo", trajectory_name + ".traj"),
        "r",
        encoding="utf-8",
    ) as trajectory_file:
        data = trajectory_file.read()
    return load_differential_trajectory_string(data)


def load_swerve_trajectory_string(trajectory_json_string: str) -> SwerveTrajectory:
    """Load a swerve trajectory from a string.

    Parameter ``trajectory_json_string``:
        The JSON string.
    """
    # Usage report
    hal.report(hal.tResourceType.kResourceType_ChoreoTrajectory, 1)

    data = json.loads(trajectory_json_string)
    name = data["name"]
    try:
        version = int(data["version"])
        if version != TRAJ_SCHEMA_VERSION:
            raise ValueError(
                f"{name}.traj: Wrong version {version}. Expected {TRAJ_SCHEMA_VERSION}"
            )
    except ValueError:
        raise ValueError(
            f"{name}.traj: Wrong version {data['version']}. Expected {TRAJ_SCHEMA_VERSION}"
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
    events = list[EventMarker](
        filter(
            marker_is_not_none,
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
    with open(
        os.path.join(getDeployDirectory(), "choreo", trajectory_name + ".traj"),
        "r",
        encoding="utf-8",
    ) as trajectory_file:
        data = trajectory_file.read()
    return load_swerve_trajectory_string(data)
