import os

import choreo


def test_basic_parse():
    trajectory = choreo.load_swerve_trajectory(
        os.path.join(os.path.dirname(__file__), "resources", "swerve_test")
    )

    for i in range(0, 500):
        trajectory.sample_at(i * 0.01)

def test_event_markers():
    trajectory = choreo.load_swerve_trajectory(
        os.path.join(os.path.dirname(__file__), "resources", "swerve_test")
    )

    for event in trajectory.events:
        print(event.timestamp, event.event)
