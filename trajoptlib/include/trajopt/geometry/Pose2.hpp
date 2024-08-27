// Copyright (c) TrajoptLib contributors

#pragma once

#include <concepts>
#include <utility>

#include <sleipnir/autodiff/Variable.hpp>

#include "trajopt/geometry/Rotation2.hpp"
#include "trajopt/geometry/Translation2.hpp"

namespace trajopt {

/**
 * Represents a 2D pose with translation and rotation.
 */
template <typename T>
class Pose2 {
 public:
  /**
   * Constructs a pose at the origin facing toward the positive x-axis.
   */
  constexpr Pose2() = default;

  /**
   * Constructs a pose with the specified translation and rotation.
   *
   * @param translation The translational component of the pose.
   * @param rotation The rotational component of the pose.
   */
  constexpr Pose2(Translation2<T> translation, Rotation2<T> rotation)
      : m_translation{std::move(translation)},
        m_rotation{std::move(rotation)} {}

  /**
   * Constructs a pose with x and y translations instead of a separate
   * translation.
   *
   * @param x The x component of the translational component of the pose.
   * @param y The y component of the translational component of the pose.
   * @param rotation The rotational component of the pose.
   */
  constexpr Pose2(T x, T y, Rotation2<T> rotation)
      : m_translation{Translation2<T>{std::move(x), std::move(y)}},
        m_rotation{std::move(rotation)} {}

  /**
   * Coerces one pose type into another.
   *
   * @param other The other pose type.
   */
  template <typename U>
  constexpr explicit Pose2(const Pose2<U>& other)
      : m_translation{other.Translation()}, m_rotation{other.Rotation()} {}

  /**
   * Returns the underlying translation.
   *
   * @return Reference to the translational component of the pose.
   */
  constexpr const Translation2<T>& Translation() const { return m_translation; }

  /**
   * Returns the X component of the pose's translation.
   *
   * @return The x component of the pose's translation.
   */
  constexpr const T& X() const { return m_translation.X(); }

  /**
   * Returns the Y component of the pose's translation.
   *
   * @return The y component of the pose's translation.
   */
  constexpr const T& Y() const { return m_translation.Y(); }

  /**
   * Returns the underlying rotation.
   *
   * @return Reference to the rotational component of the pose.
   */
  constexpr const Rotation2<T>& Rotation() const { return m_rotation; }

  /**
   * Rotates the pose around the origin and returns the new pose.
   *
   * @param other The rotation to transform the pose by.
   * @return The rotated pose.
   */
  constexpr Pose2<T> RotateBy(const Rotation2<T>& other) const {
    return {m_translation.RotateBy(other), m_rotation.RotateBy(other)};
  }

 private:
  Translation2<T> m_translation;
  Rotation2<T> m_rotation;
};

using Pose2d = Pose2<double>;
using Pose2v = Pose2<sleipnir::Variable>;

template <typename T, typename U>
  requires std::convertible_to<T, U> || std::convertible_to<U, T>
sleipnir::EqualityConstraints operator==(const Pose2<T>& lhs,
                                         const Pose2<U>& rhs) {
  return {{lhs.Translation() == rhs.Translation(),
           lhs.Rotation() == rhs.Rotation()}};
}

}  // namespace trajopt
