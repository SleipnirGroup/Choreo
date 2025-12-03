// Copyright (c) TrajoptLib contributors

#pragma once

#include <cmath>
#include <tuple>
#include <type_traits>
#include <utility>

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/autodiff/variable_matrix.hpp>

#include "trajopt/geometry/rotation2.hpp"

namespace trajopt {

/// Represents a translation in 2D space.
template <typename T>
class Translation2 {
 public:
  /// Constructs a translation with x and y components equal to zero.
  constexpr Translation2() = default;

  /// Constructs a translation with the given x and y components.
  ///
  /// @param x The x component of the translation.
  /// @param y The y component of the translation.
  template <typename X, typename Y>
  constexpr Translation2(X x, Y y) : m_x{std::move(x)}, m_y{std::move(y)} {}

  /// Constructs a translation with the provided distance and angle.
  ///
  /// This is essentially converting from polar coordinates to Cartesian
  /// coordinates.
  ///
  /// @param distance The distance from the origin to the end of the
  ///     translation.
  /// @param angle The angle between the x-axis and the translation vector.
  template <typename U>
  constexpr Translation2(T distance, const Rotation2<U>& angle)
      : m_x{distance * angle.cos()}, m_y{distance * angle.sin()} {}

  /// Coerces one translation type into another.
  ///
  /// @param other The other translation type.
  template <typename U>
  constexpr explicit Translation2(const Translation2<U>& other)
      : m_x{other.m_x}, m_y{other.m_y} {}

  /// Returns the x component of the translation.
  ///
  /// @return The x component of the translation.
  constexpr const T& x() const { return m_x; }

  /// Returns the y component of the translation.
  ///
  /// @return The y component of the translation.
  constexpr const T& y() const { return m_y; }

  /// Returns the sum of two translations in 2D space.
  ///
  /// @param other The translation to add.
  ///
  /// @return The sum of the translations.
  template <typename U>
  constexpr auto operator+(const Translation2<U>& other) const {
    using R = decltype(std::declval<T>() + std::declval<U>());
    return Translation2<R>{x() + other.x(), y() + other.y()};
  }

  /// Returns the difference between two translations.
  ///
  /// @param other The translation to subtract.
  /// @return The difference between the two translations.
  template <typename U>
  constexpr auto operator-(const Translation2<U>& other) const {
    return *this + -other;
  }

  /// Returns the inverse of the current translation.
  ///
  /// This is equivalent to rotating by 180 degrees, flipping the point over
  /// both axes, or negating all components of the translation.
  ///
  /// @return The inverse of the current translation.
  constexpr Translation2<T> operator-() const { return {-m_x, -m_y}; }

  /// Returns the translation multiplied by a scalar.
  ///
  /// @param scalar The scalar to multiply by.
  ///
  /// @return The scaled translation.
  template <typename U>
  constexpr auto operator*(const U& scalar) const {
    using R = decltype(std::declval<T>() + std::declval<U>());
    return Translation2<R>{m_x * scalar, m_y * scalar};
  }

  /// Returns the translation divided by a scalar.
  ///
  /// @param scalar The scalar to divide by.
  ///
  /// @return The scaled translation.
  template <typename U>
  constexpr auto operator/(const U& scalar) const {
    using R = decltype(std::declval<T>() + std::declval<U>());
    return Translation2<R>{m_x / scalar, m_y / scalar};
  }

  /// Applies a rotation to the translation in 2D space.
  ///
  /// @param rotation The rotation to rotate the translation by.
  /// @return The new rotated translation.
  template <typename U>
  constexpr auto rotate_by(const Rotation2<U>& rotation) const {
    using R = decltype(std::declval<T>() + std::declval<U>());
    return Translation2<R>{m_x * rotation.cos() - m_y * rotation.sin(),
                           m_x * rotation.sin() + m_y * rotation.cos()};
  }

  /// Returns the angle this translation forms with the positive x-axis.
  ///
  /// @return The angle of the translation.
  constexpr Rotation2<T> angle() const { return Rotation2<T>{m_x, m_y}; }

