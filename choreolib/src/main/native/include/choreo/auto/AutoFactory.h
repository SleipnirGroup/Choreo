// Copyright (c) Choreo contributors

#pragma once

#include <functional>
#include <string>
#include <string_view>
#include <unordered_map>
#include <utility>

#include <frc/RobotBase.h>

#include "choreo/Choreo.h"
#include "choreo/auto/AutoLoop.h"

namespace choreo {

/**
 * A class used to bind commands to events in all trajectories created by this
 * factory.
 */
class AutoBindings {
 public:
  /**
   * Default constructor.
   */
  AutoBindings() = default;

  AutoBindings(const AutoBindings&) = delete;
  AutoBindings& operator=(const AutoBindings&) = delete;

  /**
   * Move constructor.
   */
  AutoBindings(AutoBindings&&) = default;

  /**
   * Move assignment operator.
   *
   * @return This.
   */
  AutoBindings& operator=(AutoBindings&&) = default;

  /**
   * Binds a command to an event in all trajectories created by the factory
   * using this bindings.
   *
   * @param name The name of the event to bind the command to.
   * @param cmd The command to bind to the event.
   * @return The bindings object for chaining.
   */
  AutoBindings Bind(std::string_view name, frc2::CommandPtr cmd) && {
    bindings.emplace(name, std::move(cmd));
    return std::move(*this);
  }

 private:
  std::unordered_map<std::string, frc2::CommandPtr> bindings;

  void Merge(AutoBindings&& other) {
    for (auto& [key, value] : other.bindings) {
      bindings.emplace(std::move(key), std::move(value));
    }
    other.bindings.clear();
  }

  /**
   * Gets the bindings map.
   *
   * @return The bindings map.
   */
  const std::unordered_map<std::string, frc2::CommandPtr>& GetBindings() const {
    return bindings;
  }
};

/**
 * A factory used to create autonomous routines.
 *
 * Here is an example of how to use this class to create an auto routine:
 *
 * <h2>Example using <code>Trigger</code>s</h2>
 *
 * <pre><code>
 * frc::CommandPtr ShootThenMove(const AutoFactory& factory) {
 *   // Create a new auto loop to return
 *   auto loop = factory.NewLoop();
 *
 *   // Create a trajectory that moves the robot 2 meters
 *   AutoTrajectory trajectory = factory.Trajectory("move2meters", loop);
 *
 *   // Will automatically run the shoot command when the auto loop is first
 * polled loop.Enabled().OnTrue(shooter.Shoot());
 *
 *   // Gets a trigger from the shooter to if the shooter has a note, and will
 * run the trajectory
 *   // command when the shooter does not have a note
 *   loop.Enabled().And(shooter.HasNote()).OnFalse(trajectory.Cmd());
 *
 *   return LoopCmd().WithName("ShootThenMove");
 * }
 * </code></pre>
 *
 * <h2>Example using <code>CommandGroup</code>s</h2>
 *
 * <pre><code>
 * Command ShootThenMove(const AutoFactory& factory) {
 *   // Create a trajectory that moves the robot 2 meters
 *   frc::CommandPtr trajectory = factory.TrajectoryCommand("move2meters");
 *
 *   return shooter.Shoot()
 *      .AndThen(trajectory)
 *      .WithName("ShootThenMove");
 * }
 * </code></pre>
 *
 * @tparam SampleType The type of samples in the trajectory.
 */
template <choreo::TrajectorySample SampleType>
class AutoFactory {
 public:
  /**
   * Its recommended to use the Choreo::CreateAutoFactory() to create a new
   * instance of this class.
   *
   * @param poseSupplier Choreo::CreateAutoFactory()
   * @param controller Choreo::CreateAutoFactory()
   * @param outputChassisSpeeds Choreo::CreateAutoFactory()
   * @param mirrorTrajectory Choreo::CreateAutoFactory()
   * @param driveSubsystem Choreo::CreateAutoFactory()
   * @param bindings Choreo::CreateAutoFactory()
   * @param trajectoryLogger Choreo::CreateAutoFactory()
   */
  AutoFactory(std::function<frc::Pose2d()> poseSupplier,
              ChoreoControllerFunction<SampleType> controller,
              std::function<bool()> mirrorTrajectory,
              const frc2::Subsystem& driveSubsystem, AutoBindings bindings,
              std::optional<TrajectoryLogger> trajectoryLogger)
      : poseSupplier{std::move(poseSupplier)},
        controller{controller},
        mirrorTrajectory{std::move(mirrorTrajectory)},
        driveSubsystem{driveSubsystem},
        autoBindings{std::move(bindings)},
        trajectoryLogger{std::move(trajectoryLogger)} {}

