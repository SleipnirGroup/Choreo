// Copyright (c) TrajoptLib contributors

#include "trajopt/swerve_trajectory_generator.hpp"

#include <stdint.h>

#include <algorithm>
#include <chrono>
#include <ranges>
#include <vector>

#include <sleipnir/optimization/problem.hpp>
#include <sleipnir/optimization/solver/exit_status.hpp>

#include "trajopt/util/cancellation.hpp"
#include "trajopt/util/trajopt_util.hpp"

// Physics notation in this file:
//
//   x = linear position
//   v = linear velocity
//   a = linear acceleration
//   θ = heading
//   ω = angular velocity
//   α = angular acceleration
//   F = force
//   τ = torque
//   t = time
//
// A `d` prefix to one of these means delta.

namespace trajopt {

SwerveTrajectoryGenerator::SwerveTrajectoryGenerator(
    SwervePathBuilder path_builder, int64_t handle)
    : path(path_builder.get_path()),
      Ns(path_builder.get_control_interval_counts()) {
  auto initial_guess = path_builder.calculate_linear_initial_guess();

  problem.add_callback(
      [this, handle = handle](const slp::IterationInfo<double>&) -> bool {
        constexpr int fps = 60;
        constexpr std::chrono::duration<double> time_per_frame{1.0 / fps};

        // FPS limit on sending updates
        static auto last_frame_time = std::chrono::steady_clock::now();
        auto now = std::chrono::steady_clock::now();
        if (now - last_frame_time < time_per_frame) {
          return trajopt::get_cancellation_flag();
        }

        last_frame_time = now;

        auto soln = construct_swerve_solution();
        for (auto& callback : this->path.callbacks) {
          callback(soln, handle);
        }

        return trajopt::get_cancellation_flag();
      });

  size_t wpt_cnt = path.waypoints.size();
  size_t sgmt_cnt = path.waypoints.size() - 1;
  size_t samp_tot = get_index(Ns, wpt_cnt - 1, 0) + 1;
  size_t module_cnt = path.drivetrain.modules.size();

  x.reserve(samp_tot);
  y.reserve(samp_tot);
  cosθ.reserve(samp_tot);
  sinθ.reserve(samp_tot);
  vx.reserve(samp_tot);
  vy.reserve(samp_tot);
  ω.reserve(samp_tot);
  ax.reserve(samp_tot);
  ay.reserve(samp_tot);
  α.reserve(samp_tot);

  Fx.reserve(samp_tot);
  Fy.reserve(samp_tot);
  for (size_t sample_index = 0; sample_index < samp_tot; ++sample_index) {
    auto& _Fx = Fx.emplace_back();
    auto& _Fy = Fy.emplace_back();
    _Fx.reserve(module_cnt);
    _Fy.reserve(module_cnt);
  }

  dts.reserve(samp_tot);

  for (size_t index = 0; index < samp_tot; ++index) {
    x.emplace_back(problem.decision_variable());
    y.emplace_back(problem.decision_variable());
    cosθ.emplace_back(problem.decision_variable());
    sinθ.emplace_back(problem.decision_variable());
    vx.emplace_back(problem.decision_variable());
    vy.emplace_back(problem.decision_variable());
    ω.emplace_back(problem.decision_variable());
    ax.emplace_back(problem.decision_variable());
    ay.emplace_back(problem.decision_variable());
    α.emplace_back(problem.decision_variable());

    for (size_t module_index = 0; module_index < module_cnt; ++module_index) {
      Fx.at(index).emplace_back(problem.decision_variable());
      Fy.at(index).emplace_back(problem.decision_variable());
    }

    dts.emplace_back(problem.decision_variable());
  }

  double min_width = INFINITY;
  for (size_t i = 0; i < path.drivetrain.modules.size(); ++i) {
    auto mod_a = path.drivetrain.modules.at(i);
    size_t mod_b_idx = i == 0 ? path.drivetrain.modules.size() - 1 : i - 1;
    auto mod_b = path.drivetrain.modules.at(mod_b_idx);
    min_width = std::min(
        min_width, std::hypot(mod_a.x() - mod_b.x(), mod_a.y() - mod_b.y()));
  }

  constexpr int num_wheels = 4;

  // Minimize total time
  const double chassis_max_force = path.drivetrain.wheel_max_torque *
                                   num_wheels / path.drivetrain.wheel_radius;
  const double chassis_max_a = chassis_max_force / path.drivetrain.mass;
  const double chassis_max_v =
      path.drivetrain.wheel_radius * path.drivetrain.wheel_max_angular_velocity;
  const double wheel_max_position_radius =
      std::ranges::max(path.drivetrain.modules, {}, &Translation2d::norm)
          .norm();
  const double chassis_max_ω = chassis_max_v / wheel_max_position_radius;
  const double chassis_max_α = chassis_max_a / wheel_max_position_radius;
  for (size_t sgmt_index = 0; sgmt_index < Ns.size(); ++sgmt_index) {
    size_t N_sgmt = Ns.at(sgmt_index);
    size_t sgmt_start = get_index(Ns, sgmt_index);
    size_t sgmt_end = get_index(Ns, sgmt_index + 1);

    if (N_sgmt == 0) {
      for (size_t index = sgmt_start; index < sgmt_end + 1; ++index) {
        dts.at(index).set_value(0.0);
      }
    } else {
      // Use initial_guess and Ns to find the dx, dy, dθ between wpts
      const double dx =
          initial_guess.x.at(sgmt_end) - initial_guess.x.at(sgmt_start);
      const double dy =
          initial_guess.y.at(sgmt_end) - initial_guess.y.at(sgmt_start);
      const double dist = std::hypot(dx, dy);
      const double θ_0 = std::atan2(initial_guess.thetasin.at(sgmt_start),
                                    initial_guess.thetacos.at(sgmt_start));
      const double θ_1 = std::atan2(initial_guess.thetasin.at(sgmt_end),
                                    initial_guess.thetacos.at(sgmt_end));
      const double dθ = std::abs(angle_modulus(θ_1 - θ_0));

      const double angular_time =
          calculate_trapezoidal_time(dθ, chassis_max_ω, chassis_max_α);
      const double linear_time = calculate_trapezoidal_time(
          dist, std::min(chassis_max_v, dist / angular_time), chassis_max_a);
      const double sgmt_time = angular_time + linear_time;

      for (size_t index = sgmt_start; index < sgmt_end + 1; ++index) {
        auto& dt = dts.at(index);
        problem.subject_to(slp::bounds(0, dt, 3));
        dt.set_value(sgmt_time / N_sgmt);
      }
    }
  }
  problem.minimize(std::accumulate(dts.begin(), dts.end(), slp::Variable{0.0}));

  // Apply kinematics constraints
  for (size_t wpt_index = 0; wpt_index < wpt_cnt - 1; ++wpt_index) {
    size_t N_sgmt = Ns.at(wpt_index);

    for (size_t sample_index = 0; sample_index < N_sgmt; ++sample_index) {
      size_t index = get_index(Ns, wpt_index, sample_index);

      Translation2v<double> x_k{x.at(index), y.at(index)};
      Translation2v<double> x_k_1{x.at(index + 1), y.at(index + 1)};

      Rotation2v<double> θ_k{cosθ.at(index), sinθ.at(index)};
      Rotation2v<double> θ_k_1{cosθ.at(index + 1), sinθ.at(index + 1)};

      Translation2v<double> v_k{vx.at(index), vy.at(index)};
      Translation2v<double> v_k_1{vx.at(index + 1), vy.at(index + 1)};

      auto ω_k = ω.at(index);
      auto ω_k_1 = ω.at(index + 1);

      Translation2v<double> a_k{ax.at(index), ay.at(index)};
      Translation2v<double> a_k_1{ax.at(index + 1), ay.at(index + 1)};

      auto α_k = α.at(index);
      auto α_k_1 = α.at(index + 1);

      auto dt_k = dts.at(index);
      if (sample_index < N_sgmt - 1) {
        auto dt_k_1 = dts.at(index + 1);
        problem.subject_to(dt_k_1 == dt_k);
      }

      // xₖ₊₁ = xₖ + vₖt + 1/2aₖt²
      // θₖ₊₁ = θₖ + ωₖt
      // vₖ₊₁ = vₖ + aₖt
      // ωₖ₊₁ = ωₖ + αₖt
      problem.subject_to(x_k_1 == x_k + v_k * dt_k + a_k * 0.5 * dt_k * dt_k);
      problem.subject_to((θ_k_1 - θ_k) == Rotation2v<double>{ω_k * dt_k});
      problem.subject_to(v_k_1 == v_k + a_k * dt_k);
      problem.subject_to(ω_k_1 == ω_k + α_k * dt_k);
    }
  }

  for (size_t index = 0; index < samp_tot; ++index) {
    Rotation2v<double> θ_k{cosθ.at(index), sinθ.at(index)};
    Translation2v<double> v_k{vx.at(index), vy.at(index)};

    // Solve for net force
    auto Fx_net = std::accumulate(Fx.at(index).begin(), Fx.at(index).end(),
                                  slp::Variable{0.0});
    auto Fy_net = std::accumulate(Fy.at(index).begin(), Fy.at(index).end(),
                                  slp::Variable{0.0});

    // Solve for net torque
    slp::Variable τ_net = 0.0;
    for (size_t module_index = 0; module_index < path.drivetrain.modules.size();
         ++module_index) {
      const auto& translation = path.drivetrain.modules.at(module_index);
      auto r = translation.rotate_by(θ_k);
      Translation2v<double> F{Fx.at(index).at(module_index),
                              Fy.at(index).at(module_index)};

      τ_net += r.cross(F);
    }

    // Apply module power constraints
    auto v_wrt_robot = v_k.rotate_by(-θ_k);
    for (size_t module_index = 0; module_index < path.drivetrain.modules.size();
         ++module_index) {
      const auto& translation = path.drivetrain.modules.at(module_index);

      Translation2v<double> v_wheel_wrt_robot{
          v_wrt_robot.x() - translation.y() * ω.at(index),
          v_wrt_robot.y() + translation.x() * ω.at(index)};
      const double v_max = path.drivetrain.wheel_radius *
                           path.drivetrain.wheel_max_angular_velocity;

      // |v|₂² ≤ vₘₐₓ²
      problem.subject_to(v_wheel_wrt_robot.squared_norm() <= v_max * v_max);

      Translation2v<double> module_force{Fx.at(index).at(module_index),
                                         Fy.at(index).at(module_index)};

      // τ = r x F
      // F = τ/r
      const double wheel_max_force =
          path.drivetrain.wheel_max_torque / path.drivetrain.wheel_radius;

      // friction = μmg
      const double normal_force_per_wheel =
          path.drivetrain.mass * 9.8 / num_wheels;
      const double wheel_max_friction_force =
          path.drivetrain.wheel_cof * normal_force_per_wheel;

      const double F_max = std::min(wheel_max_force, wheel_max_friction_force);

      // |F|₂² ≤ Fₘₐₓ²
      problem.subject_to(module_force.squared_norm() <= F_max * F_max);
    }

    // Apply dynamics constraints
    //
    //   ΣF_xₖ = ma_xₖ
    //   ΣF_yₖ = ma_yₖ
    //   Στₖ = Jαₖ
    problem.subject_to(Fx_net == path.drivetrain.mass * ax.at(index));
    problem.subject_to(Fy_net == path.drivetrain.mass * ay.at(index));
    problem.subject_to(τ_net == path.drivetrain.moi * α.at(index));
  }

  for (size_t wpt_index = 0; wpt_index < wpt_cnt; ++wpt_index) {
    // First index of next wpt - 1
    size_t index = get_index(Ns, wpt_index, 0);

    Pose2v<double> pose_k{
        x.at(index), y.at(index), {cosθ.at(index), sinθ.at(index)}};
    Translation2v<double> v_k{vx.at(index), vy.at(index)};
    auto ω_k = ω.at(index);
    Translation2v<double> a_k{ax.at(index), ay.at(index)};
    auto α_k = α.at(index);

    for (auto& constraint : path.waypoints.at(wpt_index).waypoint_constraints) {
      std::visit(
          [&](auto&& arg) { arg.apply(problem, pose_k, v_k, ω_k, a_k, α_k); },
          constraint);
    }
  }

  for (size_t sgmt_index = 0; sgmt_index < sgmt_cnt; ++sgmt_index) {
    size_t start_index = get_index(Ns, sgmt_index, 0);
    size_t end_index = get_index(Ns, sgmt_index + 1, 0);

    for (size_t index = start_index; index < end_index; ++index) {
      Pose2v<double> pose_k{
          x.at(index), y.at(index), {cosθ.at(index), sinθ.at(index)}};
      Translation2v<double> v_k{vx.at(index), vy.at(index)};
      auto ω_k = ω.at(index);
      Translation2v<double> a_k{ax.at(index), ay.at(index)};
      auto α_k = α.at(index);

      for (auto& constraint :
           path.waypoints.at(sgmt_index + 1).segment_constraints) {
        std::visit(
            [&](auto&& arg) { arg.apply(problem, pose_k, v_k, ω_k, a_k, α_k); },
            constraint);
      }
    }
  }

  apply_initial_guess(initial_guess);
}

std::expected<SwerveSolution, slp::ExitStatus>
SwerveTrajectoryGenerator::generate(bool diagnostics) {
  get_cancellation_flag() = 0;

  // tolerance of 1e-4 is 0.1 mm
  auto status = problem.solve({.tolerance = 1e-4, .diagnostics = diagnostics});

  if (static_cast<int>(status) < 0 ||
      status == slp::ExitStatus::CALLBACK_REQUESTED_STOP) {
    return std::unexpected{status};
  } else {
    return construct_swerve_solution();
  }
}

void SwerveTrajectoryGenerator::apply_initial_guess(
    const SwerveSolution& solution) {
  size_t sample_total = x.size();
  for (size_t sample_index = 0; sample_index < sample_total; ++sample_index) {
    x[sample_index].set_value(solution.x[sample_index]);
    y[sample_index].set_value(solution.y[sample_index]);
    cosθ[sample_index].set_value(solution.thetacos[sample_index]);
    sinθ[sample_index].set_value(solution.thetasin[sample_index]);
  }

  vx[0].set_value(0.0);
  vy[0].set_value(0.0);
  ω[0].set_value(0.0);
  ax[0].set_value(0.0);
  ay[0].set_value(0.0);
  α[0].set_value(0.0);

  for (size_t sample_index = 1; sample_index < sample_total; ++sample_index) {
    vx[sample_index].set_value(
        (solution.x[sample_index] - solution.x[sample_index - 1]) /
        solution.dt[sample_index]);
    vy[sample_index].set_value(
        (solution.y[sample_index] - solution.y[sample_index - 1]) /
        solution.dt[sample_index]);

    double cosθ = solution.thetacos[sample_index];
    double sinθ = solution.thetasin[sample_index];
    double last_cosθ = solution.thetacos[sample_index - 1];
    double last_sinθ = solution.thetasin[sample_index - 1];

    ω[sample_index].set_value(Rotation2d{cosθ, sinθ}
                                  .rotate_by(-Rotation2d{last_cosθ, last_sinθ})
                                  .radians() /
                              solution.dt[sample_index]);

    ax[sample_index].set_value(
        (vx[sample_index].value() - vx[sample_index - 1].value()) /
        solution.dt[sample_index]);
    ay[sample_index].set_value(
        (vy[sample_index].value() - vy[sample_index - 1].value()) /
        solution.dt[sample_index]);
    α[sample_index].set_value(
        (ω[sample_index].value() - ω[sample_index - 1].value()) /
        solution.dt[sample_index]);
  }
}

SwerveSolution SwerveTrajectoryGenerator::construct_swerve_solution() {
  auto get_value = [](auto& var) { return var.value(); };

  auto vector_value = [&](std::vector<slp::Variable<double>>& row) {
    return row | std::views::transform(get_value) |
           std::ranges::to<std::vector>();
  };

  auto matrix_value =
      [&](std::vector<std::vector<slp::Variable<double>>>& mat) {
        return mat | std::views::transform([&](auto& v) {
                 return v | std::views::transform(get_value) |
                        std::ranges::to<std::vector>();
               }) |
               std::ranges::to<std::vector>();
      };

  return SwerveSolution{
      vector_value(dts),  vector_value(x),    vector_value(y),
      vector_value(cosθ), vector_value(sinθ), vector_value(vx),
      vector_value(vy),   vector_value(ω),    vector_value(ax),
      vector_value(ay),   vector_value(α),    matrix_value(Fx),
      matrix_value(Fy)};
}

}  // namespace trajopt
