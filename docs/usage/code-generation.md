# Code Generation(Java Only)
To enable or disable this feature, simply go to the "Code Generation" tab in the document settings.

!!! tip

    These generated files do not depend on ChoreoLib to work. They will be perfectly compatible with any java project.

## Variables

Choreo can automatically generate java files containing variables defined in the Choreo GUI. This allows information like pre-defined poses and robot characteristics to be shared between robot code and the GUI, while ensuring consistency. Values will use the java units library when possible.

## Trajectory Names

Choreo can also generate a file containing the names of all created trajectories. Each trajectory name is mapped to a static constant within the file. By referencing these static constants in place of strings, the java compiler can help you detect references to mispelled(or nonexistent) trajectories.

ChoreoLib Example:
```java
AutoRoutine routine = factory.newRoutine("Three Piece");
// instead of routine.trajectory("Station To Reef 4"), do:
AutoTrajectory traj = routine.trajectory(ChoreoTrajNames.StationToReef4); 
// By only referencing trajectory names from ChoreoTrajNames,
// you remove the risk of referencing mispelled or deleted trajectories.
```