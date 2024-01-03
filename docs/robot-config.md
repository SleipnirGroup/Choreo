## Start by downloading Choreo from **[Releases](https://github.com/SleipnirGroup/Choreo/releases)**

## Robot Config

The trajectory optimizer depends upon the following user-specified parameters, which are entered in the Robot Configuration panel. This helps the optimizer understand the robot's projected path very accurately.

- **Mass** [kg]: The mass of the robot with battery and bumpers
- **MoI** [kg * m<sup>2</sup>]: The resistance to change in rotational velocity in response to a torque applied to the robot about the vertical axis
- **Max Velocity** [m/s]: The maximum tangential speed of the wheel
  - Note: A reasonable choice of Max Velocity is that corresponding to ~80% of free speed experienced at the drive motor(s)
- **Max Torque** [N * m]: The maximum torque applied at the wheel
  - Note: A reasonable choice of Max Torque is that corresponding to a current draw of approximately `1.5 * BreakerValue` experienced at the drive motor(s)
- **Wheelbase and Trackwidth** [m]: The largest distances between the robot's wheel centers
- **Length and Width** [m]: The overall size of the robot's _bumper_.

### Measuring Moment of Inertia (MoI)

The robot's rotational inertia has a significant impact on how quickly it can follow complex paths. For the best results, it is recommended to get as accurate an estimate of this parameter as possible. This can be accomplished via:

- Faithful CAD loaded with mass properties
- Physical experimentation
- Other System Identification methods

If none of these techniques are possible, a reasonable estimate of MoI would be mass _ length _ width / 6 based on the assumption of a rectangle of uniformly-distributed mass.

### Recommendations

> Of course, more precision is always better. But after 2 decimals, you will most likely get diminishing returns.

> Saving this file somewhere safe, like the root of a robot project, is highly recommended. This is so you can correlate that robot project to your robot's specifications, and thus your paths.
