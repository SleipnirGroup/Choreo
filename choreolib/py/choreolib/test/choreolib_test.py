import os
from choreolib import choreo


def test_basic_parse():
    traj = choreo.get_trajectory(
        os.path.join(os.path.dirname(__file__), "resources", "test")
    )

    for i in range(0, 500):
        traj.sample(i * 0.01)
