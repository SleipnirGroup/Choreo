# Trajectory API

!!! tip
    Java users are recommended to use an [Auto Factory](./auto-factory.md) instead of the Trajectory API for loading and following trajectories, as it provides a more user-friendly experience for developing complex autonomous routines.

To begin utilizing trajectories created by Choreo, you must first load a `Trajectory` ([Java](/api/choreolib/java/choreo/trajectory/Trajectory.html), [C++](/api/choreolib/cpp/classchoreo_1_1Trajectory.html)) from its corresponding file.

=== "Java"

    ```java
    // Loads from deploy/choreo/myTrajectory.traj
    // Optional.empty() is returned if the file does not exist or is invalid
    var trajectory = Choreo.loadTrajectory("myTrajectory");
    ```

=== "C++"

    ```cpp
    // Loads from deploy/choreo/myTrajectory.traj
    // std::nullopt is returned if the file does not exist or is invalid
    auto trajectory = choreo::Choreo::LoadTrajectory<choreo::SwerveSample>("myTrajectory"); // (1)
    ```

    1. Use `DifferentialSample` instead of `SwerveSample` if the robot uses a differential (tank) drive

=== "Python"

    ```py
    # Loads from deploy/choreo/myTrajectory.traj
    # ValueError is thrown if the file does not exist or is invalid
    try:
      trajectory = choreo.load_swerve_trajectory("myTrajectory") # (1)
    except ValueError:
      # If the trajectory is not found, ChoreoLib already prints to DriverStation
      pass
    ```

    1. Use `load_differential_trajectory` instead of `load_swerve_trajectory` if the robot uses a differential (tank) drive

!!! warning
    Trajectories should always be loaded at startup, not when the autonomous period begins. Loading trajectories is a blocking operation, and larger trajectories may take multiple seconds to load on a RoboRIO, cutting into the time a robot has to run its autonomous routine in a match.

Trajectories can be sampled at arbitrary timestamps using `sampleAt()`, which will return an interpolated sample that can be consumed by the user for trajectory following. Additionally, `getInitialPose()` and `getFinalPose()` can be used to retrieve a `Pose2d` representing the starting and ending point of the trajectory, respectively.

See [Getting Started](./getting-started.md/#setting-up-the-drive-subsystem) for more details on how to implement a trajectory follower in your drive subsystem.

=== "Java"

    ```java title="Robot.java"
    public class Robot extends TimedRobot {
        // Loads a swerve trajectory, alternatively use DifferentialSample if the robot is tank drive
        private final Optional<Trajectory<SwerveSample>> trajectory = Choreo.loadTrajectory("myTrajectory");

        private final Drive driveSubsystem = new Drive();
        private final Timer timer = new Timer();

        @Override
        public void autonomousInit() {
            if (trajectory.isPresent()) {
                // Get the initial pose of the trajectory
                Optional<Pose2d> initialPose = trajectory.get().getInitialPose(isRedAlliance());

                if (initialPose.isPresent()) {
                    // Reset odometry to the start of the trajectory
                    driveSubsystem.resetOdometry(initialPose.get());
                }
            }

            // Reset and start the timer when the autonomous period begins
            timer.restart();
        }

        @Override
        public void autonomousPeriodic() {
            if (trajectory.isPresent()) {
                // Sample the trajectory at the current time into the autonomous period
                Optional<SwerveSample> sample = trajectory.get().sampleAt(timer.get(), isRedAlliance());

                if (sample.isPresent()) {
                    driveSubsystem.followTrajectory(sample);
                }
            }
        }

        private boolean isRedAlliance() {
            return DriverStation.getAlliance().orElse(Alliance.Blue).equals(Alliance.Red);
        }
    }
    ```

=== "C++"

    === "Source"

        ```cpp title="Robot.cpp"
        void Robot::AutonomousInit() {
            if (trajectory.has_value()) {
                // Get the initial pose of the trajectory
                if (auto initialPose = trajectory.value().GetInitialPose(IsRedAlliance())) {
                    // Reset odometry to the start of the trajectory
                    driveSubsystem.ResetOdometry(initialPose.value());
                }
            }

            // Reset and start the timer when the autonomous period begins
            timer.Restart();
        }

        void Robot::AutonomousPeriodic() {
            if (trajectory.has_value()) {
                // Sample the trajectory at the current time into the autonomous period
                if (auto sample = trajectory.value().SampleAt(timer.Get(), IsRedAlliance())) {
                    driveSubsystem.FollowTrajectory(sample.value());
                }
            }
        }

        bool Robot::IsRedAlliance() {
            auto alliance = frc::DriverStation::GetAlliance().value_or(frc::DriverStation::kBlue);
            return alliance == frc::DriverStation::kRed;
        }
        ```

    === "Header"

        ```cpp title="Robot.h"
        class Robot : public frc::TimedRobot {
            public:
                void AutonomousInit() override;
                void AutonomousPeriodic() override;

            private:
                // Loads a swerve trajectory, alternatively use DifferentialSample if the robot is tank drive
                std::optional<choreo::Trajectory<choreo::SwerveSample>> trajectory =
                    choreo::Choreo::LoadTrajectory<choreo::SwerveSample>("myTrajectory");

                Drive drive;
                frc::Timer timer;
        };
        ```

=== "Python"

    ```py
    class MyRobot(wpilib.TimedRobot):
        def robotInit(self):
            # Loads a swerve trajectory, alternatively use load_differential_trajectory if the robot is tank drive
            try:
                self.trajectory = choreo.load_swerve_trajectory("myTrajectory")
            except ValueError:
                self.trajectory = None

            self.drive_subsystem = Drive()
            self.timer = wpilib.Timer()

        def autonomousInit(self):
            if self.trajectory:
                # Get the initial pose of the trajectory
                initial_pose = self.trajectory.get_initial_pose(self.is_red_alliance())

                if initial_pose:
                    # Reset odometry to the start of the trajectory
                    self.drive_subsystem.reset_odometry(initial_pose)

            # Reset and start the timer when the autonomous period begins
            self.timer.restart()

        def autonomousPeriodic(self):
            if self.trajectory:
                # Sample the trajectory at the current time into the autonomous period
                sample = self.trajectory.sample_at(self.timer.get(), self.is_red_alliance())

                if sample:
                    self.drive_subsystem.follow_trajectory(sample)

        def is_red_alliance(self):
            return wpilib.DriverStation.getAlliance() == wpilib.DriverStation.Alliance.kRed
    ```
