// Copyright (c) TrajoptLib contributors

#pragma once

#include <concepts>
#include <utility>

#include <sleipnir/autodiff/variable.hpp>

#include "trajopt/geometry/rotation2.hpp"
#include "trajopt/geometry/translation2.hpp"

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
      : m_translation{other.translation()}, m_rotation{other.rotation()} {}

  /**
   * Returns the underlying translation.
   *
   * @return Reference to the translational component of the pose.
   */
  constexpr const Translation2<T>& translation() const { return m_translation; }

  /**
   * Returns the X component of the pose's translation.
   *
   * @return The x component of the pose's translation.
   */
  constexpr const T& x() const { return m_translation.x(); }

  /**
   * Returns the Y component of the pose's translation.
   *
   * @return The y component of the pose's translation.
   */
  constexpr const T& y() const { return m_translation.y(); }

  /**
   * Returns the underlying rotation.
   *
   * @return Reference to the rotational component of the pose.
   */
  constexpr const Rotation2<T>& rotation() const { return m_rotation; }

  /**
   * Rotates the pose around the origin and returns the new pose.
   *
   * @param other The rotation to transform the pose by.
   * @return The rotated pose.
   */
  constexpr Pose2<T> rotate_by(const Rotation2<T>& other) const {
    return {m_translation.rotate_by(other), m_rotation.rotate_by(other)};
  }

 private:
  Translation2<T> m_translation;
  Rotation2<T> m_rotation;
};

using Pose2d = Pose2<double>;
using Pose2v = Pose2<slp::Variable>;

template <typename T, typename U>
  requires std::convertible_to<T, U> || std::convertible_to<U, T>
slp::EqualityConstraints operator==(const Pose2<T>& lhs, const Pose2<U>& rhs) {
  return {{lhs.translation() == rhs.translation(),
           lhs.rotation() == rhs.rotation()}};
}

}  // namespace trajopt
