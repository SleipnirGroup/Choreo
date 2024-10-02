# Low-level usage

Choreolib aims to support a wide range of use cases.
Many teams like to use their own path following structure and this was somewhat encouraged in 2023.
To not leave these teams behind, Choreolib provides a lower level API that allows you to directly load trajectories
and use them in your own path following code.

``` { .java .select }
import java.util.Optional;

import choreo.Choreo;
import choreo.trajectory.ChoreoTrajectory;
import choreo.trajectory.SwerveSample;

// Loading a trajectory from a file, returns an optional if the file does not exist or is invalid
Optional<ChoreoTrajectory<SwerveSample>> optTrajectory = Choreo.getTrajectory("myTrajectory");

if (optTrajectory.isPresent()) {
    // do something with the trajectory
    drive.followTrajectory(optTrajectory.get()).schedule();
} else {
    // if the trajectory is not found choreolib already prints to DriverStation
}
```
