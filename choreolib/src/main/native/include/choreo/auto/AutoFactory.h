// Copyright (c) Choreo contributors

#pragma once

#include <functional>
#include <memory>
#include <string_view>
#include <utility>

#include <frc/RobotBase.h>

#include "choreo/auto/AutoRoutine.h"
#include "choreo/auto/AutoTrajectory.h"
#include "choreo/auto/TrajectoryCache.h"
#include "choreo/util/AllianceFlipperUtil.h"

namespace choreo {
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
 * @tparam Year The field year. Defaults to the current year.
 */
template <choreo::TrajectorySample SampleType, int Year = util::kDefaultYear>
class AutoFactory {
 public:
  /**
   * Its recommended to use the Choreo::CreateAutoFactory() to create a new
   * instance of this class.
   *
   * @param poseSupplier Choreo::CreateAutoFactory()
   * @param controller Choreo::CreateAutoFactory()
   * @param mirrorTrajectory Choreo::CreateAutoFactory()
   * @param drivebaseRequirements Choreo::CreateAutoFactory()
   * @param trajectoryLogger Choreo::CreateAutoFactory()
   */
  AutoFactory(std::function<frc::Pose2d()> poseSupplier,
              std::function<void(frc::Pose2d, SampleType)> controller,
              std::function<bool()> mirrorTrajectory,
              frc2::Requirements drivebaseRequirements,
              std::optional<TrajectoryLogger<SampleType>> trajectoryLogger)
      : poseSupplier{std::move(poseSupplier)},
        controller{controller},
        mirrorTrajectory{std::move(mirrorTrajectory)},
        drivebaseRequirements{drivebaseRequirements},
        autoBindings{std::make_shared<AutoBindings>()},
        trajectoryLogger{std::move(trajectoryLogger)} {}

  /**
   * Creates a new auto loop to be used to make an auto routine.
   *
   * @param name The name of the event loop.
   * @return A new auto loop.
   * @see AutoRoutine
   */
  AutoRoutine<SampleType, Year> NewLoop(std::string_view name) {
    // Clear cache in simulation to allow a form of "hot-reloading" trajectories
    if (frc::RobotBase::IsSimulation()) {
      ClearCache();
    }

    return AutoRoutine<SampleType, Year>(name);
  }

  /**
   * Creates a new auto trajectory to be used in an auto routine.
   *
   * @param trajectoryName The name of the trajectory to use.
   * @param loop The auto loop to use as the triggers polling context.
   * @return A new auto trajectory.
   */
  AutoTrajectory<SampleType, Year> Trajectory(
      std::string_view trajectoryName,
      AutoRoutine<SampleType, Year>& loop) const {
    std::optional<choreo::Trajectory<SampleType>> optTraj =
        trajectoryCache.LoadTrajectory(trajectoryName);
    choreo::Trajectory<SampleType> trajectory;
    if (optTraj.has_value()) {
      trajectory = optTraj.value();
    } else {
      FRC_ReportError(frc::warn::Warning, "Could not load trajectory: {}",
                      trajectoryName);
    }
    AutoTrajectory<SampleType, Year> autoTraj{
        trajectoryName,        trajectory,
        poseSupplier,          controller,
        mirrorTrajectory,      trajectoryLogger,
        drivebaseRequirements, loop.GetLoop(),
        autoBindings};
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
  AutoTrajectory<SampleType, Year> Trajectory(
      std::string_view trajectoryName, int splitIndex,
      AutoRoutine<SampleType, Year>& loop) const {
    std::optional<choreo::Trajectory<SampleType>> optTraj =
        trajectoryCache.LoadTrajectory(trajectoryName, splitIndex);
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
  AutoTrajectory<SampleType, Year> Trajectory(
      choreo::Trajectory<SampleType> trajectory,
      AutoRoutine<SampleType, Year>& loop) const {
    AutoTrajectory<SampleType> autoTraj{trajectory.name,       trajectory,
                                        poseSupplier,          controller,
                                        mirrorTrajectory,      trajectoryLogger,
                                        drivebaseRequirements, loop.GetLoop(),
                                        autoBindings};
    return autoTraj;
  }

  /**
   * Binds a command to an event in all trajectories created after this point.
   *
   * @param name The name of the trajectory to bind the command to.
   * @param cmdFactory A function that retuns a CommandPtr to bind
   */
  void Bind(std::string_view name,
            std::function<frc2::CommandPtr()> cmdFactory) {
    autoBindings->Bind(name, std::move(cmdFactory));
  }

  /**
   * Empties the interal trajecectory cache
   */
  void ClearCache() { trajectoryCache.Clear(); }

 private:
  std::function<frc::Pose2d()> poseSupplier;
  std::function<void(frc::Pose2d, SampleType)> controller;
  std::function<bool()> mirrorTrajectory;
  frc2::Requirements drivebaseRequirements;
  std::shared_ptr<AutoBindings> autoBindings;
  std::optional<TrajectoryLogger<SampleType>> trajectoryLogger;
  TrajectoryCache<SampleType> trajectoryCache;
};

}  // namespace choreo
