# v3->v4
## General
* field names are all mixedCase
* Persistent UUIDs added throughout to give document objects consistent identity across frontend and backend:
   * project file root
   * trajectory file root
   * Variables are now keyed by UUID to make renames less of a mess and make sorting within the serialization more consistent (yet less related to variable names)
   * Waypoints, constraints, event markers are now given UUIDs.
   * Constraints and event markers refer to waypoints by `"first" | "last" | {"uuid":"waypointUUID"}`
* Removed the concept that a "snapshot" of trajectory parameters and/or robot config is a variant of the structure, but with doubles instead of `{exp, val}` expressions. There is still snapshotting functionality but it uses the full structure for simplicity. This also better enables reverting to the last successful generation.

## Shared
* `Expr`:
The `val` is the value of the expression string in a base SI unit which is usage-dependent.
```json
{
    "exp": "2 m",
    "val": 2.0
}
```
* `Translation2e`:
```json
{
    "x": { "exp": "2 m", "val": 2.0 },
    "y": { "exp": "1 m", "val": 1.0 }
}
```
* `Rotation2e`:
```json
{
    "radians": { "exp": "90 deg", "val": 1.5707963267948966 }
}
```
* `Pose2e`:
```json
{
    "translation": {
        "x": { "exp": "2 m", "val": 2.0 },
        "y": { "exp": "1 m", "val": 1.0 }
    },
    "rotation": {
        "radians": { "exp": "90 deg", "val": 1.5707963267948966 }
    }
}
```
* `Region2e`:
Based on WPILib's Rectangle2d structure, but called Region2e because it's also used to specify the ellipse that's defined by the same center and width/height.
```json
{
    "center": {
        "translation": {
            "x": { "exp": "2 m", "val": 2.0 },
            "y": { "exp": "1 m", "val": 1.0 }
        },
        "rotation": {
            "radians": { "exp": "45 deg", "val": 0.7853981633974483 }
        }
    },
    "xWidth": { "exp": "3 m", "val": 3.0 },
    "yWidth": { "exp": "2 m", "val": 2.0 }
}
```
* `Polygon2e`:
A polygon defined by a list of vertices, each Translation2e.
```json
{
    "vertices": [
        { "x": { "exp": "0 m", "val": 0.0 }, "y": { "exp": "0 m", "val": 0.0 } },
        { "x": { "exp": "1 m", "val": 1.0 }, "y": { "exp": "0 m", "val": 0.0 } },
        { "x": { "exp": "1 m", "val": 1.0 }, "y": { "exp": "1 m", "val": 1.0 } }
    ]
}
```

## Trajectory
Structure
```json
{
    "uuid": string,
    "name": "filename", //without .traj
    "version": 4,
    "config": null,// copy of the robot config from last generation. null if never generated.
    "snapshot": null,//copy of parameters from last generation. null if never generated.
    "params": {}, //current parameters
    "output": null, //required; null until the trajectory has been generated
    "events": []
}
```
  When non-null, `output` has this structure. The only way to change it is via regeneration:
  ```json
  {
    "sampleType": "Swerve" | "Differential",
    "waypoints": [0.0, timeOfIntermediateWaypoints..., timeOfFinalWaypoint],
    "splits": [0, indexOfNextSplitStartWaypoint],
    "trajectory": HolonomicTrajectory | DifferentialTrajectory
  }
  ```
Note:
1. Trajectory total time should be accessed via the last element of `output.waypoints`.
2. Number of segments is `length(output.splits)`



* Samples are now using the official WPILib serialization of HolonomicSample and DifferentialSample (and their `Trajectory`), such as
```json
{"samples":[
{
  "time": 1.0,
  "pose": {
    "translation": { "x": 2.0, "y": 3.0 },
    "rotation": { "radians": 0.5 }
  },
  "velocity": { "vx": 1.0, "vy": 0.0, "omega": 0.1 },
  "acceleration": { "ax": 0.0, "ay": 0.0, "alpha": 0.0 }
}
]}

```

* Sample forces are removed, to be calculated dynamically if needed.
* Differential samples additionally contain `leftVelocity` and `rightVelocity`.

### Event Markers
Structure:
```json
{
  "uuid": "...",
  "name": "Score",
  "from": {
    "target": {
      "uuid": "<waypoint UUID>"
    },
    "targetTime": 2.35, // must be present, value is null if not generated since waypoint was added.
    "offset": {
      "exp": "0.1 s",
      "val": 0.1
    }
  }
}
```
* `target` is required and identifies a waypoint with `"first"`, `"last"`, or
  `{ "uuid": "waypointUUID" }`.
* PathPlanner command tree payloads are removed.

### Constraints
Within `data`, constraint properties are now serialized adjacent to the `type` tag. Instead of:
```json
{
  "type": "MaxLinearVelocity",
  "props": { "max": { "exp": "2 m/s", "val": 2 } }
}
```
it's
```json
{
  "type": "MaxLinearVelocity",
  "max": { "exp": "2 m/s", "val": 2 }
}
```
A full Constraint is therefore serialized as:
```json
{
  "uuid": "constraintUUID",
  "from": "first",
  "to": "last", // optional, though some constraints need it because they only apply to segments
  "data": {
    "type": "MaxLinearVelocity",
    "max": { "exp": "2 m/s", "val": 2 }
  },
  "enabled": true
}
```
The v4 constraint variants are `MaxLinearVelocity`, `MaxAngularVelocity`, `KeepInCircle`,
and `Heading`, with more to be added as part of v4 before it is finalized.

