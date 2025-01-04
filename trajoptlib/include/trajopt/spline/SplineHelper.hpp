// Copyright (c) TrajoptLib contributors

#pragma once

#include <array>
#include <cstddef>
#include <vector>

#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/spline/CubicHermiteSpline.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace frc {
/**
 * Helper class that is used to generate cubic and quintic splines from user
 * provided waypoints.
 */
class TRAJOPT_DLLEXPORT SplineHelper {
 public:
  /**
   * Returns 2 cubic control vectors from a set of exterior waypoints and
   * interior translations.
   *
   * @param start             The starting pose.
   * @param interiorWaypoints The interior waypoints.
   * @param end               The ending pose.
   * @return 2 cubic control vectors.
   */
  static std::array<Spline<3>::ControlVector, 2>
  CubicControlVectorsFromWaypoints(
      const trajopt::Pose2d& start,
      const std::vector<trajopt::Translation2d>& interiorWaypoints,
      const trajopt::Pose2d& end) {
    double scalar;
    if (interiorWaypoints.empty()) {
      scalar = 1.2 * start.Translation().Distance(end.Translation());
    } else {
      scalar = 1.2 * start.Translation().Distance(interiorWaypoints.front());
    }
    const auto initialCV = CubicControlVector(scalar, start);
    if (!interiorWaypoints.empty()) {
      scalar = 1.2 * end.Translation().Distance(interiorWaypoints.back());
    }
    const auto finalCV = CubicControlVector(scalar, end);
    return {initialCV, finalCV};
  }

  /**
   * Returns a set of cubic splines corresponding to the provided control
   * vectors. The user is free to set the direction of the start and end
   * point. The directions for the middle waypoints are determined
   * automatically to ensure continuous curvature throughout the path.
   *
   * The derivation for the algorithm used can be found here:
   * <https://www.uio.no/studier/emner/matnat/ifi/nedlagte-emner/INF-MAT4350/h08/undervisningsmateriale/chap7alecture.pdf>
   *
   * @param start The starting control vector.
   * @param waypoints The middle waypoints. This can be left blank if you
   * only wish to create a path with two waypoints.
   * @param end The ending control vector.
   *
   * @return A vector of cubic hermite splines that interpolate through the
   * provided waypoints.
   */
  static std::vector<CubicHermiteSpline> CubicSplinesFromControlVectors(
      const Spline<3>::ControlVector& start,
      std::vector<trajopt::Translation2d> waypoints,
      const Spline<3>::ControlVector& end) {
    std::vector<CubicHermiteSpline> splines;

    std::array<double, 2> xInitial = start.x;
    std::array<double, 2> yInitial = start.y;
    std::array<double, 2> xFinal = end.x;
    std::array<double, 2> yFinal = end.y;

    if (waypoints.size() > 1) {
      waypoints.emplace(waypoints.begin(),
                        trajopt::Translation2d{xInitial[0], yInitial[0]});
      waypoints.emplace_back(trajopt::Translation2d{xFinal[0], yFinal[0]});

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
      dx.emplace_back(3 * (waypoints[2].X() - waypoints[0].X()) - xInitial[1]);
      dy.emplace_back(3 * (waypoints[2].Y() - waypoints[0].Y()) - yInitial[1]);
      if (waypoints.size() > 4) {
        for (size_t i = 1; i <= waypoints.size() - 4; ++i) {
          // dx and dy represent the derivatives of the internal waypoints. The
          // derivative of the second internal waypoint should involve the third
          // and first internal waypoint, which have indices of 1 and 3 in the
          // waypoints list (which contains ALL waypoints).
          dx.emplace_back(3 * (waypoints[i + 2].X() - waypoints[i].X()));
          dy.emplace_back(3 * (waypoints[i + 2].Y() - waypoints[i].Y()));
        }
      }
      dx.emplace_back(3 * (waypoints[waypoints.size() - 1].X() -
                           waypoints[waypoints.size() - 3].X()) -
                      xFinal[1]);
      dy.emplace_back(3 * (waypoints[waypoints.size() - 1].Y() -
                           waypoints[waypoints.size() - 3].Y()) -
                      yFinal[1]);

      // Compute solution to tridiagonal system
      ThomasAlgorithm(a, b, c, dx, &fx);
      ThomasAlgorithm(a, b, c, dy, &fy);

      fx.emplace(fx.begin(), xInitial[1]);
      fx.emplace_back(xFinal[1]);
      fy.emplace(fy.begin(), yInitial[1]);
      fy.emplace_back(yFinal[1]);

      for (size_t i = 0; i < fx.size() - 1; ++i) {
        // Create the spline.
        const CubicHermiteSpline spline{{waypoints[i].X(), fx[i]},
                                        {waypoints[i + 1].X(), fx[i + 1]},
                                        {waypoints[i].Y(), fy[i]},
                                        {waypoints[i + 1].Y(), fy[i + 1]}};

        splines.push_back(spline);
      }
    } else if (waypoints.size() == 1) {
      const double xDeriv =
          (3 * (xFinal[0] - xInitial[0]) - xFinal[1] - xInitial[1]) / 4.0;
      const double yDeriv =
          (3 * (yFinal[0] - yInitial[0]) - yFinal[1] - yInitial[1]) / 4.0;

      std::array<double, 2> midXControlVector{waypoints[0].X(), xDeriv};
      std::array<double, 2> midYControlVector{waypoints[0].Y(), yDeriv};

      splines.emplace_back(xInitial, midXControlVector, yInitial,
                           midYControlVector);
      splines.emplace_back(midXControlVector, xFinal, midYControlVector,
                           yFinal);

    } else {
      // Create the spline.
      const CubicHermiteSpline spline{xInitial, xFinal, yInitial, yFinal};
      splines.push_back(spline);
    }

    return splines;
  }

 private:
  static Spline<3>::ControlVector CubicControlVector(
      double scalar, const trajopt::Pose2d& point) {
    return {{point.X(), scalar * point.Rotation().Cos()},
            {point.Y(), scalar * point.Rotation().Sin()}};
  }

  /**
   * Thomas algorithm for solving tridiagonal systems Af = d.
   *
   * @param a the values of A above the diagonal
   * @param b the values of A on the diagonal
   * @param c the values of A below the diagonal
   * @param d the vector on the rhs
   * @param solutionVector the unknown (solution) vector, modified in-place
   */
  static void ThomasAlgorithm(const std::vector<double>& a,
                              const std::vector<double>& b,
                              const std::vector<double>& c,
                              const std::vector<double>& d,
                              std::vector<double>* solutionVector) {
    auto& f = *solutionVector;
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
}  // namespace frc
