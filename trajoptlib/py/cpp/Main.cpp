// Copyright (c) TrajoptLib contributors

#include <nanobind/nanobind.h>

#include <trajopt/DifferentialTrajectoryGenerator.hpp>
#include <trajopt/SwerveTrajectoryGenerator.hpp>

#include "Binders.hpp"
// #include "Docstrings.hpp" // TODO docs

namespace nb = nanobind;

namespace trajoptlib {

NB_MODULE(_trajoptlib, m) {
  m.doc() =
      "A library for generating time optimal trajectories for FRC robots.";

  nb::module_ geometry = m.def_submodule("constraint");
  nb::module_ geometry = m.def_submodule("geometry");
  nb::module_ geometry = m.def_submodule("obstacle");
  nb::module_ util = m.def_submodule("path");
  nb::module_ util = m.def_submodule("util");

  nb::class_<SwerveDrivetrain> swerve_drivetrain{
      _trajoptlib, "SwerveDrivetrain", DOC(trajoptlib, SwerveDrivetrain)};
  nb::class_<SwerveSolution> swerve_solution{_trajoptlib, "SwerveSolution",
                                             DOC(trajoptlib, SwerveSolution)};
  nb::class_<SwerveTrajectorySample> swerve_trajectory_sample{
      _trajoptlib, "SwerveTrajectorySample",
      DOC(trajoptlib, SwerveTrajectorySample)};
  nb::class_<SwerveTrajectory> swerve_trajectory{
      _trajoptlib, "SwerveTrajectory", DOC(trajoptlib, SwerveTrajectory)};
  nb::class_<SwervePath> swerve_path{_trajoptlib, "SwervePath",
                                     DOC(trajoptlib, SwervePath)};
  nb::class_<SwervePathBuilder> swerve_path_builder{
      _trajoptlib, "SwervePathBuilder", DOC(trajoptlib, SwervePathBuilder)};
  nb::class_<SwerveTrajectoryGenerator> swerve_trajectory_generator{
      _trajoptlib, "SwerveTrajectoryGenerator",
      DOC(trajoptlib, SwerveTrajectoryGenerator)};

  BindSwerveDrivetrain(swerve_drivetrain);
  BindSwerveSolution(swerve_solution);
  BindSwerveTrajectorySample(swerve_trajectory_sample);
  BindSwerveTrajectory(swerve_trajectory);
  BindSwervePath(swerve_path);
  BindSwervePathBuilder(swerve_path_builder);
  BindSwerveTrajectoryGenerator(swerve_trajectory_generator);

  nb::class_<DifferentialDrivetrain> differential_drivetrain{
      _trajoptlib, "DifferentialDrivetrain",
      DOC(trajoptlib, DifferentialDrivetrain)};
  nb::class_<DifferentialSolution> differential_solution{
      _trajoptlib, "DifferentialSolution",
      DOC(trajoptlib, DifferentialSolution)};
  nb::class_<DifferentialTrajectorySample> differential_trajectory_sample{
      _trajoptlib, "DifferentialTrajectorySample",
      DOC(trajoptlib, DifferentialTrajectorySample)};
  nb::class_<DifferentialTrajectory> differential_trajectory{
      _trajoptlib, "DifferentialTrajectory",
      DOC(trajoptlib, DifferentialTrajectory)};
  nb::class_<DifferentialPath> differential_path{
      _trajoptlib, "DifferentialPath", DOC(trajoptlib, DifferentialPath)};
  nb::class_<DifferentialPathBuilder> differential_path_builder{
      _trajoptlib, "DifferentialPathBuilder",
      DOC(trajoptlib, DifferentialPathBuilder)};
  nb::class_<DifferentialTrajectoryGenerator> differential_trajectory_generator{
      _trajoptlib, "DifferentialTrajectoryGenerator",
      DOC(trajoptlib, DifferentialTrajectoryGenerator)};

  BindDifferentialDrivetrain(differential_drivetrain);
  BindDifferentialSolution(differential_solution);
  BindDifferentialTrajectorySample(differential_trajectory_sample);
  BindDifferentialTrajectory(differential_trajectory);
  BindDifferentialPath(differential_path);
  BindDifferentialPathBuilder(differential_path_builder);
  BindDifferentialTrajectoryGenerator(differential_trajectory_generator);

  // nb::class_<Variable> variable{autodiff, "Variable", DOC(sleipnir,
  // Variable)}; nb::class_<VariableMatrix> variable_matrix{autodiff,
  // "VariableMatrix",
  //                                            DOC(sleipnir, VariableMatrix)};
  // nb::class_<VariableBlock<VariableMatrix>> variable_block{
  //     autodiff, "VariableBlock", DOC(sleipnir, VariableBlock)};
  //
  // nb::class_<Gradient> gradient{autodiff, "Gradient", DOC(sleipnir,
  // Gradient)}; nb::class_<Hessian> hessian{autodiff, "Hessian", DOC(sleipnir,
  // Hessian)}; nb::class_<Jacobian> jacobian{autodiff, "Jacobian",
  // DOC(sleipnir, Jacobian)};
  //
  // nb::class_<EqualityConstraints> equality_constraints{
  //     optimization, "EqualityConstraints", DOC(sleipnir,
  //     EqualityConstraints)};
  // nb::class_<InequalityConstraints> inequality_constraints{
  //     optimization, "InequalityConstraints",
  //     DOC(sleipnir_InequalityConstraints)};
  //
  // nb::class_<SolverIterationInfo> solver_iteration_info{
  //     optimization, "SolverIterationInfo", DOC(sleipnir,
  //     SolverIterationInfo)};
  // nb::class_<SolverStatus> solver_status{optimization, "SolverStatus",
  //                                        DOC(sleipnir, SolverStatus)};
  //
  // nb::class_<OptimizationProblem> optimization_problem{
  //     optimization, "OptimizationProblem", DOC(sleipnir,
  //     OptimizationProblem)};
  //
  // nb::class_<OCPSolver, OptimizationProblem> ocp_solver{
  //     control, "OCPSolver", DOC(sleipnir, OCPSolver)};
  //
  // BindExpressionType(expression_type);
  //
  // BindVariable(autodiff, variable);
  // BindVariableMatrix(autodiff, variable_matrix);
  // BindVariableBlock(variable_block);
  //
  // // Implicit conversions
  // variable.def(nb::init_implicit<VariableMatrix>());
  // variable_matrix.def(nb::init_implicit<VariableBlock<VariableMatrix>>());
  //
  // BindGradient(gradient);
  // BindHessian(hessian);
  // BindJacobian(jacobian);
  //
  // BindEqualityConstraints(equality_constraints);
  // BindInequalityConstraints(inequality_constraints);
  //
  // BindSolverExitCondition(solver_exit_condition);
  // BindSolverIterationInfo(solver_iteration_info);
  // BindSolverStatus(solver_status);
  //
  // BindOptimizationProblem(optimization_problem);
  //
  // BindOCPSolver(transcription_method, dynamics_type, timestep_method,
  //               ocp_solver);
}

}  // namespace trajoptlib
