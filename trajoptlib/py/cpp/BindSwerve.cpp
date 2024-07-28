// Copyright (c) TrajoptLib contributors

#include <nanobind/nanobind.h>
#include <nanobind/stl/function.h>

#include <vector>

#include <sleipnir/optimization/SolverStatus.hpp>
#include <trajopt/SwerveTrajectoryGenerator.hpp>
#include <trajopt/geometry/Translation2.hpp>

namespace nb = nanobind;

namespace trajopt {
/*
void BindSwerveDrivetrain(nb::class_<SwerveDrivetrain> cls);
void BindSwerveSolution(nb::class_<SwerveSolution> cls);
void BindSwerveTrajectorySample(nb::class_<SwerveTrajectorySample> cls);
void BindSwerveTrajectory(nb::class_<SwerveTrajectory> cls);
void BindSwervePath(nb::class_<SwervePath> cls);
void BindSwervePathBuilder(nb::class_<SwervePathBuilder> cls);
void BindSwerveTrajectoryGenerator(nb::class_<SwerveTrajectoryGenerator> cls);
 */

void BindSwerveDrivetrain(nb::class_<SwerveDrivetrain>& cls) {
  using namespace nb::literals;

  cls.def(nb::init<double, double, double, double, double,
                   std::vector<Translation2d>>(),
          "mass"_a, "moi"_a, "wheelRadius"_a, "wheelMaxAngularVelocity"_a,
          "wheelMaxTorque"_a, "modules"_a);
  cls.def_ro("mass", double, DOC(_trajoptlib, SwerveDrivetrain, double));
  cls.def_ro("moi", double, DOC(_trajoptlib, SwerveDrivetrain, double));
  cls.def_ro("wheelRadius", double, DOC(_trajoptlib, SwerveDrivetrain, double));
  cls.def_ro("wheelMaxAngularVelocity", double, DOC(_trajoptlib, SwerveDrivetrain, double));
  cls.def_ro("wheelMaxTorque", double, DOC(_trajoptlib, SwerveDrivetrain, double));
  cls.def_ro("modules", std::vector<Translation2d>, DOC(_trajoptlib, SwerveDrivetrain, std::vector<Translation2d>));
}

// void BindSwerveSolution(nb::class_<SwerveSolution>& cls) {
//   using namespace nb::literals;
//
//   cls.def(nb::init<
//               std::vector<double>, std::vector<double>, std::vector<double>, std::vector<double>, std::vector<double>, std::vector<double>, std::vector<double>, std::vector<double>, std::vector<double>, std::vector<double>, std::vector<double>, std::vector<double>, std::vector<double>, >(),
//           "dt"_a, "x"_a, "y"_a, "thetacos"_a, "thetasin"_a, "vx"_a, "vy"_a,
//           "omega"_a, "ax"_a, "ay"_a, "alpha"_a, "moduleFX"_a, "moduleFY"_a);
//   cls.def_ro("dt", std::vector<double>);
//   cls.def_ro("x", std::vector<double>);
//   cls.def_ro("y", std::vector<double>);
//   cls.def_ro("thetacos", std::vector<double>);
//   cls.def_ro("thetasin", std::vector<double>);
//   cls.def_ro("vx", std::vector<double>);
//   cls.def_ro("vy", std::vector<double>);
//   cls.def_ro("omega", std::vector<double>);
//   cls.def_ro("ax", std::vector<double>);
//   cls.def_ro("ay", std::vector<double>);
//   cls.def_ro("alpha", std::vector<double>);
//   cls.def_ro("moduleFX", std::vector<double>);
//   cls.def_ro("moduleFY", std::vector<double>);
// }

}  // namespace trajopt
