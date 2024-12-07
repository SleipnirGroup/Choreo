// Copyright (c) TrajoptLib contributors

#pragma once

#include <nanobind/nanobind.h>&

namespace nb = nanobind;

namespace trajopt {

void BindSwerveDrivetrain(nb::class_<SwerveDrivetrain>& cls);
void BindSwerveSolution(nb::class_<SwerveSolution>& cls);
void BindSwerveTrajectorySample(nb::class_<SwerveTrajectorySample>& cls);
void BindSwerveTrajectory(nb::class_<SwerveTrajectory>& cls);
void BindSwervePath(nb::class_<SwervePath>& cls);
void BindSwervePathBuilder(nb::class_<SwervePathBuilder>& cls);
void BindSwerveTrajectoryGenerator(nb::class_<SwerveTrajectoryGenerator>& cls);

void BindDifferentialDrivetrain(nb::class_<DifferentialDrivetrain>& cls);
void BindDifferentialSolution(nb::class_<DifferentialTrajectory>& cls);
void BindDifferentialTrajectorySample(
    nb::class_<DifferentialTrajectorySample>& cls);
void BindDifferentialTrajectory(nb::class_<DifferentialTrajectory>& cls);
void BindDifferentialPath(nb::class_<DifferentialPath>& cls);
void BindDifferentialPathBuilder(nb::class_<DifferentialPathBuilder>& cls);
void BindDifferentialTrajectoryGenerator(
    nb::class_<DifferentialTrajectoryGenerator>& cls);

// void BindExpressionType(nb::enum_<ExpressionType>&& e);
// void BindVariable(nb::module_& autodiff, nb::class__<Variable>&& cls);
// void BindOCPSolver(nb::enum_<TranscriptionMethod>&& transcription_method,
//                    nb::enum_<DynamicsType>&& dynamics_type,
//                    nb::enum_<TimestepMethod>&& timestep_method,
//                    nb::class__<OCPSolver, OptimizationProblem>&& cls);

}  // namespace trajopt
