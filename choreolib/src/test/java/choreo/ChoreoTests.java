// Copyright (c) Choreo contributors

package choreo;

import static org.junit.jupiter.api.Assertions.assertEquals;

import choreo.trajectory.EventMarker;
import choreo.trajectory.ProjectFile;
import choreo.trajectory.SwerveSample;
import choreo.trajectory.Trajectory;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.util.List;
import org.junit.jupiter.api.Test;

public class ChoreoTests {
  public static final String TRAJECTORY =
      """
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
  "splits":[],
  "forcesAvailable":false
 },
 "events":[
  {"name":"testEvent", "from":{ "target":0, "targetTimestamp":0, "offset":{"exp":"0 s", "val":0.0}}, "event":null}
 ]
}
""";

  public static final String PROJ =
      "{"
          + " \"name\": \"idk\","
          + " \"version\": \"v2025.0.0\","
          + " \"type\": \"Swerve\","
          + " \"variables\": {"
          + "   \"expressions\": {},"
          + "   \"poses\": {}"
          + " },"
          + " \"config\": {"
          + "   frontLeft: {"
          + "     \"x\": {"
          + "       \"exp\": \"11 in\","
          + "       \"val\": \"0.2794\""
          + "     },"
          + "     \"y\": {"
          + "       \"exp\": \"11 in\","
          + "       \"val\": \"0.2794\""
          + "     }"
          + "   },"
          + "   backLeft: {"
          + "     \"x\": {"
          + "       \"exp\": \"-11 in\","
          + "       \"val\": \"-0.2794\""
          + "     },"
          + "     \"y\": {"
          + "       \"exp\": \"11 in\","
          + "       \"val\": \"0.2794\""
          + "     }"
          + "   },"
          + "   \"mass\": {"
          + "     \"exp\": \"150 lbs\","
          + "     \"val\": 68.0388555"
          + "   },"
          + "   \"inertia\": {"
          + "     \"exp\": \"6 kg m ^ 2\","
          + "     \"val\": 6.0"
          + "   },"
          + "   \"gearing\": {"
          + "     \"exp\": \"6.5\","
          + "     \"val\": 6.5"
          + "   },"
          + "   \"radius\": {"
          + "     \"exp\": \"2 in\","
          + "     \"val\": 0.0508"
          + "   },"
          + "   \"vmax\": {"
          + "     \"exp\": \"6000 RPM\","
          + "     \"val\": 628.318530717"
          + "   },"
          + "   \"tmax\": {"
          + "     \"exp\": \"1.2 N * m\","
          + "     \"val\": 1.2"
          + "   },"
          + "   \"bumper\": {"
          + "     \"front\": {"
          + "       \"exp\": \"16 in\","
          + "       \"val\": 0.4064"
          + "     },"
          + "     \"side\": {"
          + "       \"exp\": \"16 in\","
          + "       \"val\": 0.4064"
          + "     },"
          + "     \"back\": {"
          + "       \"exp\": \"16 in\","
          + "       \"val\": 0.4064"
          + "     }"
          + "   },"
          + "   \"differentialTrackWidth\": {"
          + "     \"exp\": \"24 in\","
          + "     \"val\": 0.6096"
          + "   }"
          + " },"
          + " \"generationFeatures\": []"
          + "}";

  private static final Gson GSON =
      new GsonBuilder()
          .registerTypeAdapter(EventMarker.class, new EventMarker.Deserializer())
          .create();

  private Trajectory<SwerveSample> CORRECT_SWERVE_TRAJECTORY =
      new Trajectory<SwerveSample>(
          "New Path",
          List.of(
              new SwerveSample(
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
                  new double[] {0.0, 0.0, 0.0, 0.0},
                  new double[] {0.0, 0.0, 0.0, 0.0}),
              new SwerveSample(
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
                  new double[] {100.0, 200.0, 300.0, 400.0},
                  new double[] {-100.0, -200.0, -300.0, -400.0})),
          List.of(),
          List.of(new EventMarker(0.0, "testEvent")));

  @Test
  public void testDeserializeSwerveTrajectory() {
    ProjectFile projectFile = GSON.fromJson(PROJ, ProjectFile.class);
    var deserializedSwerveTrajectory = Choreo.loadTrajectoryString(TRAJECTORY, projectFile);
    assertEquals(CORRECT_SWERVE_TRAJECTORY, deserializedSwerveTrajectory);
  }
}
