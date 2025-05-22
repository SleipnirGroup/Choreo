// Copyright (c) TrajoptLib contributors

#include <nanobind/nanobind.h>
#include <nanobind/operators.h>
#include <nanobind/stl/string.h>

#include <trajopt/geometry/pose2.hpp>
#include <trajopt/geometry/rotation2.hpp>
#include <trajopt/geometry/translation2.hpp>
#include <trajopt/swerve_trajectory_generator.hpp>

namespace nb = nanobind;
using namespace nb::literals;

NB_MODULE(trajoptlib_py, m) {
  nb::class_<trajopt::Rotation2d>(m, "Rotation2d")
      .def(nb::init<>())
      .def(nb::init<double>())
      .def(nb::init<double, double>())
      .def(nb::self + nb::self)
      .def(nb::self - nb::self)
      .def(nb::self == nb::self)
      .def(-nb::self)
      .def("rotate_by",
           [](nb::handle_t<trajopt::Rotation2d> self,
              nb::handle_t<trajopt::Rotation2d> other) {
             trajopt::Rotation2d& self_cpp =
                 nb::cast<trajopt::Rotation2d&>(self);
             trajopt::Rotation2d& other_cpp =
                 nb::cast<trajopt::Rotation2d&>(other);
             return self_cpp.rotate_by(other_cpp);
           })
      .def("radians", &trajopt::Rotation2d::radians)
      .def("degrees", &trajopt::Rotation2d::degrees)
      .def("cos", &trajopt::Rotation2d::cos)
      .def("sin", &trajopt::Rotation2d::sin);

  nb::class_<trajopt::Translation2d>(m, "Translation2d")
      .def(nb::init<>())
      .def(nb::init<double, double>())
      .def(nb::init<double, trajopt::Rotation2d>())
      .def("x", &trajopt::Translation2d::x)
      .def("y", &trajopt::Translation2d::y)
      .def(nb::self + nb::self)
      .def(nb::self - nb::self)
      .def(-nb::self)
      .def(nb::self * double())
      .def(nb::self / double())
      .def(nb::self == nb::self)
      .def("rotate_by",
           [](nb::handle_t<trajopt::Translation2d> self,
              nb::handle_t<trajopt::Rotation2d> rotation) {
             trajopt::Translation2d& self_cpp =
                 nb::cast<trajopt::Translation2d&>(self);
             trajopt::Rotation2d& rotation_cpp =
                 nb::cast<trajopt::Rotation2d&>(rotation);
             return self_cpp.rotate_by(rotation_cpp);
           })
      .def("angle", &trajopt::Translation2d::angle)
      .def("dot",
           [](nb::handle_t<trajopt::Translation2d> self,
              nb::handle_t<trajopt::Translation2d> other) {
             trajopt::Translation2d& self_cpp =
                 nb::cast<trajopt::Translation2d&>(self);
             trajopt::Translation2d& other_cpp =
                 nb::cast<trajopt::Translation2d&>(other);
             return self_cpp.dot(other_cpp);
           })
      .def("cross",
           [](nb::handle_t<trajopt::Translation2d> self,
              nb::handle_t<trajopt::Translation2d> other) {
             trajopt::Translation2d& self_cpp =
                 nb::cast<trajopt::Translation2d&>(self);
             trajopt::Translation2d& other_cpp =
                 nb::cast<trajopt::Translation2d&>(other);
             return self_cpp.cross(other_cpp);
           })
      .def("norm", &trajopt::Translation2d::norm)
      .def("squared_norm", &trajopt::Translation2d::squared_norm)
      .def("distance", [](nb::handle_t<trajopt::Translation2d> self,
                          nb::handle_t<trajopt::Translation2d> other) {
        trajopt::Translation2d& self_cpp =
            nb::cast<trajopt::Translation2d&>(self);
        trajopt::Translation2d& other_cpp =
            nb::cast<trajopt::Translation2d&>(other);
        return self_cpp.distance(other_cpp);
      });

  nb::class_<trajopt::Pose2d>(m, "Pose2d")
      .def(nb::init<>())
      .def(nb::init<trajopt::Translation2d, trajopt::Rotation2d>())
      .def(nb::init<double, double, trajopt::Rotation2d>())
      .def("translation", &trajopt::Pose2d::translation)
      .def("x", &trajopt::Pose2d::x)
      .def("y", &trajopt::Pose2d::y)
      .def("rotation", &trajopt::Pose2d::rotation)
      .def("rotate_by", [](nb::handle_t<trajopt::Translation2d> self,
                           nb::handle_t<trajopt::Rotation2d> rotation) {
        trajopt::Translation2d& self_cpp =
            nb::cast<trajopt::Translation2d&>(self);
        trajopt::Rotation2d& rotation_cpp =
            nb::cast<trajopt::Rotation2d&>(rotation);
        return self_cpp.rotate_by(rotation_cpp);
      });
}
