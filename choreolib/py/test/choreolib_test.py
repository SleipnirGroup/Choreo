import os
from choreolib import choreo, choreo_trajectory


def test_basic_parse1():
    traj = choreo.from_file(
        os.path.join(os.path.dirname(__file__), "resources", "test1.traj")
    )

    for i in range(0, 500):
        traj.sample(i * 0.01)
        # TODO: some pass fail


def test_basic_parse2():
    traj = choreo.from_file(
        os.path.join(os.path.dirname(__file__), "resources", "test2.traj")
    )

    for i in range(0, 500):
        traj.sample(i * 0.01)
        # TODO: some pass fail


def test_basic_parse3():
    traj = choreo.from_file(
        os.path.join(os.path.dirname(__file__), "resources", "test3.traj")
    )

    for i in range(0, 500):
        traj.sample(i * 0.01)
        # TODO: some pass fail
