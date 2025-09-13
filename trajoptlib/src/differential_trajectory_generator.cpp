// Copyright (c) TrajoptLib contributors

#include "trajopt/differential_trajectory_generator.hpp"

#include <algorithm>
#include <cmath>
#include <ranges>
#include <vector>

#include <sleipnir/autodiff/variable.hpp>
#include <sleipnir/optimization/solver/exit_status.hpp>

#include "trajopt/geometry/rotation2.hpp"
#include "trajopt/geometry/translation2.hpp"
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

inline Translation2d wheel_to_chassis_speeds(double vl, double vr) {
  return Translation2d{(vl + vr) / 2, 0.0};
}

inline Translation2v wheel_to_chassis_speeds(slp::Variable vl,
                                             slp::Variable vr) {
  return Translation2v{(vl + vr) / 2, 0.0};
}

DifferentialTrajectoryGenerator::DifferentialTrajectoryGenerator(
    DifferentialPathBuilder path_builder, int64_t handle)
    : path(path_builder.get_path()),
      Ns(path_builder.get_control_interval_counts()) {
  // See equations just before (12.35) and (12.36) in
  // https://controls-in-frc.link/ for wheel acceleration equations.
  //
  //   dx/dt = v cosθ
  //   dy/dt = v sinθ
  //   dθ/dt = ω
  //   dvₗ/dt = (1/m + r_b²/J) Fₗ + (1/m - r_b²/J) Fᵣ
  //   dvᵣ/dt = (1/m - r_b²/J) Fₗ + (1/m + r_b²/J) Fᵣ
  //
  // where
  //
  //   v = (vₗ + vᵣ) / 2
  //   ω = (vᵣ - vₗ) / (2r_b)

  auto f = [this](const slp::VariableMatrix& x,
                  const slp::VariableMatrix& u) -> slp::VariableMatrix {
    slp::VariableMatrix xdot{5};

    const auto& m = path.drivetrain.mass;
    double r_b = path.drivetrain.trackwidth / 2;
    const auto& J = path.drivetrain.moi;

    Eigen::Matrix<double, 2, 2> B{
        {1.0 / m + r_b * r_b / J, 1.0 / m - r_b * r_b / J},
        {1.0 / m - r_b * r_b / J, 1.0 / m + r_b * r_b / J}};

    auto v = (x[3] + x[4]) / 2.0;
    xdot[0] = v * cos(x[2]);  // NOLINT
    xdot[1] = v * sin(x[2]);  // NOLINT
    xdot[2] = (x[4] - x[3]) / path.drivetrain.trackwidth;
    xdot.segment(3, 2) = B * u;

    return xdot;
  };

  auto initial_guess = path_builder.calculate_spline_initial_guess();

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

        auto soln = construct_differential_solution();
        for (auto& callback : this->path.callbacks) {
          callback(soln, handle);
        }

        return trajopt::get_cancellation_flag();
      });

  size_t wpt_cnt = path.waypoints.size();
  size_t sgmt_cnt = path.waypoints.size() - 1;
  size_t samp_tot = get_index(Ns, wpt_cnt - 1, 0) + 1;

  x.reserve(samp_tot);
  y.reserve(samp_tot);
  θ.reserve(samp_tot);
  vl.reserve(samp_tot);
  vr.reserve(samp_tot);
  al.reserve(samp_tot);
  ar.reserve(samp_tot);

  Fl.reserve(samp_tot);
  Fr.reserve(samp_tot);

  dts.reserve(samp_tot);

  for (size_t index = 0; index < samp_tot; ++index) {
    x.emplace_back(problem.decision_variable());
    y.emplace_back(problem.decision_variable());
    θ.emplace_back(problem.decision_variable());
    vl.emplace_back(problem.decision_variable());
    vr.emplace_back(problem.decision_variable());
    al.emplace_back(problem.decision_variable());
    ar.emplace_back(problem.decision_variable());

    Fl.emplace_back(problem.decision_variable());
    Fr.emplace_back(problem.decision_variable());

    dts.emplace_back(problem.decision_variable());
  }

  // Minimize total time
  const double max_force =
      path.drivetrain.wheel_max_torque * 2 / path.drivetrain.wheel_radius;
  const auto max_accel = max_force / path.drivetrain.mass;
  const double max_drivetrain_velocity =
      path.drivetrain.wheel_radius * path.drivetrain.wheel_max_angular_velocity;
  const auto max_ang_vel =
      max_drivetrain_velocity * 2 / path.drivetrain.trackwidth;
  const auto max_ang_accel = max_accel * 2 / path.drivetrain.trackwidth;
  for (size_t sgmt_index = 0; sgmt_index < Ns.size(); ++sgmt_index) {
    auto N_sgmt = Ns.at(sgmt_index);
    const auto sgmt_start = get_index(Ns, sgmt_index);
    const auto sgmt_end = get_index(Ns, sgmt_index + 1);

    if (N_sgmt == 0) {
      for (size_t index = sgmt_start; index < sgmt_end + 1; ++index) {
        dts.at(index).set_value(0.0);
      }
    } else {
      // Use initialGuess and Ns to find the dx, dy, dθ between wpts
      const auto dx =
          initial_guess.x.at(sgmt_end) - initial_guess.x.at(sgmt_start);
      const auto dy =
          initial_guess.y.at(sgmt_end) - initial_guess.y.at(sgmt_start);
      const auto dist = std::hypot(dx, dy);
      const auto θ_0 = initial_guess.heading.at(sgmt_start);
      const auto θ_1 = initial_guess.heading.at(sgmt_end);
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

  // Apply dynamics constraints
  for (size_t wpt_index = 0; wpt_index < wpt_cnt - 1; ++wpt_index) {
    size_t N_sgmt = Ns.at(wpt_index);

    for (size_t sample_index = 0; sample_index < N_sgmt; ++sample_index) {
      size_t index = get_index(Ns, wpt_index, sample_index);

      slp::VariableMatrix x_k{{x.at(index)},
                              {y.at(index)},
                              {θ.at(index)},
                              {vl.at(index)},
                              {vr.at(index)}};
      slp::VariableMatrix u_k{{Fl.at(index)}, {Fr.at(index)}};

      slp::VariableMatrix x_k_1{{x.at(index + 1)},
                                {y.at(index + 1)},
                                {θ.at(index + 1)},
                                {vl.at(index + 1)},
                                {vr.at(index + 1)}};
      slp::VariableMatrix u_k_1{{Fl.at(index + 1)}, {Fr.at(index + 1)}};

      auto dt_k = dts.at(index);
      if (sample_index < N_sgmt - 1) {
        auto dt_k_1 = dts.at(index + 1);
        problem.subject_to(dt_k_1 == dt_k);
      }

      // Dynamics constraints - direct collocation
      // (https://mec560sbu.github.io/2016/09/30/direct_collocation/)
      auto xdot_k = f(x_k, u_k);
      auto xdot_k_1 = f(x_k_1, u_k_1);
      auto xdot_c =
          -3 / (2 * dt_k) * (x_k - x_k_1) - 0.25 * (xdot_k + xdot_k_1);

      auto x_c = 0.5 * (x_k + x_k_1) + dt_k / 8 * (xdot_k - xdot_k_1);
      auto u_c = 0.5 * (u_k + u_k_1);

      problem.subject_to(xdot_c == f(x_c, u_c));

      problem.subject_to(al.at(index) == xdot_k[3]);
      problem.subject_to(ar.at(index) == xdot_k[4]);
    }
  }

  // Apply wheel power constraints
  for (size_t index = 0; index < samp_tot; ++index) {
    double max_wheel_velocity = path.drivetrain.wheel_radius *
                                path.drivetrain.wheel_max_angular_velocity;

    // −vₘₐₓ < vₗ < vₘₐₓ
    problem.subject_to(-max_wheel_velocity < vl.at(index));
    problem.subject_to(vl.at(index) < max_wheel_velocity);

    // −vₘₐₓ < vᵣ < vₘₐₓ
    problem.subject_to(-max_wheel_velocity < vr.at(index));
    problem.subject_to(vr.at(index) < max_wheel_velocity);

    // τ = r x F
    // F = τ/r
    double max_wheel_force =
        path.drivetrain.wheel_max_torque / path.drivetrain.wheel_radius;

    // friction = μmg
    double max_friction_force =
        path.drivetrain.wheel_cof * path.drivetrain.mass * 9.8;

    double max_force = std::min(max_wheel_force, max_friction_force);

    // −Fₘₐₓ < Fₗ < Fₘₐₓ
    problem.subject_to(-max_force < Fl.at(index));
    problem.subject_to(Fl.at(index) < max_force);

    // −Fₘₐₓ < Fᵣ < Fₘₐₓ
    problem.subject_to(-max_force < Fr.at(index));
    problem.subject_to(Fr.at(index) < max_force);
  }

  for (size_t wpt_index = 0; wpt_index < wpt_cnt; ++wpt_index) {
    // First index of next wpt - 1
    size_t index = get_index(Ns, wpt_index, 0);

    Pose2v pose_k{x.at(index), y.at(index), {θ.at(index)}};
    Translation2v v_k = wheel_to_chassis_speeds(vl.at(index), vr.at(index));
    auto ω_k = (vr.at(index) - vl.at(index)) / path.drivetrain.trackwidth;
    Translation2v a_k = wheel_to_chassis_speeds(al.at(index), ar.at(index));
    auto α_k = (ar.at(index) - al.at(index)) / path.drivetrain.trackwidth;

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
      Pose2v pose_k{x.at(index), y.at(index), {θ.at(index)}};
      Translation2v v_k = wheel_to_chassis_speeds(vl.at(index), vr.at(index));
      auto ω_k = (vr.at(index) - vl.at(index)) / path.drivetrain.trackwidth;
      Translation2v a_k = wheel_to_chassis_speeds(al.at(index), ar.at(index));
      auto α_k = (ar.at(index) - al.at(index)) / path.drivetrain.trackwidth;

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

std::expected<DifferentialSolution, slp::ExitStatus>
DifferentialTrajectoryGenerator::generate(bool diagnostics) {
  get_cancellation_flag() = 0;

  // tolerance of 1e-4 is 0.1 mm
  auto status = problem.solve({.tolerance = 1e-4, .diagnostics = diagnostics});

  if (static_cast<int>(status) < 0 ||
      status == slp::ExitStatus::CALLBACK_REQUESTED_STOP) {
    return std::unexpected{status};
  } else {
    return construct_differential_solution();
  }
}

void DifferentialTrajectoryGenerator::apply_initial_guess(
    const DifferentialSolution& solution) {
  size_t sample_total = x.size();
  for (size_t sample_index = 0; sample_index < sample_total; ++sample_index) {
    x[sample_index].set_value(solution.x[sample_index]);
    y[sample_index].set_value(solution.y[sample_index]);
    θ[sample_index].set_value(solution.heading[sample_index]);
  }

  vl[0].set_value(0.0);
  vr[0].set_value(0.0);
  al[0].set_value(0.0);
  ar[0].set_value(0.0);

  for (size_t sample_index = 1; sample_index < sample_total; ++sample_index) {
    double linear_velocity =
        std::hypot(solution.x[sample_index] - solution.x[sample_index - 1],
                   solution.y[sample_index] - solution.y[sample_index - 1]) /
        solution.dt[sample_index];
    double heading = solution.heading[sample_index];
    double last_heading = solution.heading[sample_index - 1];

    double ω =
        Rotation2d{heading}.rotate_by(-Rotation2d{last_heading}).radians() /
        solution.dt[sample_index];
    vl[sample_index].set_value(
        (linear_velocity - path.drivetrain.trackwidth / 2 * ω));
    vr[sample_index].set_value(
        (linear_velocity + path.drivetrain.trackwidth / 2 * ω));
    al[sample_index].set_value(
        (vl[sample_index].value() - vl[sample_index - 1].value()) /
        solution.dt[sample_index]);
    ar[sample_index].set_value(
        (vr[sample_index].value() - vr[sample_index - 1].value()) /
        solution.dt[sample_index]);
  }
}

DifferentialSolution
DifferentialTrajectoryGenerator::construct_differential_solution() {
  auto get_value = [](auto& var) { return var.value(); };

  auto vector_value = [&](std::vector<slp::Variable>& row) {
    return row | std::views::transform(get_value) |
           std::ranges::to<std::vector>();
  };
  const auto& trackwidth = path.drivetrain.trackwidth;
  std::vector<double> ω;
  for (size_t sample = 0; sample < vl.size(); ++sample) {
    ω.push_back((vr.at(sample).value() - vl.at(sample).value()) / trackwidth);
  }
  std::vector<double> α;
  for (size_t sample = 0; sample < al.size(); ++sample) {
    α.push_back((ar.at(sample).value() - al.at(sample).value()) / trackwidth);
  }
  return DifferentialSolution{
      vector_value(dts),
      vector_value(x),
      vector_value(y),
      vector_value(θ),
      vector_value(vl),
      vector_value(vr),
      ω,
      vector_value(al),
      vector_value(ar),
      α,
      vector_value(Fl),
      vector_value(Fr),
  };
}

}  // namespace trajopt
