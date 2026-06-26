// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

#pragma once

#include <algorithm>
#include <initializer_list>
#include <span>

#include "wpi/math/geometry/Rotation2d.hpp"
#include "wpi/units/area.hpp"
#include "wpi/units/length.hpp"
#include "wpi/units/math.hpp"
#include "wpi/util/SymbolExports.hpp"
#include "wpi/units/force.hpp"
#include "wpi/util/json.hpp"

namespace choreo {

/**
 * Represents a force vector in 2D space.
 *
 * This assumes that you are using conventional mathematical axes.
 * When the robot is at the origin facing in the positive X direction, forward
 * is positive X and left is positive Y.
 */
class ForceVector2d final {
 public:
  /**
   * Constructs a ForceVector2d with X and Y components equal to zero.
   */
  constexpr ForceVector2d() = default;

  /**
   * Constructs a ForceVector2d with the X and Y components equal to the
   * provided values.
   *
   * @param x The x component of the translation.
   * @param y The y component of the translation.
   */
  constexpr ForceVector2d(wpi::units::newton_t x, wpi::units::newton_t y)
      : m_x{x}, m_y{y} {}

  /**
   * Constructs a ForceVector2d with the provided distance and angle. This is
   * essentially converting from polar coordinates to Cartesian coordinates.
   *
   * @param distance The distance from the origin to the end of the translation.
   * @param angle The angle between the x-axis and the translation vector.
   */
  constexpr ForceVector2d(wpi::units::newton_t magnitude, const wpi::math::Rotation2d& angle)
      : m_x{magnitude * angle.Cos()}, m_y{magnitude * angle.Sin()} {}

  /**
   * Returns the X component of the translation.
   *
   * @return The X component of the translation.
   */
  constexpr wpi::units::newton_t X() const { return m_x; }

  /**
   * Returns the Y component of the translation.
   *
   * @return The Y component of the translation.
   */
  constexpr wpi::units::newton_t Y() const { return m_y; }

  /**
   * Returns the norm, or distance from the origin to the translation.
   *
   * @return The norm of the translation.
   */
  constexpr wpi::units::newton_t Norm() const {
    return wpi::units::math::hypot(m_x, m_y);
  }

  /**
   * Returns the angle this translation forms with the positive X axis.
   *
   * @return The angle of the translation
   */
  constexpr wpi::math::Rotation2d Angle() const {
    return wpi::math::Rotation2d{m_x.value(), m_y.value()};
  }

  /**
   * Applies a rotation to the translation in 2D space.
   *
   * This multiplies the translation vector by a counterclockwise rotation
   * matrix of the given angle.
   *
   * <pre>
   * [x_new]   [other.cos, -other.sin][x]
   * [y_new] = [other.sin,  other.cos][y]
   * </pre>
   *
   * For example, rotating a ForceVector2d of &lt;2, 0&gt; by 90 degrees will
   * return a ForceVector2d of &lt;0, 2&gt;.
   *
   * @param other The rotation to rotate the translation by.
   *
   * @return The new rotated translation.
   */
  constexpr ForceVector2d RotateBy(const wpi::math::Rotation2d& other) const {
    return {m_x * other.Cos() - m_y * other.Sin(),
            m_x * other.Sin() + m_y * other.Cos()};
  }

  /**
   * Rotates this translation around another translation in 2D space.
   *
   * <pre>
   * [x_new]   [rot.cos, -rot.sin][x - other.x]   [other.x]
   * [y_new] = [rot.sin,  rot.cos][y - other.y] + [other.y]
   * </pre>
   *
   * @param other The other translation to rotate around.
   * @param rot The rotation to rotate the translation by.
   * @return The new rotated translation.
   */
  constexpr ForceVector2d RotateAround(const ForceVector2d& other,
                                       const wpi::math::Rotation2d& rot) const {
    return {(m_x - other.X()) * rot.Cos() - (m_y - other.Y()) * rot.Sin() +
                other.X(),
            (m_x - other.X()) * rot.Sin() + (m_y - other.Y()) * rot.Cos() +
                other.Y()};
  }

  /**
   * Returns the sum of two translations in 2D space.
   *
   * For example, Translation3d{1.0, 2.5} + Translation3d{2.0, 5.5} =
   * Translation3d{3.0, 8.0}.
   *
   * @param other The translation to add.
   *
   * @return The sum of the translations.
   */
  constexpr ForceVector2d operator+(const ForceVector2d& other) const {
    return {X() + other.X(), Y() + other.Y()};
  }

  /**
   * Returns the difference between two translations.
   *
   * For example, ForceVector2d{5.0, 4.0} - ForceVector2d{1.0, 2.0} =
   * ForceVector2d{4.0, 2.0}.
   *
   * @param other The translation to subtract.
   *
   * @return The difference between the two translations.
   */
  constexpr ForceVector2d operator-(const ForceVector2d& other) const {
    return *this + -other;
  }

  /**
   * Returns the inverse of the current translation. This is equivalent to
   * rotating by 180 degrees, flipping the point over both axes, or negating all
   * components of the translation.
   *
   * @return The inverse of the current translation.
   */
  constexpr ForceVector2d operator-() const { return {-m_x, -m_y}; }

  /**
   * Returns the translation multiplied by a scalar.
   *
   * For example, ForceVector2d{2.0, 2.5} * 2 = ForceVector2d{4.0, 5.0}.
   *
   * @param scalar The scalar to multiply by.
   *
   * @return The scaled translation.
   */
  constexpr ForceVector2d operator*(double scalar) const {
    return {scalar * m_x, scalar * m_y};
  }

  /**
   * Returns the translation divided by a scalar.
   *
   * For example, ForceVector2d{2.0, 2.5} / 2 = ForceVector2d{1.0, 1.25}.
   *
   * @param scalar The scalar to divide by.
   *
   * @return The scaled translation.
   */
  constexpr ForceVector2d operator/(double scalar) const {
    return operator*(1.0 / scalar);
  }

  /**
   * Checks equality between this ForceVector2d and another object.
   *
   * @param other The other object.
   * @return Whether the two objects are equal.
   */
  constexpr bool operator==(const ForceVector2d& other) const {
    using namespace wpi::units::literals;
    return wpi::units::math::abs(m_x - other.m_x) < wpi::units::newton_t{1e-9} &&
           wpi::units::math::abs(m_y - other.m_y) < wpi::units::newton_t{1e-9};
  }



 private:
  wpi::units::newton_t m_x = wpi::units::newton_t{0.0};
  wpi::units::newton_t m_y = wpi::units::newton_t{0.0};
};


// void to_json(wpi::util::json& json, const ForceVector2d& state) {
//   json = wpi::util::json::object("x", state.X().value(), "y", state.Y().value());
// }


// void from_json(const wpi::util::json& json, ForceVector2d& state) {
//   state = ForceVector2d{wpi::units::newton_t{json.at("x").get_number()},
//                         wpi::units::newton_t{json.at("y").get_number()}};
// }

}  // namespace wpi::math

// #include "wpi/math/geometry/proto/ForceVector2dProto.hpp"
// #include "wpi/math/geometry/struct/ForceVector2dStruct.hpp"
