import os

import choreo

TRAJECTORY = """
{
 "name":"New Path",
 "version":"v2025.0.0",
 "snapshot":{
  "waypoints":[
    {"x":0.0, "y":0.0, "heading":0.0, "intervals":9, "split":false, "fixTranslation":true, "fixHeading":true, "overrideIntervals":false},
    {"x":1.0, "y":0.0, "heading":0.0, "intervals":9, "split":false, "fixTranslation":false, "fixHeading":false, "overrideIntervals":false},
    {"x":2.0, "y":0.0, "heading":0.0, "intervals":9, "split":false, "fixTranslation":false, "fixHeading":false, "overrideIntervals":false},
    {"x":3.0, "y":0.0, "heading":0.0, "intervals":40, "split":false, "fixTranslation":true, "fixHeading":true, "overrideIntervals":false}],
  "constraints":[
    {"from":"first", "to":null, "data":{"type":"StopPoint", "props":{}}},
    {"from":"last", "to":null, "data":{"type":"StopPoint", "props":{}}},
    {"from":1, "to":2, "data":{"type":"PointAt", "props":{"x":1.5, "y":4.0, "tolerance":0.017453292519943295, "flip":false}}}]
 },
 "params":{
  "waypoints":[
    {"x":["0 m",0.0], "y":["0 m",0.0], "heading":["0 deg",0.0], "intervals":9, "split":false, "fixTranslation":true, "fixHeading":true, "overrideIntervals":false},
    {"x":["1 m",1.0], "y":["0 m",0.0], "heading":["0 deg",0.0], "intervals":9, "split":false, "fixTranslation":false, "fixHeading":false, "overrideIntervals":false},
    {"x":["2 m",2.0], "y":["0 m",0.0], "heading":["0 deg",0.0], "intervals":9, "split":false, "fixTranslation":false, "fixHeading":false, "overrideIntervals":false},
    {"x":["3 m",3.0], "y":["0 m",0.0], "heading":["0 rad",0.0], "intervals":40, "split":false, "fixTranslation":true, "fixHeading":true, "overrideIntervals":false}],
  "constraints":[
    {"from":"first", "to":null, "data":{"type":"StopPoint", "props":{}}},
    {"from":"last", "to":null, "data":{"type":"StopPoint", "props":{}}},
    {"from":1, "to":2, "data":{"type":"PointAt", "props":{"x":["1.5 m",1.5], "y":["4 m",4.0], "tolerance":["1 deg",0.017453292519943295], "flip":false}}}]
 },
 "trajectory":{
  "waypoints":[0.0,0.1,0.2,0.3],
  "samples":[
    {"t":0.0, "x":0.0, "y":0.0, "heading":0.0, "vx":0.0, "vy":0.0, "omega":0.0, "ax":0.0, "ay":0.0, "alpha":0.0, "fx":[0.0,0.0,0.0,0.0], "fy":[0.0,0.0,0.0,0.0]},
    {"t":1.0, "x":0.5, "y":0.1, "heading":0.2, "vx":3.0, "vy":3.0, "omega":10.0, "ax":20.0, "ay":20.0, "alpha":30.0, "fx":[100.0,200.0,300.0,400.0], "fy":[-100.0,-200.0,-300.0,-400.0]}
  ],
  "splits":[0],
  "forcesAvailable":false
 },
 "events":[
  {"name":"testEvent", "from":{"target":0, "targetTimestamp":0, "offset":{"exp":"0 s", "val":0.0}}, "event":null}
 ]
}
"""

CORRECT_SWERVE_TRAJECTORY = choreo.SwerveTrajectory(
    "New Path",
    [
        choreo.SwerveSample(
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            [0.0, 0.0, 0.0, 0.0],
            [0.0, 0.0, 0.0, 0.0],
        ),
        choreo.SwerveSample(
            1.0,
            0.5,
            0.1,
            0.2,
            3.0,
            3.0,
            10.0,
            20.0,
            20.0,
            30.0,
            [100.0, 200.0, 300.0, 400.0],
            [-100.0, -200.0, -300.0, -400.0],
        ),
    ],
    [0],
    [choreo.EventMarker(0.0, "testEvent")],
)


def test_basic_parse():
    trajectory = choreo.load_swerve_trajectory(
        os.path.join(os.path.dirname(__file__), "resources", "swerve_test")
    )

    for i in range(0, 500):
        trajectory.sample_at(i * 0.01)


def test_deserialize_swerve_trajectory():
    trajectory = choreo.load_swerve_trajectory_string(TRAJECTORY)
    assert trajectory == CORRECT_SWERVE_TRAJECTORY


def test_event_markers():
    trajectory = choreo.load_swerve_trajectory(
        os.path.join(os.path.dirname(__file__), "resources", "swerve_test")
    )

    for event in trajectory.events:
        print(event.timestamp, event.event)
