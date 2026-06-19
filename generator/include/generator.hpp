#pragma once
#include <expected>
#include <print>
#include <ranges>
#include <type_traits>
#include <vector>

#include <choreo/project.hpp>
#include <choreo/trajectory.hpp>
#include <sleipnir/optimization/solver/exit_status.hpp>
#include <trajopt/geometry/pose2.hpp>
#include <trajopt/path/path_builder.hpp>

#include "segment.hpp"
#include "split_to_segments.hpp"

namespace choreo {
template <typename ChoreoSampleType, typename TrajoptSolutionType,
          typename TrajoptDrivetrainType, typename GeneratorType, typename TrajectoryType>
class TrajectoryGenerator {
  using Sample = ChoreoSampleType;
  using Builder = trajopt::PathBuilder<TrajoptDrivetrainType, TrajoptSolutionType>;

 public:
  // Owns projectFile and trajectoryFile;
  TrajectoryGenerator(choreo::ProjectFile& projectFile,
                      choreo::TrajectoryFile& trajectoryFile)
      : projectFile(std::move(projectFile)),
        trajectoryFile(std::move(trajectoryFile)) {
    segments = 
        convert_to_segments(this->trajectoryFile.params);

    for (size_t i = 0; i + 1 < segments.size(); ++i) {
      segments[i].update_start_intervals(this->trajectoryFile.params.target_dt.unit(),
                                         segments[i + 1],
                                         this->projectFile.config);
    }
    if constexpr (std::is_same_v<TrajoptDrivetrainType,
                                 trajopt::SwerveDrivetrain>) {
      generator.set_drivetrain(this->projectFile.config.to_swerve_drivetrain());
    } else if constexpr (
        std::is_same_v<TrajoptDrivetrainType,
                       trajopt::DifferentialDrivetrain>) {
      generator.set_drivetrain(
          this->projectFile.config.to_differential_drivetrain());
    }
    auto bumpers = this->projectFile.config.to_bumpers();
    generator.set_bumpers(bumpers);
    apply_waypoints();
    apply_constraints();
  }
  // TODO: temporary, eventually generate returns a modified TrajectoryFile
  std::expected<std::vector<ChoreoSampleType>, slp::ExitStatus> generate() {
    return generate_internal(); }
 private:
  choreo::ProjectFile projectFile;
  choreo::TrajectoryFile trajectoryFile;
  std::vector<choreo::Segment> segments;
  std::vector<choreo::Segment> only_waypoint_segments;
  Builder generator;
  void apply_constraints() {
    const auto& bumperSet = generator.get_bumpers();
    // Now that our segments list is reindexed to match TrajoptLib's counts, we
    // can apply the constraints
    for (int j = 0; j < only_waypoint_segments.size();
         j++) {  // only for waypoints with a segment after them.
      if (j < only_waypoint_segments.size() - 1) {
        for (const auto& constraint :
             only_waypoint_segments[j].segment_constraints) {
          generator.sgmt_constraint(
              j, j + 1,
              std::visit(
                  [&bumperSet](const auto& c) -> trajopt::Constraint {
                    return c.toTrajoptConstraint(bumperSet);
                  },
                  constraint));
        }
      }
      for (const auto& constraint :
           only_waypoint_segments[j].waypoint_constraints) {
        generator.wpt_constraint(
            j, std::visit(
                   [&bumperSet](const auto& c) -> trajopt::Constraint {
                     return c.toTrajoptConstraint(bumperSet);
                   },
                   constraint));
      }
    }
  }
  void apply_waypoints() {
    std::vector<trajopt::Pose2d> initial_guess_points;
    for (int i = 0; i < segments.size(); i++) {
      const auto& wpt = segments[i].start;
      if (!segments[i].coalesce_with_previous) {
        generator.sgmt_initial_guess_points(only_waypoint_segments.size(),
                                            initial_guess_points);
        initial_guess_points.clear();
        if (wpt.fix_translation && wpt.fix_heading) {
          generator.pose_wpt(only_waypoint_segments.size(), wpt.x.val.value(),
                             wpt.y.val.value(), wpt.heading.val.value());
        } else if (wpt.fix_translation && !wpt.fix_heading) {
          generator.translation_wpt(only_waypoint_segments.size(),
                                    wpt.x.val.value(), wpt.y.val.value());
        } else if (!wpt.fix_translation && wpt.fix_heading) {
        } else {
          generator.wpt_initial_guess_point(only_waypoint_segments.size(),
                                            wpt.toTrajoptPose2d());
        }
        only_waypoint_segments.push_back(segments[i]);
      } else {
        initial_guess_points.push_back(wpt.toTrajoptPose2d());
      }
    }
  }

  std::expected<std::vector<ChoreoSampleType>, slp::ExitStatus>
  generate_internal() {
    GeneratorType traj_generator{generator};
    auto solution = traj_generator.generate(true);
    if (!solution) {
      return std::unexpected(solution.error());
    }
    auto trajectory = TrajectoryType(solution.value());
    std::vector<ChoreoSampleType> samples;
    samples.reserve(trajectory.samples.size());
    for (const auto& sample : trajectory.samples) {
      samples.emplace_back(ChoreoSampleType(sample));
    }
    return samples;
  }
};
}  // namespace choreo