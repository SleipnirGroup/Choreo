# Samples

ChoreoLib supports swerve and differential drive systems. The only usage difference between using swerve and differential is the type of the sample used.

## Swerve Drive

### Importing

```java
import choreo.trajectory.SwerveSample;
```
```python
from choreo.trajectory import SwerveSample
```
```cpp
#include <choreo/trajectory/SwerveSample.h>
```

### Fields

- `double timestamp` - The timestamp of this sample, relative to the beginning of the trajectory.
- `double x` - x position in meters relative to blue alliance wall origin
- `double y` - y position in meters relative to blue alliance wall origin
- `double heading` - heading in radians
- `double vx` - velocity in x direction in m/s
- `double vy` - velocity in y direction in m/s
- `double omega` - angular velocity
- `double ax` - acceleration in x direction
- `double ay` - acceleration in y direction
- `double alpha` - angular acceleration
- `double[] moduleForcesX` - force on each swerve module in the x direction
- `double[] moduleForcesY` - force on each swerve module in the y direction


## Differential Drive

### Importing

```java
import choreo.trajectory.DifferentialSample;
```
```python
from choreo.trajectory import DifferentialSample
```
```cpp
#include <choreo/trajectory/DifferentialSample.h>
```

### Fields

- `double timestamp` - The timestamp of this sample, relative to the beginning of the trajectory.
- `double x` - x position in meters relative to blue alliance wall origin
- `double y` - y position in meters relative to blue alliance wall origin
- `double heading` - heading in radians
- `double vl` - velocity of the left side in m/s
- `double vr` - velocity of the right side in m/s
- `double al` - acceleration of the left side in m/s^2
- `double ar` - acceleration of the right side in m/s^2
- `double fl` - force of the left side in Newtons
- `double fr` - force of the right side in Newtons
