import os
from choreolib import choreo


def test_basic_parse1():
    traj = choreo.get_trajectory(
        os.path.join(os.path.dirname(__file__), "resources", "test1")
    )

    for i in range(0, 500):
        traj.sample(i * 0.01)
        # TODO: some pass fail


def test_basic_parse2():
    traj = choreo.get_trajectory(
        os.path.join(os.path.dirname(__file__), "resources", "test2")
    )

    for i in range(0, 500):
        traj.sample(i * 0.01)
        # TODO: some pass fail


def test_basic_parse3():
    traj = choreo.get_trajectory(
        os.path.join(os.path.dirname(__file__), "resources", "test3")
    )

    for i in range(0, 500):
        traj.sample(i * 0.01)
        # TODO: some pass fail
