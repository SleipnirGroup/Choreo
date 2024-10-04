# Basic Usage

Teams that want to use their own path following structure can load trajectories directly with the following code.

``` { .java .select }
import java.util.Optional;

import choreo.Choreo;
import choreo.trajectory.ChoreoTrajectory;
import choreo.trajectory.SwerveSample;

// Loading a trajectory from a file, returns an optional if the file does not exist or is invalid
var trajectory = Choreo.loadTrajectory("myTrajectory");
if (trajectory.isPresent()) {
    // Do something with the trajectory
    drive.followTrajectory(trajectory.get()).schedule();
} else {
    // If the trajectory is not found, ChoreoLib already prints to DriverStation
}
```
``` { .py .select }
import choreo

# Loading a trajectory from a file, throwing ValueError if the file does not exist or is invalid
try:
    trajectory = choreo.load_swerve_trajectory("myTrajectory")

    # Do something with the trajectory
    drive.followTrajectory(trajectory).schedule()
except ValueError:
    # If the trajectory is not found, ChoreoLib already prints to DriverStation
    pass
```
``` { .cpp .select }
#include <choreo/Choreo.h>

// Loading a trajectory from a file, returns an optional if the file does not exist or is invalid
if (auto trajectory = choreo::LoadTrajectory("myTrajectory")) {
    // Do something with the trajectory
    drive.followTrajectory(trajectory.value()).schedule();
} else {
    // If the trajectory is not found, ChoreoLib already prints to DriverStation
}
```
