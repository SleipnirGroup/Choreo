# Getting Started

## Installing ChoreoLib

To use ChoreoLib in your robot code, it must first be installed as a vendor library. For more information about installing vendor libraries, see [WPILib's documentation](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/3rd-party-libraries.html#installing-libraries) about installing in online mode.

Use the following JSON URL to install ChoreoLib:

=== "Release"

    ```
    https://lib.choreo.autos/dep/ChoreoLib.json
    ```

=== "2025 Beta"

    ```
    https://lib.choreo.autos/dep/ChoreoLib2025Beta.json
    ```

??? abstract "(Advanced) Building Manually"

    !!! warning
        This is not recommended for most users.

    Maven artifacts for ChoreoLib can be built using `./gradlew publish` or `./gradlew publishToMavenLocal` for local library access.

    The built library will be located in the respective operating system's m2 folder. By default, Maven local repository is defaulted to the `${user.home}/.m2/repository` folder:

    === "Windows"

        ```
        %HOMEPATH%\.m2\repository
        ```

    === "macOS/UNIX"

        ```
        ~/.m2/repository
        ```

    To use your build, update `vendordeps/ChoreoLib.json` to point to the local repository and version.

    !!! danger
        If you attempt to work with this project in VSCode with WPILib plugins, it will ask you if you want to import the project. Click no. This will change the project into a robot code project and break everything.

## Setting up the Drive Subsystem

Across all of ChoreoLib's APIs, your robot's drive subsystem is expected to be set up to handle trajectory following. Due to its complexity, the task of implementing how to follow a trajectory is left up to the user. This approach allows you to implement hooks for telemetry, vendor specific features such as [wheel force feedforwards](https://github.com/CrossTheRoadElec/Phoenix6-Examples/blob/main/java/SwerveWithChoreo/src/main/java/frc/robot/subsystems/CommandSwerveDrivetrain.java#L196-L215) with CTRE's swerve API, or additional feedback from external systems like vision-based game piece detection.

In general, trajectory followers accept trajectory "samples" that represent the state of a trajectory at a specific point in time. Below are some basic example implementations of trajectory followers.

!!! note
    Details for loading and running trajectories using a trajectory follower can be found later in the ChoreoLib documentation.

=== "Swerve"

    The `SwerveSample` ([Java](/api/choreolib/java/choreo/trajectory/SwerveSample.html), [C++](/api/choreolib/cpp/classchoreo_1_1SwerveSample.html)) class represents a single swerve drive sample along a trajectory. This example applies a given sample's velocity to the drivetrain, as well as additional feedback based on the robot's distance from the sample to "push" the robot back to the trajectory, if it is off-course.

    === "Java"

        ```java title="Drive.java"
        public class Drive extends SubsystemBase {
            private final PIDController xController = new PIDController(10.0, 0.0, 0.0);
            private final PIDController yController = new PIDController(10.0, 0.0, 0.0);
            private final PIDController headingController = new PIDController(7.5, 0.0, 0.0);

            public Drive() {
                // Other subsystem initialization code
                // ...

                headingController.enableContinuousInput(-Math.PI, Math.PI);
            }

            public void followTrajectory(SwerveSample sample) {
                // Get the current pose of the robot
                Pose2d pose = getPose();

                // Generate the next speeds for the robot
                ChassisSpeeds speeds = new ChassisSpeeds(
                    sample.vx + xController.calculate(pose.getX(), sample.x),
                    sample.vy + xController.calculate(pose.getX(), sample.y),
                    sample.omega + xController.calculate(pose.getRotation().getRadians(), sample.heading)
                );

                // Apply the generated speeds
                driveFieldRelative(speeds);
            }
        }
        ```

    === "C++"

        ```cpp
        // TODO
        ```

    === "Python"

        ```python
        # TODO
        ```

=== "Differential (Tank)"

    The `DifferentialSample` ([Java](/api/choreolib/java/choreo/trajectory/DifferentialSample.html), [C++](/api/choreolib/cpp/classchoreo_1_1DifferentialSample.html)) class represents a single differential drive sample along a trajectory. This example applies a given sample's velocity to the drivetrain, as well as additional feedback based on the robot's distance from the sample to "push" the robot back to the trajectory, if it is off-course.

    === "Java"

        ```java title="Drive.java"
        public class Drive extends SubsystemBase {
            private final LTVUnicycleController controller = new LTVUnicycleController(0.02);
            private final DifferentialDriveKinematics kinematics = new DifferentialDriveKinematics(0.7);

            public void followTrajectory(DifferentialSample sample) {
                // Get the current pose of the robot
                Pose2d pose = getPose();

                // Calculate the velocity feedforward specified by the sample
                ChassisSpeeds ff = kinematics.toChassisSpeeds(
                    new DifferentialDriveWheelSpeeds(sample.vl, sample.vr)
                );

                // Generate the next speeds for the robot
                ChassisSpeeds speeds = controller.calculate(
                    pose,
                    sample.getPose(),
                    ff.vxMetersPerSecond,
                    ff.omegaRadiansPerSecond
                );

                // Apply the generated speeds
                drive(speeds);

                // Or, if you don't drive via ChassisSpeeds
                DifferentialDriveWheelSpeeds wheelSpeeds = kinematics.toWheelSpeeds(speeds);
                drive(wheelSpeeds.leftMetersPerSecond, wheelSpeeds.rightMetersPerSecond);
            }
        }
        ```

    === "C++"

        ```cpp
        // TODO
        ```

    === "Python"

        ```python
        # TODO
        ```

## Next Steps

<div class="grid cards" markdown>

-   __[:octicons-arrow-right-24: Auto Factory (Java Only)](./auto-factory.md)__

    ---

    Load and follow trajectories utilizing triggers and command compositions to create advanced autonomous routines

-   __[:octicons-arrow-right-24: Trajectory API](./trajectory-api.md)__

    ---

    Load and follow trajectories generated by Choreo

</div>
