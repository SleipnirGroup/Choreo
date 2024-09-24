// Copyright (c) Choreo contributors

#pragma once

#include <frc/geometry/Pose2d.h>
#include <frc/kinematics/ChassisSpeeds.h>
#include <units/time.h>

namespace frc {
static constexpr frc::Pose2d Interpolate(const frc::Pose2d& startValue,
                                         const frc::Pose2d& endValue,
                                         double t) {
  if (t < 0) {
    return startValue;
  } else if (t >= 1) {
    return endValue;
  } else {
    frc::Twist2d twist{startValue.Log(endValue)};
    frc::Twist2d scaledTwist = twist * t;
    return startValue.Exp(scaledTwist);
  }
}
}  // namespace frc

namespace choreo {
template <typename T>
concept TrajectorySample = requires(T t, units::second_t time, T tother, int year) {
  { t.GetTimestamp() } -> std::same_as<units::second_t>;
  { t.GetPose() } -> std::same_as<frc::Pose2d>;
  { t.GetChassisSpeeds() } -> std::same_as<frc::ChassisSpeeds>;
  { t.OffsetBy(time) } -> std::same_as<T>;
  { t.Interpolate(tother, time) } -> std::same_as<T>;
  requires requires {
        []<int Year>(const T& sample) -> T {
            return sample.template Flipped<Year>();
        };
    };
};
}  // namespace choreo
