// Copyright (c) TrajoptLib contributors

#pragma once

#include <array>
#include <cstddef>
#include <vector>

#include "trajopt/geometry/pose2.hpp"
#include "trajopt/geometry/translation2.hpp"
#include "trajopt/spline/cubic_hermite_spline.hpp"
#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

/// Helper class that is used to generate cubic and quintic splines from
/// user-provided waypoints.
class TRAJOPT_DLLEXPORT SplineHelper {
 public:
  /// Returns 2 cubic control vectors from a set of exterior waypoints and
  /// interior translations.
  ///
  /// @param start The starting pose.
  /// @param interior_waypoints The interior waypoints.
  /// @param end The ending pose.
  /// @return 2 cubic control vectors.
  static std::array<Spline<3>::ControlVector, 2>
  cubic_control_vectors_from_waypoints(
      const Pose2d& start, const std::vector<Translation2d>& interior_waypoints,
      const Pose2d& end) {
    double scalar;
    if (interior_waypoints.empty()) {
      scalar = 1.2 * start.translation().distance(end.translation());
    } else {
      scalar = 1.2 * start.translation().distance(interior_waypoints.front());
    }
    const auto initial_control_vector = cubic_control_vector(scalar, start);
    if (!interior_waypoints.empty()) {
      scalar = 1.2 * end.translation().distance(interior_waypoints.back());
    }
    const auto final_control_vector = cubic_control_vector(scalar, end);
    return {initial_control_vector, final_control_vector};
  }

  /// Returns a set of cubic splines corresponding to the provided control
  /// vectors. The user is free to set the direction of the start and end point.
  /// The directions for the middle waypoints are determined automatically to
  /// ensure continuous curvature throughout the path.
  ///
  /// The derivation for the algorithm used can be found here:
  /// <https://www.uio.no/studier/emner/matnat/ifi/nedlagte-emner/INF-MAT4350/h08/undervisningsmateriale/chap7alecture.pdf>
  ///
  /// @param start The starting control vector.
  /// @param waypoints The middle waypoints. This can be left blank if you only
  ///     wish to create a path with two waypoints.
  /// @param end The ending control vector.
  /// @return A vector of cubic hermite splines that interpolate through the
  ///     provided waypoints.
  static std::vector<CubicHermiteSpline> cubic_splines_from_control_vectors(
      const Spline<3>::ControlVector& start,
      std::vector<Translation2d> waypoints,
      const Spline<3>::ControlVector& end) {
    std::vector<CubicHermiteSpline> splines;

    std::array<double, 2> x_initial = start.x;
    std::array<double, 2> y_initial = start.y;
    std::array<double, 2> x_final = end.x;
    std::array<double, 2> y_final = end.y;

    if (waypoints.size() > 1) {
      waypoints.emplace(waypoints.begin(),
                        Translation2d{x_initial[0], y_initial[0]});
      waypoints.emplace_back(Translation2d{x_final[0], y_final[0]});

      // Populate tridiagonal system for clamped cubic
      /* See:
      https://www.uio.no/studier/emner/matnat/ifi/nedlagte-emner/INF-MAT4350/h08
      /undervisningsmateriale/chap7alecture.pdf
      */

      // Above-diagonal of tridiagonal matrix, zero-padded
      std::vector<double> a;
      // Diagonal of tridiagonal matrix
      std::vector<double> b(waypoints.size() - 2, 4.0);
      // Below-diagonal of tridiagonal matrix, zero-padded
      std::vector<double> c;
      // rhs vectors
      std::vector<double> dx, dy;
      // solution vectors
      std::vector<double> fx(waypoints.size() - 2, 0.0),
          fy(waypoints.size() - 2, 0.0);

      // populate above-diagonal and below-diagonal vectors
      a.emplace_back(0);
      for (size_t i = 0; i < waypoints.size() - 3; ++i) {
        a.emplace_back(1);
        c.emplace_back(1);
      }
      c.emplace_back(0);

      // populate rhs vectors
      dx.emplace_back(3 * (waypoints[2].x() - waypoints[0].x()) - x_initial[1]);
      dy.emplace_back(3 * (waypoints[2].y() - waypoints[0].y()) - y_initial[1]);
      if (waypoints.size() > 4) {
        for (size_t i = 1; i <= waypoints.size() - 4; ++i) {
          // dx and dy represent the derivatives of the internal waypoints. The
          // derivative of the second internal waypoint should involve the third
          // and first internal waypoint, which have indices of 1 and 3 in the
          // waypoints list (which contains ALL waypoints).
          dx.emplace_back(3 * (waypoints[i + 2].x() - waypoints[i].x()));
          dy.emplace_back(3 * (waypoints[i + 2].y() - waypoints[i].y()));
        }
      }
      dx.emplace_back(3 * (waypoints[waypoints.size() - 1].x() -
                           waypoints[waypoints.size() - 3].x()) -
                      x_final[1]);
      dy.emplace_back(3 * (waypoints[waypoints.size() - 1].y() -
                           waypoints[waypoints.size() - 3].y()) -
                      y_final[1]);

      // Compute solution to tridiagonal system
      thomas_algorithm(a, b, c, dx, &fx);
      thomas_algorithm(a, b, c, dy, &fy);

      fx.emplace(fx.begin(), x_initial[1]);
      fx.emplace_back(x_final[1]);
      fy.emplace(fy.begin(), y_initial[1]);
      fy.emplace_back(y_final[1]);

      for (size_t i = 0; i < fx.size() - 1; ++i) {
        // Create the spline.
        const CubicHermiteSpline spline{{waypoints[i].x(), fx[i]},
                                        {waypoints[i + 1].x(), fx[i + 1]},
                                        {waypoints[i].y(), fy[i]},
                                        {waypoints[i + 1].y(), fy[i + 1]}};

        splines.push_back(spline);
      }
    } else if (waypoints.size() == 1) {
      const double x_deriv =
          (3 * (x_final[0] - x_initial[0]) - x_final[1] - x_initial[1]) / 4.0;
      const double y_deriv =
          (3 * (y_final[0] - y_initial[0]) - y_final[1] - y_initial[1]) / 4.0;

      std::array<double, 2> mid_x_control_vector{waypoints[0].x(), x_deriv};
      std::array<double, 2> mid_y_control_vector{waypoints[0].y(), y_deriv};

      splines.emplace_back(x_initial, mid_x_control_vector, y_initial,
                           mid_y_control_vector);
      splines.emplace_back(mid_x_control_vector, x_final, mid_y_control_vector,
                           y_final);

    } else {
      // Create the spline.
      const CubicHermiteSpline spline{x_initial, x_final, y_initial, y_final};
      splines.push_back(spline);
    }

    return splines;
  }

