# Code Generation (Java Only)
To enable or disable this feature, simply go to the "Code Generation" tab in the document settings and select a folder within your Java robot project's `src/main` directory where the files should be output.

!!! tip

    These generated Java files do not depend on ChoreoLib to work. They will be perfectly compatible with any Java project.

## Variables

Choreo can output a Java file containing variables defined in the Choreo GUI. This allows information such as predefined poses and robot characteristics to be shared between the robot code and the GUI, while ensuring consistency. Values will use the Java units library when possible.

## Trajectory Names

Choreo can also output a Java enum listing the name, total time, and blue-alliance start and end poses of each trajectory. This removes the risk of referencing trajectories that don't exist or aren't generated yet.

> **Name Changes**
> Some valid trajectory names aren't valid Java identifiers. Commonly, trajectory names have spaces and/or start with numbers. The enum fields will strip out spaces (i.e. `REEF POSES.traj` is the field `REEFPOSES`). If the name starts with a number or other invalid character, an underscore `_` will be added at the beginning.

The enum is rewritten when the project is loaded, and when paths are generated, renamed, or deleted.
## ChoreoLib Example:
```java
import static frc.robot.wherever.ChoreoTrajectories.*;
import frc.robot.wherever.ChoreoVars;
AutoRoutine routine = factory.newRoutine("Three Piece");
// instead of routine.trajectory("Station To Reef 4"), do:
AutoTrajectory traj = routine.trajectory(StationToReef4.filename);
Pose2d station = StationToReef4.initialPoseBlue;
Pose2d poseVariable = ChoreoVars.Poses.myPoseVariable;
Pose2d reef4 = StationToReef4.endPoseBlue;
double stationToReef4Time = StationToReef4.totalTimeSeconds;
Distance lengthVariable = ChoreoVars.myLengthVariable;
```
