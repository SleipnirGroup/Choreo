# Code Generation (Java Only)
To enable or disable this feature, simply go to the "Code Generation" tab in the document settings and select a folder within your Java robot project's `src/main` directory where the files should be output.

!!! tip

    These generated Java files do not depend on ChoreoLib to work. They will be perfectly compatible with any Java project.


> **NOTE**
To make this code generation possible, Choreo requires that trajectory names are valid variable names (identifiers) in C++, Python, and Java. **Trajectory names can only contain letters (a-z, A-Z), numbers (0-9), and the underscore character (_). They cannot begin with a number.**
> Choreo's code generation will intentionally output errored code if this rule is broken, and the code will have a comment explaining the rule. The Choreo app will indicate any trajectories that need to be renamed.


## Variables

Choreo can output a Java file containing variables defined in the Choreo GUI. This allows information such as predefined poses and robot characteristics to be shared between the robot code and the GUI, while ensuring consistency. Values will use the Java units library when possible.

## Trajectory Names

Choreo can also output a Java file listing the name, total time, and blue-alliance start and end poses of each trajectory. Each trajectory is represented as a static constant of the ChoreoTraj.java file. This removes the risk of referencing trajectories that don't exist or aren't generated yet.


The file is rewritten when the project is loaded, and when paths are generated, renamed, or deleted.
## ChoreoLib Example:
```java
import static frc.robot.wherever.ChoreoTraj.*;
import frc.robot.wherever.ChoreoVars;

AutoRoutine routine = factory.newRoutine("Three Piece");
// instead of routine.trajectory("Station To Reef 4"), do:
AutoTrajectory traj = routine.trajectory(StationToReef4.name());
Pose2d station = StationToReef4.initialPoseBlue();
Pose2d poseVariable = ChoreoVars.Poses.myPoseVariable;
Pose2d reef4 = StationToReef4.endPoseBlue();
double stationToReef4Time = StationToReef4.totalTimeSecs();
Distance lengthVariable = ChoreoVars.myLengthVariable;
// Furthermore, if you decide to compute trajectory names during runtime,
// You can fetch their metadata like so:
String computedTrajName = "StationToReef5";
Pose2d startPose = ALL_TRAJECTORIES.get(computedTrajName).initialPoseBlue();
double trajTime = ALL_TRAJECTORIES.get(computedTrajName).totalTimeSecs();
```
