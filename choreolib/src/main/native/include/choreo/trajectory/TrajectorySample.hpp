// Copyright (c) Choreo contributors

#pragma once

#include <concepts>

#include <wpi/math/geometry/Pose2d.hpp>
#include <wpi/math/kinematics/ChassisVelocities.hpp>
#include <wpi/units/time.hpp>

namespace choreo {

/// Enforce equality operators on trajectory sample types.
template <typename T>
concept EqualityComparable = requires(const T& a, const T& b) {
  { a == b } -> std::convertible_to<bool>;
  { a != b } -> std::convertible_to<bool>;
};

/// A concept representing a single robot sample in a Trajectory.
template <typename T>
concept TrajectorySample =
    EqualityComparable<T> &&
    requires(T t, wpi::units::second_t time, T tother, int year) {
      { t.GetTimestamp() } -> std::same_as<wpi::units::second_t>;
      { t.GetPose() } -> std::same_as<wpi::math::Pose2d>;
      {
        t.GetChassisVelocities()
      } -> std::same_as<wpi::math::ChassisVelocities>;
      { t.OffsetBy(time) } -> std::same_as<T>;
      { t.Interpolate(tother, time) } -> std::same_as<T>;
      // FIXME: This works around a roboRIO GCC internal compiler error; it
      // can't be fully generic
      { t.template Flipped<2022>() } -> std::same_as<T>;
      { t.template Flipped<2023>() } -> std::same_as<T>;
      { t.template Flipped<2024>() } -> std::same_as<T>;
      { t.template Flipped<2025>() } -> std::same_as<T>;
      { t.template Flipped<2026>() } -> std::same_as<T>;
      { t.MirrorX() } -> std::same_as<T>;
      { t.MirrorY() } -> std::same_as<T>;
      { t.RotateAround() } -> std::same_as<T>;
    };

}  // namespace choreo
