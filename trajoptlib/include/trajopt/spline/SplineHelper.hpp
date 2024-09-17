// Copyright (c) TrajoptLib contributors

#pragma once

#include <utility>
#include <vector>

#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/spline/CubicHermiteSpline.hpp"
#include "trajopt/spline/array.hpp"
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
  static wpi::array<Spline<3>::ControlVector, 2>
  CubicControlVectorsFromWaypoints(
      const trajopt::Pose2d& start,
      const std::vector<trajopt::Translation2d>& interiorWaypoints,
      const trajopt::Pose2d& end);

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
      const Spline<3>::ControlVector& end);

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
                              std::vector<double>* solutionVector);
};
}  // namespace frc
