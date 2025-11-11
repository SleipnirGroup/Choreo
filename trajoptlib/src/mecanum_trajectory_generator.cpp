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

        auto soln = construct_mecanum_solution();
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

  // minimize total time
  const double s_init = 1.0 / std::sqrt(2.0);
  const double max_force =
      path.drivetrain.wheel_max_torque * 4 / path.drivetrain.wheel_radius * s_init;
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
      // use initial_guess and Ns to find the dx, dy, dθ between wpts
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

      const auto combined_time = std::max(
          calculate_trapezoidal_time(dist, max_linear_vel, max_accel),
          calculate_trapezoidal_time(dθ, max_ang_vel, max_ang_accel));
      const double sgmt_time = combined_time;

      for (size_t index = sgmt_start; index < sgmt_end + 1; ++index) {
        auto& dt = dts.at(index);
        problem.subject_to(dt >= 0);
        problem.subject_to(dt <= 3);
        dt.set_value(sgmt_time / N_sgmt);
      }
    }
  }
  slp::Variable<double> total_time = std::accumulate(dts.begin(), dts.end(), slp::Variable<double>{0.0});

  // Penalty: ∫(v²ω²)dt
  const double separation_penalty_weight = 0.0;
  slp::Variable<double> separation_penalty = 0.0;

  for (size_t index = 0; index < samp_tot; ++index) {
    auto v_trans_sq = vx.at(index) * vx.at(index) + vy.at(index) * vy.at(index);
    auto omega_sq = ω.at(index) * ω.at(index);
    separation_penalty += v_trans_sq * omega_sq * dts.at(index);
  }

  // Penalty: ∫ω²dt
  const double rotation_penalty_weight = 0.0; // todo
  slp::Variable<double> rotation_penalty = 0.0;
  for (size_t index = 0; index < samp_tot; ++index) {
    rotation_penalty += ω.at(index) * ω.at(index) * dts.at(index);
  }

  slp::Variable<double> cost = total_time;
  if (separation_penalty_weight > 0.0) {
    cost += separation_penalty_weight * separation_penalty;
  }
  if (rotation_penalty_weight > 0.0) {
    cost += rotation_penalty_weight * rotation_penalty;
  }
  problem.minimize(cost);

  // apply kinematics constraints
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

  const double s = 1.0 / std::sqrt(2.0);

  const double strafe_eff = path.drivetrain.strafe_efficiency;
  std::vector<double> fx_coeff = {s, s, s, s};
  std::vector<double> fy_coeff = {-s * strafe_eff, -s * strafe_eff, s * strafe_eff, s * strafe_eff};

  for (size_t index = 0; index < samp_tot; ++index) {
    Rotation2v<double> θ_k{cosθ.at(index), sinθ.at(index)};
    Translation2v<double> v_k{vx.at(index), vy.at(index)};

    std::vector<slp::Variable<double>> Fx_body;
    Fx_body.reserve(path.drivetrain.wheels.size());
    std::vector<slp::Variable<double>> Fy_body;
    Fy_body.reserve(path.drivetrain.wheels.size());

    for (size_t i = 0; i < path.drivetrain.wheels.size(); ++i) {
      Fx_body.push_back(fx_coeff[i] * F.at(index)[i]);
      Fy_body.push_back(fy_coeff[i] * F.at(index)[i]);
    }

    // sum forces to get net body force
    auto Fx_net = std::accumulate(Fx_body.begin(), Fx_body.end(), slp::Variable<double>{0.0});
    auto Fy_net = std::accumulate(Fy_body.begin(), Fy_body.end(), slp::Variable<double>{0.0});

    // solve for net torque
    slp::Variable<double> τ_net = 0.0;
    for (size_t module_index = 0; module_index < path.drivetrain.wheels.size();
         ++module_index) {
      const auto& wheel_pos = path.drivetrain.wheels.at(module_index);
      // force vector in body frame
      Translation2v<double> F_body{Fx_body.at(module_index), Fy_body.at(module_index)};

      // torque = r * F
      // computed in body frame: r_body * F_body
      τ_net += wheel_pos.cross(F_body);
    }

    // power constraint
    auto v_wrt_robot = v_k.rotate_by(-θ_k);
    for (size_t module_index = 0; module_index < path.drivetrain.wheels.size();
         ++module_index) {
      const auto& wheel_pos = path.drivetrain.wheels.at(module_index);

      double sign = (module_index == 2 || module_index == 3) ? 1.0 : -1.0;

      // v_active_trans = vx * cos(45°) - vy * sin(45°) * sign
      // = (vx - vy * sign) / sqrt(2)
      auto v_active_from_translation =
          (v_wrt_robot.x() - v_wrt_robot.y() * sign) * s;

      //   v_active_rot = v_rot_x*cos(45°) - v_rot_y*sin(45°)*sign
      //   = (-ω*y)*cos(45°) - (ω*x)*sin(45°)*sign
      //   = -ω*(y*cos(45°) + x*sin(45°)*sign)
      //   = -ω*(y + x*sign) / sqrt(2)
      auto v_active_from_rotation =
          -ω.at(index) * (wheel_pos.y() + wheel_pos.x() * sign) * s;

      auto v_wheel = v_active_from_translation + v_active_from_rotation;

      double max_wheel_velocity = path.drivetrain.wheel_radius *
                                  path.drivetrain.wheel_max_angular_velocity;

      // v^2 <= vmax^2
      problem.subject_to(v_wheel * v_wheel <=
                         max_wheel_velocity * max_wheel_velocity);

      double max_wheel_force =
          (path.drivetrain.wheel_max_torque / path.drivetrain.wheel_radius) * s;

      // static force constraint prevents wheel slip
      double normal_force_per_wheel = path.drivetrain.mass / 4.0 * 9.8;
      double static_friction_coef = (path.drivetrain.static_friction_coefficient > 0.0)
          ? path.drivetrain.static_friction_coefficient
          : path.drivetrain.wheel_cof * 1.2;
      double max_static_friction_force = static_friction_coef * normal_force_per_wheel;

      // max force is limited by motor torque & static friction
      double max_force = std::min(max_wheel_force, max_static_friction_force);

      auto f = F.at(index).at(module_index);

      // |F|₂² <= Fₘₐₓ²
      problem.subject_to(f * f <= max_force * max_force);
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

    Pose2v<double> pose_k{x.at(index), y.at(index), {cosθ.at(index), sinθ.at(index)}};
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
      Pose2v<double> pose_k{x.at(index), y.at(index), {cosθ.at(index), sinθ.at(index)}};
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

std::expected<MecanumSolution, slp::ExitStatus>
MecanumTrajectoryGenerator::generate(bool diagnostics) {
  get_cancellation_flag() = 0;

  // tolerance of 1e-4 is 0.1 mm
  auto status = problem.solve({.tolerance = 1e-4, .diagnostics = diagnostics});

  if (static_cast<int>(status) < 0 ||
      status == slp::ExitStatus::CALLBACK_REQUESTED_STOP) {
    return std::unexpected{status};
  } else {
    return construct_mecanum_solution();
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

MecanumSolution MecanumTrajectoryGenerator::construct_mecanum_solution() {
  auto get_value = [](auto& var) { return var.value(); };

  auto vector_value = [&](std::vector<slp::Variable<double>>& row) {
    return row | std::views::transform(get_value) |
           std::ranges::to<std::vector>();
  };

  auto matrix_value = [&](std::vector<std::vector<slp::Variable<double>>>& mat) {
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