  /// Returns the dot product between two translations.
  ///
  /// @param other The other translation.
  /// @return The dot product.
  template <typename U>
  constexpr auto dot(const Translation2<U>& other) const {
    using R = decltype(std::declval<T>() + std::declval<U>());
    return R{m_x * other.x() + m_y * other.y()};
  }

  /// Returns the cross product between two translations.
  ///
  /// @param other The other translation.
  /// @return The cross product.
  template <typename U>
  constexpr auto cross(const Translation2<U>& other) const {
    using R = decltype(std::declval<T>() + std::declval<U>());
    return R{m_x * other.y() - m_y * other.x()};
  }

  /// Returns the norm of the translation. This is the distance from the origin
  /// to the translation.
  ///
  /// @return The norm of the translation.
  constexpr auto norm() const { return hypot(m_x, m_y); }

  /// Returns the squared norm of the translation. This is the sum of squares of
  /// the translation's components.
  ///
  /// @return The squared norm of the translation.
  constexpr auto squared_norm() const { return m_x * m_x + m_y * m_y; }

  /// Returns the distance between two translations in 2D space.
  ///
  /// The distance between translations is defined as √((x₂−x₁)²+(y₂−y₁)²).
  ///
  /// @param other The translation to which to compute the distance.
  /// @return The distance between the two translations.
  template <typename U>
  constexpr auto distance(const Translation2<U>& other) const {
    return hypot(other.x() - m_x, other.y() - m_y);
  }

 private:
  T m_x{0};
  T m_y{0};
};

template <size_t I, typename T>
constexpr decltype(auto) get(const trajopt::Translation2<T>& translation) {
  if constexpr (I == 0) {
    return translation.x();
  } else {
    return translation.y();
  }
}

using Translation2d = Translation2<double>;

template <typename Scalar>
using Translation2v = Translation2<slp::Variable<Scalar>>;

template <typename LHS, typename RHS>
  requires slp::SleipnirType<LHS> && (!slp::SleipnirType<RHS>)
auto operator==(const Translation2<LHS>& lhs, const Translation2<RHS>& rhs) {
  using Scalar = typename std::decay_t<LHS>::Scalar;

  return slp::VariableMatrix<Scalar>{{lhs.x()}, {lhs.y()}} ==
         slp::VariableMatrix<Scalar>{{rhs.x()}, {rhs.y()}};
}

template <typename LHS, typename RHS>
  requires(!slp::SleipnirType<LHS>) || slp::SleipnirType<RHS>
auto operator==(const Translation2<LHS>& lhs, const Translation2<RHS>& rhs) {
  using Scalar = typename std::decay_t<RHS>::Scalar;

  return slp::VariableMatrix<Scalar>{{lhs.x()}, {lhs.y()}} ==
         slp::VariableMatrix<Scalar>{{rhs.x()}, {rhs.y()}};
}

template <typename LHS, typename RHS>
  requires slp::SleipnirType<LHS> && slp::SleipnirType<RHS>
auto operator==(const Translation2<LHS>& lhs, const Translation2<RHS>& rhs) {
  using Scalar = typename std::decay_t<LHS>::Scalar;

  return slp::VariableMatrix<Scalar>{{lhs.x()}, {lhs.y()}} ==
         slp::VariableMatrix<Scalar>{{rhs.x()}, {rhs.y()}};
}

inline bool operator==(const Translation2d& lhs, const Translation2d& rhs) {
  return lhs.x() == rhs.x() && lhs.y() == rhs.y();
}

}  // namespace trajopt

namespace std {

/// tuple_size specialization for translations. Used for structured bindings.
template <typename T>
struct tuple_size<trajopt::Translation2<T>>
    : std::integral_constant<size_t, 2> {};

/// tuple_element specialization for first element of translation. Used for
/// structured bindings.
template <typename T>
struct tuple_element<0, trajopt::Translation2<T>> {
  /// tuple_element typedef for first element of translation.
  using type = T;
};

/// Tuple element specialization for second element of translation. Used for
/// structured bindings.
template <typename T>
struct tuple_element<1, trajopt::Translation2<T>> {
  /// Tuple element typedef for first element of translation.
  using type = T;
};

}  // namespace std