 private:
  static Spline<3>::ControlVector cubic_control_vector(double scalar,
                                                       const Pose2d& point) {
    return {{point.x(), scalar * point.rotation().cos()},
            {point.y(), scalar * point.rotation().sin()}};
  }

  /// Thomas algorithm for solving tridiagonal systems Af = d.
  ///
  /// @param a the values of A above the diagonal
  /// @param b the values of A on the diagonal
  /// @param c the values of A below the diagonal
  /// @param d the vector on the rhs
  /// @param solution_vector the unknown (solution) vector, modified in-place
  static void thomas_algorithm(const std::vector<double>& a,
                               const std::vector<double>& b,
                               const std::vector<double>& c,
                               const std::vector<double>& d,
                               std::vector<double>* solution_vector) {
    auto& f = *solution_vector;
    size_t N = d.size();

    // Create the temporary vectors
    // Note that this is inefficient as it is possible to call
    // this function many times. A better implementation would
    // pass these temporary matrices by non-const reference to
    // save excess allocation and deallocation
    std::vector<double> c_star(N, 0.0);
    std::vector<double> d_star(N, 0.0);

    // This updates the coefficients in the first row
    // Note that we should be checking for division by zero here
    c_star[0] = c[0] / b[0];
    d_star[0] = d[0] / b[0];

    // Create the c_star and d_star coefficients in the forward sweep
    for (size_t i = 1; i < N; ++i) {
      double m = 1.0 / (b[i] - a[i] * c_star[i - 1]);
      c_star[i] = c[i] * m;
      d_star[i] = (d[i] - a[i] * d_star[i - 1]) * m;
    }

    f[N - 1] = d_star[N - 1];
    // This is the reverse sweep, used to update the solution vector f
    for (int i = N - 2; i >= 0; i--) {
      f[i] = d_star[i] - c_star[i] * f[i + 1];
    }
  }
};

}  // namespace trajopt
