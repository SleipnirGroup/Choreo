# Getting Started

## Installing ChoreoLib

To use ChoreoLib in your robot code, it must first be installed as a vendor library. For more information about installing vendor libraries, see [WPILib's documentation](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/3rd-party-libraries.html#installing-libraries) about installing in online mode.

=== "Java/C++"

    Use the following JSON URL to install ChoreoLib:

    === "Release"

        ```
        https://lib.choreo.autos/dep/ChoreoLib2025.json
        ```

=== "Python"

    PyPI package: `sleipnirgroup-choreolib`

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
                    sample.vy + yController.calculate(pose.getY(), sample.y),
                    sample.omega + headingController.calculate(pose.getRotation().getRadians(), sample.heading)
                );

                // Apply the generated speeds
                driveFieldRelative(speeds);
            }
        }
        ```

    === "C++"

        === "Source"

            ```cpp title="Drive.cpp"
            Drive::Drive() {
                headingController.EnableContinuousInput(-M_PI, M_PI);
            };

            void Drive::FollowTrajectory(const choreo::SwerveSample& sample) {
                // Get the current pose of the robot
                frc::Pose2d pose = GetPose();

                // Calculate feedback velocities
                units::meters_per_second_t xFeedback{xController.Calculate(pose.X().value(), sample.x.value())};
                units::meters_per_second_t yFeedback{yController.Calculate(pose.Y().value(), sample.y.value())};
                units::radians_per_second_t headingFeedback{
                    headingController.Calculate(pose.Rotation().Radians().value(), sample.heading.value())
                };

                // Generate the next speeds for the robot
                frc::ChassisSpeeds speeds{
                    sample.vx + xFeedback,
                    sample.vy + yFeedback,
                    sample.omega + headingFeedback
                };

                // Apply the generated speeds
                DriveFieldRelative(speeds);
            };
            ```

        === "Header"

            ```cpp title="Drive.h"
            class Drive : public frc2::SubsystemBase {
                public:
                    void FollowTrajectory(const choreo::SwerveSample& sample);

                private:
                    frc::PIDController xController{10.0, 0.0, 0.0};
                    frc::PIDController yController{10.0, 0.0, 0.0};
                    frc::PIDController headingController{7.5, 0.0, 0.0};
            };
            ```

    === "Python"

        ```python title="drive.py"
        class Drive(Subsystem):
            def __init__(self):
                super().__init__()

                # Other subsystem initialization code
                # ...

                self.x_controller = PIDController(10.0, 0.0, 0.0)
                self.y_controller = PIDController(10.0, 0.0, 0.0)
                self.heading_controller = PIDController(7.5, 0.0, 0.0)

                self.heading_controller.enableContinuousInput(-math.pi, math.pi)

            def follow_trajectory(self, sample):
                # Get the current pose of the robot
                pose = self.get_pose()

                # Generate the next speeds for the robot
                speeds = ChassisSpeeds(
                    sample.vx + self.x_controller.calculate(pose.X(), sample.x),
                    sample.vy + self.y_controller.calculate(pose.Y(), sample.y),
                    sample.omega + self.heading_controller.calculate(pose.rotation().radians(), sample.heading)
                )

                # Apply the generated speeds
                self.drive_field_relative(speeds)
        ```

=== "Differential (Tank)"

    The `DifferentialSample` ([Java](/api/choreolib/java/choreo/trajectory/DifferentialSample.html), [C++](/api/choreolib/cpp/classchoreo_1_1DifferentialSample.html)) class represents a single differential drive sample along a trajectory. This example applies a given sample's velocity to the drivetrain, as well as additional feedback based on the robot's distance from the sample to "push" the robot back to the trajectory, if it is off-course.

    === "Java"

        ```java title="Drive.java"
        public class Drive extends SubsystemBase {
            private final LTVUnicycleController controller = new LTVUnicycleController(0.02);

            public void followTrajectory(DifferentialSample sample) {
                // Get the current pose of the robot
                Pose2d pose = getPose();

                // Get the velocity feedforward specified by the sample
                ChassisSpeeds ff = sample.getChassisSpeeds();

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
                DifferentialDriveWheelSpeeds wheelSpeeds = kinematics.toWheelSpeeds(speeds); // (1)
                drive(wheelSpeeds.leftMetersPerSecond, wheelSpeeds.rightMetersPerSecond);
            }
        }
        ```

        1. For more information about differential drive kinematics, see [WPILib's documentation](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/differential-drive-kinematics.html). In this example, we assume you have created an instance of `DifferentialDriveKinematics`, named `kinematics`.

    === "C++"

        === "Source"

            ```cpp title="Drive.cpp"
            void Drive::FollowTrajectory(const choreo::DifferentialSample& sample) {
                // Get the current pose of the robot
                frc::Pose2d pose = GetPose();

                // Get the velocity feedforward specified by the sample
                frc::ChassisSpeeds ff = sample.GetChassisSpeeds();

                // Generate the next speeds for the robot
                frc::ChassisSpeeds speeds = controller.Calculate(
                    pose,
                    sample.GetPose(),
                    ff.vx,
                    ff.vy
                );

                // Apply the generated speeds
                Drive(speeds);

                // Or, if you don't drive via ChassisSpeeds
                frc::DifferentialDriveWheelSpeeds wheelSpeeds = kinematics.ToWheelSpeeds(speeds); // (1)
                Drive(wheelSpeeds.left, wheelSpeeds.right);
            };
            ```

            1. For more information about differential drive kinematics, see [WPILib's documentation](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/differential-drive-kinematics.html). In this example, we assume you have created an instance of `DifferentialDriveKinematics`, named `kinematics`.

        === "Header"

            ```cpp title="Drive.h"
            class Drive : public frc2::SubsystemBase {
                public:
                    void FollowTrajectory(const choreo::DifferentialSample& sample);

                private:
                    frc::LTVUnicycleController controller{0.02_s};
            };
            ```

    === "Python"

        ```python title="drive.py"
        class Drive(Subsystem):
            def __init__(self):
                super().__init__()

                # Other subsystem initialization code
                # ...

                self.controller = LTVUnicycleController(0.02)

            def follow_trajectory(self, sample):
                # Get the current pose of the robot
                pose = self.get_pose()

                # Get the velocity feedforward specified by the sample
                ff = sample.get_chassis_speeds()

                # Generate the next speeds for the robot
                speeds = self.controller.calculate(
                    pose,
                    sample.get_pose(),
                    ff.vx,
                    ff.omega
                )

                # Apply the generated speeds
                self.drive(speeds)

                # Or, if you don't drive via ChassisSpeeds
                wheelSpeeds = self.kinematics.toWheelSpeeds(speeds) # (1)
                self.drive(wheelSpeeds.left, wheelSpeeds.right)
        ```

        1. For more information about differential drive kinematics, see [WPILib's documentation](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/differential-drive-kinematics.html). In this example, we assume you have created an instance of `DifferentialDriveKinematics`, named `kinematics`.

## Choreo-Specific Alerts
Choreo primarily uses the WPILib Alerts API to provide users with internal warnings, errors or information. These alerts can be found under the SmartDashboard/ChoreoAlert section within networktables.

To visualize these alerts in a dashboard such as AdvantageScope simply drag the ChoreoAlert group outwards onto the "discrete fields" section in advantagescope or the main dashboard panel.

## Next Steps

<div class="grid cards" markdown>

-   __[:octicons-arrow-right-24: Auto Factory (Java Only)](./auto-factory.md)__

    ---

    Load and follow trajectories utilizing triggers and command compositions to create advanced autonomous routines

-   __[:octicons-arrow-right-24: Trajectory API](./trajectory-api.md)__

    ---

    Load and follow trajectories generated by Choreo

</div>