### Waypoints
Waypoints are unchanged apart from the required persistent `uuid`.


## Project

### Robot Config
Completely reworked to support more robot variety. Example:
```json
{
  "mass": {
    "exp": "125 lbs",
    "val": 56.69904625
  },
  "inertia": {
    "exp": "5 kg m^2",
    "val": 5.0
  },
  "gearing": {
    "exp": "6.75",
    "val": 6.75
  },
  "radius": {
    "exp": "2 in",
    "val": 0.0508
  },
  "cof": {
    "exp": "1.2",
    "val": 1.2
  },
  "differentialTrackwidth": {
    "exp": "22 in",
    "val": 0.5588
  },
  "wheels": [ // exactly 4 elements offset from robot center of rotation, users encouraged to match the order in their Kinematics, but it doesn't actually matter
    {
      "x": { "exp": "11 in", "val": 0.2794 },
      "y": { "exp": "11 in", "val": 0.2794 }
    },
    {
      "x": { "exp": "-11 in", "val": -0.2794 },
      "y": { "exp": "11 in", "val": 0.2794 }
    },
    {
      "x": { "exp": "-11 in", "val": -0.2794 },
      "y": { "exp": "-11 in", "val": -0.2794 }
    },
    {
      "x": { "exp": "11 in", "val": 0.2794 },
      "y": { "exp": "-11 in", "val": -0.2794 }
    }
  ],
  "bumpers": [
    {
      "x": { "exp": "16 in", "val": 0.4064 },
      "y": { "exp": "11 in", "val": 0.2794 }
    },
    {
      "x": { "exp": "-16 in", "val": -0.4064 },
      "y": { "exp": "11 in", "val": 0.2794 }
    },
    {
      "x": { "exp": "-16 in", "val": -0.4064 },
      "y": { "exp": "-11 in", "val": -0.2794 }
    },
    {
      "x": { "exp": "16 in", "val": 0.4064 },
      "y": { "exp": "-11 in", "val": -0.2794 }
    }
  ],
  "motor": {
    "freeSpeed": {
      "exp": "6000 RPM",
      "val": 628.3185307
    },
    "stallTorque": {
      "exp": "1.2 N*m",
      "val": 1.2
    },
    "kT": {
      "exp": "0.018 N*m/A",
      "val": 0.018
    },
    "kV": {
      "exp": "0.02 V*s/rad",
      "val": 0.02
    },
    "supplyLimit": {
      "exp": "40 A",
      "val": 40.0
    },
    "statorLimit": {
      "exp": "80 A",
      "val": 80.0
    }
  }
}
```

### Variables
There are dimensioned scalar "expression" variables and multiple types of geometric variables:
Structure of an individual expression variable:
```json
{
    "name": "MyVariable",
    "dimension": "LinAcc",
    "value": {
      "exp": "4 m/s^2",
      "val": 4.0
    }
  }
```

Structure of an individual geometry variable:
```json
{
    "name": "StartingLocation",
    "value": Translation2e | Pose2e | Region2e | Polygon2e
}
```

The Variables type has five UUID-keyed dictionaries for different types of variables, where each key is the UUID of the variable and the value is the variable object.

Example of the Variables type:
```json
{
  "expressions": {
    "a-variable-uuid1": {
      "name": "MyVariable",
      "dimension": "LinAcc",
      "value": {
        "exp": "4 m/s^2",
        "val": 4.0
      }
    }
  },
  "translations": {
    "a-variable-uuid2": {
      "name": "StartingLocation",
      "value": Translation2e
    }
  },
  "poses": {},
  "regions": {},
  "polygons": {}
}
```

Names need to be unique across all variable types.

### Dimensions
The list of possible dimensions and their base SI units includes:
* Number: dimensionless scalar
* Length: meters (m)
* LinVel: meters per second (m/s)
* LinAcc: meters per second squared (m/s^2)
* Angle: radians (rad)
* AngVel: radians per second (rad/s)
* AngAcc: radians per second squared (rad/s^2)
* Time: seconds (s)
* Mass: kilograms (kg)
* Torque: newton meters (N*m)
* MoI: kilogram square meters (kg*m^2)
* Current: amperes (A)
* KT: newton meters per ampere (N*m/A)
* KV: volts seconds per radian (V*s/rad)

### Codegen
The code generation schema has not changed since v3. The fields are `root`,
`genVars`, `genTrajData`, and `useChoreoLib`.

### Generation Features
The unused list of `generationFeatures` is removed.

## Progress Messages
The v4 document schemas also define versioned JSON progress messages:

* `incompleteTrajectory`: a base64-encoded WPILib struct-array sample update,
  with drive type, sample count, struct type, and struct size.
* `diagnostic`: diagnostic text in `payload.text`.
* `error`: an error message in `payload.message`.
* `completeTrajectory`: the generated trajectory file JSON string in
  `payload.trajectoryFile`.

All progress messages have `version: 1` and an `event` discriminator.
