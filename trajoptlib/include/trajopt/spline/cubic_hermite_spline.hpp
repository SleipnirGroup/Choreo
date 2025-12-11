// Copyright (c) TrajoptLib contributors

#pragma once

#include <array>

#include <Eigen/Core>

#include "trajopt/spline/spline.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// Represents a hermite spline of degree 3.
class TRAJOPT_DLLEXPORT CubicHermiteSpline : public Spline<3> {
 public:
  /// Constructs a cubic hermite spline with the specified control vectors. Each
  /// control vector contains info about the location of the point and its first
  /// derivative.
  ///
  /// @param x_initial_control_vector The control vector for the initial point
  ///     in the x dimension.
  /// @param x_final_control_vector The control vector for the final point in
  ///     the x dimension.
  /// @param y_initial_control_vector The control vector for the initial point
  ///     in the y dimension.
  /// @param y_final_control_vector The control vector for the final point in
  ///     the y dimension.
  CubicHermiteSpline(std::array<double, 2> x_initial_control_vector,
                     std::array<double, 2> x_final_control_vector,
                     std::array<double, 2> y_initial_control_vector,
                     std::array<double, 2> y_final_control_vector)
      : m_initial_control_vector{x_initial_control_vector,
                                 y_initial_control_vector},
        m_final_control_vector{x_final_control_vector, y_final_control_vector} {
    // Calculate the basis matrix for cubic Hermite spline interpolation.
    //
    // Given P(i), P'(i), P(i+1), P'(i+1), the control vectors, we want to find
    // the coefficients of the spline P(t) = a₃t³ + a₂t² + a₁t + a₀.
    //
    // P(i)    = P(0)  = a₀
    // P'(i)   = P'(0) = a₁
    // P(i+1)  = P(1)  = a₃ + a₂ + a₁ + a₀
    // P'(i+1) = P'(1) = 3a₃ + 2a₂ + a₁
    //
    // [P(i)   ] = [0 0 0 1][a₃]
    // [P'(i)  ] = [0 0 1 0][a₂]
    // [P(i+1) ] = [1 1 1 1][a₁]
    // [P'(i+1)] = [3 2 1 0][a₀]
    //
    // To solve for the coefficients, we can invert the 4x4 matrix and move it
    // to the other side of the equation.
    //
    // [a₃] = [ 2  1 -2  1][P(i)   ]
    // [a₂] = [-3 -2  3 -1][P'(i)  ]
    // [a₁] = [ 0  1  0  0][P(i+1) ]
    // [a₀] = [ 1  0  0  0][P'(i+1)]
    constexpr Eigen::Matrix4d basis{{+2.0, +1.0, -2.0, +1.0},
                                    {-3.0, -2.0, +3.0, -1.0},
                                    {+0.0, +1.0, +0.0, +0.0},
                                    {+1.0, +0.0, +0.0, +0.0}};

    Eigen::Vector4d x{m_initial_control_vector.x[0],
                      m_initial_control_vector.x[1],
                      m_final_control_vector.x[0], m_final_control_vector.x[1]};
    Eigen::Vector4d y{m_initial_control_vector.y[0],
                      m_initial_control_vector.y[1],
                      m_final_control_vector.y[0], m_final_control_vector.y[1]};

    // Populate rows 0 and 1 with coefficients
    m_coefficients.template block<1, 4>(0, 0) = basis * x;
    m_coefficients.template block<1, 4>(1, 0) = basis * y;

    // Populate rows 2 and 3 with the derivatives of the equations above
    for (int i = 0; i < 4; i++) {
      // Here, we are multiplying by (3 - i) to manually take the derivative.
      // The power of the term in index 0 is 3, index 1 is 2 and so on. To find
      // the coefficient of the derivative, we can use the power rule and
      // multiply the existing coefficient by its power.
      m_coefficients.template block<2, 1>(2, i) =
          m_coefficients.template block<2, 1>(0, i) * (3 - i);
    }

    // Populate rows 4 and 5 with the second derivatives
    for (int i = 0; i < 3; i++) {
      // Here, we are multiplying by (2 - i) to manually take the derivative.
      // The power of the term in index 0 is 2, index 1 is 1 and so on. To find
      // the coefficient of the derivative, we can use the power rule and
      // multiply the existing coefficient by its power.
      m_coefficients.template block<2, 1>(4, i) =
          m_coefficients.template block<2, 1>(2, i) * (2 - i);
    }
  }

  /// Returns the coefficients matrix.
  ///
  /// @return The coefficients matrix.
  const Eigen::Matrix<double, 6, 3 + 1>& coefficients() const override {
    return m_coefficients;
  }

  /// Returns the initial control vector that created this spline.
  ///
  /// @return The initial control vector that created this spline.
  const ControlVector& get_initial_control_vector() const override {
    return m_initial_control_vector;
  }

  /// Returns the final control vector that created this spline.
  ///
  /// @return The final control vector that created this spline.
  const ControlVector& get_final_control_vector() const override {
    return m_final_control_vector;
  }

 private:
  Eigen::Matrix<double, 6, 4> m_coefficients;

  ControlVector m_initial_control_vector;
  ControlVector m_final_control_vector;
};

}  // namespace trajopt
