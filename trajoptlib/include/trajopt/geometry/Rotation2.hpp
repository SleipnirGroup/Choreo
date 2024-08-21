// Copyright (c) TrajoptLib contributors

#pragma once

#include <cmath>
#include <concepts>
#include <numbers>
#include <utility>
#include <vector>

#include <sleipnir/autodiff/Variable.hpp>

namespace trajopt {

/**
 * A rotation in a 2D coordinate frame represented by a point on the unit circle
 * (cosine and sine).
 */
template <typename T>
class Rotation2 {
 public:
  /**
   * Constructs a rotation with a default angle of 0 degrees.
   */
  constexpr Rotation2() = default;

  /**
   * Constructs a rotation with the given angle.
   *
   * @param angle The angle in radians.
   */
  constexpr Rotation2(const T& angle)            // NOLINT
      : m_cos{cos(angle)}, m_sin{sin(angle)} {}  // NOLINT

  /**
   * Constructs a rotation with the given cosine and sine components.
   *
   * @param cos The cosine component of the rotation.
   * @param sin The sine component of the rotation.
   */
  constexpr Rotation2(T cos, T sin)
      : m_cos{std::move(cos)}, m_sin{std::move(sin)} {}

  /**
   * Coerces one rotation type into another.
   *
   * @param other The other rotation type.
   */
  template <typename U>
  constexpr explicit Rotation2(const Rotation2<U>& other)
      : m_cos{other.Cos()}, m_sin{other.Sin()} {}

  /**
   * Adds two rotations together, with the result being bounded between -pi and
   * pi.
   *
   * @param other The rotation to add.
   * @return The sum of the two rotations.
   */
  constexpr Rotation2<T> operator+(const Rotation2<T>& other) const {
    return RotateBy(other);
  }

  /**
   * Subtracts the new rotation from the current rotation and returns the new
   * rotation.
   *
   * @param other The rotation to subtract.
   * @return The difference between the two rotations.
   */
  constexpr Rotation2<T> operator-(const Rotation2<T>& other) const {
    return *this + -other;
  }

  /**
   * Takes the inverse of the current rotation.
   *
   * @return The inverse of the current rotation.
   */
  constexpr Rotation2<T> operator-() const {
    return Rotation2<T>{m_cos, -m_sin};
  }

  /**
   * Adds the new rotation to the current rotation using a clockwise rotation
   * matrix.
   *
   * @param other The rotation to rotate by.
   * @return The new rotated rotation.
   */
  template <typename U>
  constexpr Rotation2<U> RotateBy(const Rotation2<U>& other) const {
    using R = decltype(std::declval<T>() + std::declval<U>());
    return Rotation2<R>{Cos() * other.Cos() - Sin() * other.Sin(),
                        Cos() * other.Sin() + Sin() * other.Cos()};
  }

  /**
   * Returns the rotation as an Euler angle in radians.
   *
   * @return The Euler angle in radians.
   */
  constexpr T Radians() const { return atan2(m_sin, m_cos); }  // NOLINT

  /**
   * Returns the rotation as an Euler angle in degrees.
   *
   * @return The Euler angle in degrees.
   */
  constexpr T Degrees() const {
    return atan2(m_sin, m_cos) / std::numbers::pi * 180.0;  // NOLINT
  }

  /**
   * Returns the cosine of the rotation.
   *
   * @return The cosine of the rotation.
   */
  constexpr const T& Cos() const { return m_cos; }

  /**
   * Returns the sine of the rotation.
   *
   * @return The sine of the rotation.
   */
  constexpr const T& Sin() const { return m_sin; }

 private:
  T m_cos = 1.0;
  T m_sin = 0.0;
};

using Rotation2d = Rotation2<double>;
using Rotation2v = Rotation2<sleipnir::Variable>;

template <typename T, typename U>
  requires std::same_as<T, sleipnir::Variable> ||
           std::same_as<U, sleipnir::Variable>
sleipnir::EqualityConstraints operator==(const Rotation2<T>& lhs,
                                         const Rotation2<U>& rhs) {
  std::vector<sleipnir::EqualityConstraints> constraints;

  // Constrain angle equality on manifold.
  //
  // Let lhs = <cos(a), sin(a)>.  NOLINT
  // Let rhs = <cos(b), sin(b)>.  NOLINT
  //
  // If the angles are equal, the angle between the unit vectors should be
  // zero.
  //
  //   lhs x rhs = ‖lhs‖ ‖rhs‖ sin(angleBetween)  NOLINT
  //         = 1 * 1 * 0
  //         = 0
  //
  // NOTE: angleBetween = π rad would be another solution
  constraints.emplace_back(lhs.Cos() * rhs.Sin() - lhs.Sin() * rhs.Cos() ==
                           0.0);

  // Require that lhs and rhs are unit vectors if they contain autodiff
  // variables, since their values can change.
  if constexpr (std::same_as<T, sleipnir::Variable>) {
    constraints.emplace_back(lhs.Cos() * lhs.Cos() + lhs.Sin() * lhs.Sin() ==
                             1.0);
  }
  if constexpr (std::same_as<U, sleipnir::Variable>) {
    constraints.emplace_back(rhs.Cos() * rhs.Cos() + rhs.Sin() * rhs.Sin() ==
                             1.0);
  }

  return sleipnir::EqualityConstraints{constraints};
}

}  // namespace trajopt
