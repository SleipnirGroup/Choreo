import json
from choreolib.choreoTrajectory import ChoreoTrajectoryState
from choreolib.choreoTrajectory import ChoreoTrajectory


def fromFile(file: str) -> ChoreoTrajectory:
    samples = []
    with open(file, "r", encoding="utf-8") as trajFile:
        data = json.load(trajFile)
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
