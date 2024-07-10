import json
from choreolib.choreo_trajectory import ChoreoTrajectoryState
from choreolib.choreo_trajectory import ChoreoTrajectory


def get_trajectory(traj_name: str) -> ChoreoTrajectory:
    """Load a trajectory from a file.

    Parameter ``traj_name``:
        The path name in Choreo, which matches the file name in the deploy
        directory. Do not include ".traj" here.
    """
    samples = []
    with open(traj_name + ".traj", "r", encoding="utf-8") as traj_file:
        data = json.load(traj_file)
        for sample in data["samples"]:
            samples.append(
                ChoreoTrajectoryState(
                    float(sample["timestamp"]),
                    float(sample["x"]),
                    float(sample["y"]),
                    float(sample["heading"]),
                    float(sample["velocityX"]),
                    float(sample["velocityY"]),
                    float(sample["angularVelocity"]),
                    [float(x) for x in sample["moduleForcesX"]],
                    [float(y) for y in sample["moduleForcesY"]],
                )
            )

    return ChoreoTrajectory(samples)