  /**
   * Creates a new auto loop to be used to make an auto routine.
   *
   * @return A new auto loop.
   * @see AutoLoop
   */
  AutoLoop<SampleType> NewLoop() const {
    // Clear cache in simulation to allow a form of "hot-reloading" trajectories
    if (RobotBase::IsSimulation()) {
      ClearCache();
    }

    return AutoLoop<SampleType>();
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  AutoTrajectory<SampleType> Trajectory(std::string_view trajectoryName,
                                        AutoLoop<SampleType> loop) const {
    std::optional<choreo::Trajectory<SampleType>> optTraj =
        Choreo::LoadTrajectory<SampleType>(trajectoryName);
    choreo::Trajectory<SampleType> trajectory;
    if (optTraj.has_value()) {
      trajectory = optTraj.value();
    } else {
      FRC_ReportError(frc::warn::Warning, "Could not load trajectory: {}",
                      trajectoryName);
    }
    AutoTrajectory<SampleType> autoTraj{
        trajectoryName,   trajectory,          poseSupplier,   controller,
        mirrorTrajectory, trajectoryLogger,    driveSubsystem, loop.GetLoop(),
        autoBindings,     loop.OnNewTrajectory};
    loop.AddTrajectory(autoTraj);
    return autoTraj;
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @param splitIndex The index of the split trajectory to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  AutoTrajectory<SampleType> Trajectory(std::string_view trajectoryName,
                                        int splitIndex,
                                        AutoLoop<SampleType> loop) const {
    std::optional<choreo::Trajectory<SampleType>> optTraj =
        Choreo::LoadTrajectory<SampleType>(trajectoryName);
    choreo::Trajectory<SampleType> trajectory;
    if (optTraj.has_value()) {
      trajectory = optTraj.value();
    } else {
      FRC_ReportError(frc::warn::Warning, "Could not load trajectory: {}",
                      trajectoryName);
    }
    return Trajectory(trajectory, loop);
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param trajectory The trajectory to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  AutoTrajectory<SampleType> Trajectory(
      choreo::Trajectory<SampleType> trajectory,
      AutoLoop<SampleType> loop) const {
    AutoTrajectory<SampleType> autoTraj{
        trajectory.name,  trajectory,          poseSupplier,   controller,
        mirrorTrajectory, trajectoryLogger,    driveSubsystem, loop.GetLoop(),
        autoBindings,     loop.OnNewTrajectory};
    loop.AddTrajectory(autoTraj);
    return autoTraj;
  }

  /**
   * Binds a command to an event in all trajectories created after this point.
   *
   * @param name The name of the trajectory to bind the command to.
   * @param cmd The command to bind to the trajectory.
   */
  void Bind(std::string_view name, frc2::CommandPtr cmd) {
    autoBindings = std::move(autoBindings).Bind(name, cmd);
  }

 private:
  std::function<frc::Pose2d()> poseSupplier;
  ChoreoControllerFunction<SampleType> controller;
  std::function<bool()> mirrorTrajectory;
  const frc2::Subsystem& driveSubsystem;
  AutoBindings autoBindings{};
  std::optional<TrajectoryLogger> trajectoryLogger;
};

}  // namespace choreo
