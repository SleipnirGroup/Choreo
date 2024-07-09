import json
from choreolib.choreo_trajectory import ChoreoTrajectoryState
from choreolib.choreo_trajectory import ChoreoTrajectory


def from_file(file: str) -> ChoreoTrajectory:
    samples = []
    with open(file, "r", encoding="utf-8") as traj_file:
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
                )
            )

    return ChoreoTrajectory(samples)
