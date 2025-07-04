// Copyright (c) TrajoptLib contributors

#include "trajopt/mecanum_trajectory_generator.hpp"

#include <stdint.h>

#include <algorithm>
#include <chrono>
#include <cmath>
#include <ranges>
#include <vector>

#include <sleipnir/optimization/problem.hpp>
#include <sleipnir/optimization/solver/exit_status.hpp>

#include "sleipnir/autodiff/variable.hpp"
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

MecanumTrajectoryGenerator::MecanumTrajectoryGenerator(
    MecanumPathBuilder path_builder, int64_t handle)
    : path(path_builder.get_path()),
      Ns(path_builder.get_control_interval_counts()) {
  auto initial_guess = path_builder.calculate_linear_initial_guess();

  problem.add_callback(
      [this, handle = handle](const slp::IterationInfo&) -> bool {
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
  size_t module_cnt = 4;

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

  F.reserve(samp_tot);
  for (size_t sample_index = 0; sample_index < samp_tot; ++sample_index) {
    auto& _F = F.emplace_back();
    _F.reserve(module_cnt);
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
      F.at(index).emplace_back(problem.decision_variable());
    }

    dts.emplace_back(problem.decision_variable());
  }

  double min_width = INFINITY;
  for (size_t i = 0; i < path.drivetrain.wheels.size(); ++i) {
    auto mod_a = path.drivetrain.wheels.at(i);
    size_t mod_b_idx = i == 0 ? path.drivetrain.wheels.size() - 1 : i - 1;
    auto mod_b = path.drivetrain.wheels.at(mod_b_idx);
    min_width = std::min(
        min_width, std::hypot(mod_a.x() - mod_b.x(), mod_a.y() - mod_b.y()));
  }

  // Minimize total time
  const double max_force =
      path.drivetrain.wheel_max_torque * 4 / path.drivetrain.wheel_radius;
  const auto max_accel = max_force / path.drivetrain.mass;
  const double max_drivetrain_velocity =
      path.drivetrain.wheel_radius * path.drivetrain.wheel_max_angular_velocity;
  auto max_wheel_position_radius = 0.0;
  for (auto module : path.drivetrain.wheels) {
    max_wheel_position_radius =
        std::max(max_wheel_position_radius, module.norm());
  }
  const auto max_ang_vel = max_drivetrain_velocity / max_wheel_position_radius;
  const auto max_ang_accel = max_accel / max_wheel_position_radius;
  for (size_t sgmt_index = 0; sgmt_index < Ns.size(); ++sgmt_index) {
    auto N_sgmt = Ns.at(sgmt_index);
    const auto sgmt_start = get_index(Ns, sgmt_index);
    const auto sgmt_end = get_index(Ns, sgmt_index + 1);

    if (N_sgmt == 0) {
      for (size_t index = sgmt_start; index < sgmt_end + 1; ++index) {
        dts.at(index).set_value(0.0);
      }
    } else {
      // Use initial_guess and Ns to find the dx, dy, dθ between wpts
      const auto dx =
          initial_guess.x.at(sgmt_end) - initial_guess.x.at(sgmt_start);
      const auto dy =
          initial_guess.y.at(sgmt_end) - initial_guess.y.at(sgmt_start);
      const auto dist = std::hypot(dx, dy);
      const auto θ_0 = std::atan2(initial_guess.thetasin.at(sgmt_start),
                                  initial_guess.thetacos.at(sgmt_start));
      const auto θ_1 = std::atan2(initial_guess.thetasin.at(sgmt_end),
                                  initial_guess.thetacos.at(sgmt_end));
      const auto dθ = std::abs(angle_modulus(θ_1 - θ_0));

      auto max_linear_vel = max_drivetrain_velocity;

      const auto angular_time =
          calculate_trapezoidal_time(dθ, max_ang_vel, max_ang_accel);
      max_linear_vel = std::min(max_linear_vel, dist / angular_time);

      const auto linear_time =
          calculate_trapezoidal_time(dist, max_linear_vel, max_accel);
      const double sgmt_time = angular_time + linear_time;

      for (size_t index = sgmt_start; index < sgmt_end + 1; ++index) {
        auto& dt = dts.at(index);
        problem.subject_to(dt >= 0);
        problem.subject_to(dt <= 3);
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

      Translation2v x_k{x.at(index), y.at(index)};
      Translation2v x_k_1{x.at(index + 1), y.at(index + 1)};

      Rotation2v θ_k{cosθ.at(index), sinθ.at(index)};
      Rotation2v θ_k_1{cosθ.at(index + 1), sinθ.at(index + 1)};

      Translation2v v_k{vx.at(index), vy.at(index)};
      Translation2v v_k_1{vx.at(index + 1), vy.at(index + 1)};

      auto ω_k = ω.at(index);
      auto ω_k_1 = ω.at(index + 1);

      Translation2v a_k{ax.at(index), ay.at(index)};
      Translation2v a_k_1{ax.at(index + 1), ay.at(index + 1)};

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
      problem.subject_to((θ_k_1 - θ_k) == Rotation2v{ω_k * dt_k});
      problem.subject_to(v_k_1 == v_k + a_k * dt_k);
      problem.subject_to(ω_k_1 == ω_k + α_k * dt_k);
    }
  }


  auto s = 1.0/std::sqrt(2.0);
  std::vector<double> fx_forward = {s, s, s, s};
  std::vector<double> fy_forward = {-s, s, s, -s};

  std::vector<double> vx_inverse = {1,1,1,1};
  std::vector<double> vy_inverse = {-1,1,1,-1};
  std::vector<double> ω_inverse = {-1,1,1,-1};

  for (size_t index = 0; index < samp_tot; ++index) {
    Rotation2v θ_k{cosθ.at(index), sinθ.at(index)};
    Translation2v v_k{vx.at(index), vy.at(index)};

    // Solve for net force
    auto Fx = std::ranges::to<std::vector>(
        std::views::zip_transform([](auto x, auto y) { return x * y; }, fx_forward, F.at(index))
    );

    auto Fy = std::ranges::to<std::vector>(
        std::views::zip_transform([](auto x, auto y) { return x * y; }, fy_forward, F.at(index))
    );

    auto Fx_net = std::accumulate(Fx.begin(),Fx.end(),slp::Variable{0.0});
    auto Fy_net = std::accumulate(Fy.begin(),Fy.end(),slp::Variable{0.0});

    // Solve for net torque
    slp::Variable τ_net = 0.0;
    for (size_t module_index = 0; module_index < path.drivetrain.wheels.size();
         ++module_index) {
      const auto& translation = path.drivetrain.wheels.at(module_index);
      auto r = translation.rotate_by(θ_k);
      Translation2v F{Fx.at(module_index),
                      Fy.at(module_index)};

      τ_net += r.cross(F);
    }

    // could simulate roller friction here by adding a resistive term onto Fx_net for every module proportional to how fast rollers are moving.

    // Apply module power constraints
    auto v_wrt_robot = v_k.rotate_by(-θ_k);
    for (size_t module_index = 0; module_index < path.drivetrain.wheels.size();
         ++module_index) {
      const auto& translation = path.drivetrain.wheels.at(module_index);

      auto v_wheel_wrt_robot = 
        v_wrt_robot.x()*vx_inverse.at(module_index) +
        v_wrt_robot.y()*vy_inverse.at(module_index) +
        (translation.x()+translation.y())*ω_inverse.at(module_index);

      double max_wheel_velocity = path.drivetrain.wheel_radius *
                                  path.drivetrain.wheel_max_angular_velocity;

      // v² ≤ vₘₐₓ²
      problem.subject_to(v_wheel_wrt_robot * v_wheel_wrt_robot <=
                         max_wheel_velocity * max_wheel_velocity);

      Translation2v module_f{Fx.at(module_index),
                             Fy.at(module_index)};

      // τ = r x F
      // F = τ/r
      double max_wheel_force =
          path.drivetrain.wheel_max_torque / path.drivetrain.wheel_radius;

      // friction = μmg
      double max_friction_force =
          path.drivetrain.wheel_cof * path.drivetrain.mass / 4.0 * 9.8;

      double max_force = std::min(max_wheel_force, max_friction_force);

      // |F|₂² ≤ Fₘₐₓ²
      problem.subject_to(module_f.squared_norm() <= max_force * max_force);
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

    Pose2v pose_k{x.at(index), y.at(index), {cosθ.at(index), sinθ.at(index)}};
    Translation2v v_k{vx.at(index), vy.at(index)};
    auto ω_k = ω.at(index);
    Translation2v a_k{ax.at(index), ay.at(index)};
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
      Pose2v pose_k{x.at(index), y.at(index), {cosθ.at(index), sinθ.at(index)}};
      Translation2v v_k{vx.at(index), vy.at(index)};
      auto ω_k = ω.at(index);
      Translation2v a_k{ax.at(index), ay.at(index)};
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

std::expected<MecanumSolution, slp::ExitStatus>
MecanumTrajectoryGenerator::generate(bool diagnostics) {
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

void MecanumTrajectoryGenerator::apply_initial_guess(
    const MecanumSolution& solution) {
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

MecanumSolution MecanumTrajectoryGenerator::construct_swerve_solution() {
  auto get_value = [](auto& var) { return var.value(); };

  auto vector_value = [&](std::vector<slp::Variable>& row) {
    return row | std::views::transform(get_value) |
           std::ranges::to<std::vector>();
  };

  auto matrix_value = [&](std::vector<std::vector<slp::Variable>>& mat) {
    return mat | std::views::transform([&](auto& v) {
             return v | std::views::transform(get_value) |
                    std::ranges::to<std::vector>();
           }) |
           std::ranges::to<std::vector>();
  };

  return MecanumSolution{
      vector_value(dts),  vector_value(x),    vector_value(y),
      vector_value(cosθ), vector_value(sinθ), vector_value(vx),
      vector_value(vy),   vector_value(ω),    vector_value(ax),
      vector_value(ay),   vector_value(α),    matrix_value(F),
    };
}

}  // namespace trajopt
