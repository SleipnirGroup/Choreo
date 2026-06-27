#pragma once

#include <concepts>
#include <wpi/util/json.hpp>
#include "wpi/math/geometry/Pose2d.hpp"
#include "wpi/math/geometry/Transform2d.hpp"
#include "wpi/math/kinematics/ChassisAccelerations.hpp"
#include "wpi/math/kinematics/ChassisVelocities.hpp"
#include "wpi/units/time.hpp"
#include "../drive_type.hpp"
namespace choreo {

/// @brief Concept for a trajectory sample with pose, velocity, and acceleration
/// components.
template <typename T>
concept SampleLike = requires(T sample, wpi::math::Transform2d transform, wpi::math::Pose2d otherPose, wpi::units::second_t newTimestamp) {
  {sample.timestamp} -> std::convertible_to<wpi::units::second_t>;
  // Must have pose member
  { sample.pose } -> std::convertible_to<wpi::math::Pose2d>;
  // Must have velocity member
  { sample.velocity } -> std::convertible_to<wpi::math::ChassisVelocities>;
  // Must have acceleration member
  { sample.acceleration } -> std::convertible_to<wpi::math::ChassisAccelerations>;

  { sample.Transform(transform) } -> std::convertible_to<T>;
  {sample.RelativeTo(otherPose) } -> std::convertible_to<T>;
  {sample.WithNewTimestamp(newTimestamp) } -> std::convertible_to<T>;
};

template <typename T, typename Sample>
concept TrajectoryLike = requires(T traj, std::vector<Sample> samples, const Sample& start, const Sample& end, const wpi::math::Transform2d& transform, const wpi::math::Pose2d& pose, const T& otherTraj) {
    T(samples);
    { traj.Samples() } -> std::convertible_to<std::vector<Sample>>;
    { traj.Concatenate(otherTraj) } -> std::convertible_to<T>;
    { traj.Interpolate(start, end, 0.0) } -> std::convertible_to<Sample>;
    {traj.TransformBy(transform) } -> std::convertible_to<T>;
    {traj.RelativeTo(pose) } -> std::convertible_to<T>;
    {traj + otherTraj } -> std::convertible_to<T>;
};

template <typename T>
concept DriveTypeLike = requires (T::TrajoptSample trajoptSample) {
    typename T::WPILibSample;
    SampleLike<typename T::WPILibSample>;
    typename T::WPILibTrajectory;
    TrajectoryLike<typename T::WPILibTrajectory, typename T::WPILibSample>;
    typename T::TrajoptSample;
    {T::driveType} -> std::convertible_to<DriveType>;
    {T::tag} -> std::convertible_to<std::string>;
    {T::fromTrajopt(trajoptSample) } -> std::convertible_to<typename T::WPILibSample>;
}; 
}  // namespace choreo
