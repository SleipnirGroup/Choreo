#![deny(missing_docs)]
#![doc = include_str!("../README.md")]

// cxx generates `Clone` impls for the FFI structs below; nightly clippy flags
// the derive-expanded field copies as `clone_on_copy` false positives.
#[allow(clippy::clone_on_copy)]
#[cxx::bridge(namespace = "trajopt::rsffi")]
mod ffi {
    #[derive(Debug, Deserialize, Serialize, Clone)]
    /// Represents a translation in 2D space.
    struct Translation2d {
        /// The x component of the translation.
        x: f64,
        /// The y component of the translation.
        y: f64,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    /// Represents a 2D pose with translation and rotation.
    struct Pose2d {
        /// The x component of the translational component of the pose.
        x: f64,
        /// The y component of the translational component of the pose.
        y: f64,
        /// The rotational component of the pose.
        heading: f64,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    /// A swerve drivetrain physical model.
    struct SwerveDrivetrain {
        /// The mass of the robot (kg).
        mass: f64,
        /// The moment of inertia of the robot about the origin (kg−m²).
        moi: f64,
        /// Radius of the wheels (m).
        wheel_radius: f64,
        /// Maximum angular velocity of each wheel (rad/s).
        wheel_max_angular_velocity: f64,
        /// Maximum torque applied to each wheel (N−m).
        wheel_max_torque: f64,
        /// The Coefficient of Friction (CoF) of the wheels.
        wheel_cof: f64,
        /// Translation of each swerve module from the origin of the robot
        /// coordinate system to the center of the module (m). There's
        /// usually one in each corner.
        modules: Vec<Translation2d>,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    /// Swerve trajectory sample.
    struct SwerveTrajectorySample {
        /// The timestamp.
        timestamp: f64,
        /// The x coordinate.
        x: f64,
        /// The y coordinate.
        y: f64,
        /// The heading.
        heading: f64,
        /// The velocity's x component.
        velocity_x: f64,
        /// The velocity's y component.
        velocity_y: f64,
        /// The angular velocity.
        angular_velocity: f64,
        /// The acceleration's x component.
        acceleration_x: f64,
        /// The acceleration's y component.
        acceleration_y: f64,
        /// The angular acceleration.
        angular_acceleration: f64,
        /// The force on each module in the X direction.
        module_forces_x: Vec<f64>,
        /// The force on each module in the Y direction.
        module_forces_y: Vec<f64>,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    /// Swerve trajectory.
    struct SwerveTrajectory {
        /// The samples that make up the trajectory.
        samples: Vec<SwerveTrajectorySample>,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    /// A differential drivetrain physical model.
    struct DifferentialDrivetrain {
        /// The mass of the robot (kg).
        mass: f64,
        /// The moment of inertia of the robot about the origin (kg−m²).
        moi: f64,
        /// Radius of the wheels (m).
        wheel_radius: f64,
        /// Maximum angular velocity of the wheels (rad/s).
        wheel_max_angular_velocity: f64,
        /// Maximum torque applied to the wheels (N−m).
        wheel_max_torque: f64,
        /// The Coefficient of Friction (CoF) of the wheels.
        wheel_cof: f64,
        /// Distance between the two driverails (m).
        trackwidth: f64,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    /// Differential trajectory sample.
    struct DifferentialTrajectorySample {
        /// The timestamp.
        timestamp: f64,
        /// The x coordinate.
        x: f64,
        /// The y coordinate.
        y: f64,
        /// The heading.
        heading: f64,
        /// The left wheel's velocity.
        velocity_l: f64,
        /// The right wheel's velocity.
        velocity_r: f64,
        /// The chassis angular velocity.
        angular_velocity: f64,
        /// The left wheel's acceleration.
        acceleration_l: f64,
        /// The right wheel's acceleration.
        acceleration_r: f64,
        /// The chassis angular acceleration.
        angular_acceleration: f64,
        /// The left wheel's force.
        force_l: f64,
        /// The right wheel's force.
        force_r: f64,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    /// Differential trajectory.
    struct DifferentialTrajectory {
        /// The samples that make up the trajectory.
        samples: Vec<DifferentialTrajectorySample>,
    }

    unsafe extern "C++" {
        include!("rust_ffi.hpp");

        type SwerveTrajectoryGenerator;

        fn swerve_trajectory_generator_new() -> UniquePtr<SwerveTrajectoryGenerator>;

        fn set_drivetrain(self: Pin<&mut SwerveTrajectoryGenerator>, drivetrain: &SwerveDrivetrain);

        fn set_bumpers(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            front: f64,
            left: f64,
            right: f64,
            back: f64,
        );

        fn set_control_interval_counts(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            counts: Vec<usize>,
        );

        // Pose constraints

        fn pose_wpt(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            index: usize,
            x: f64,
            y: f64,
            heading: f64,
        );

        fn translation_wpt(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            index: usize,
            x: f64,
            y: f64,
            heading_guess: f64,
        );

        fn empty_wpt(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            index: usize,
            x_guess: f64,
            y_guess: f64,
            heading_guess: f64,
        );

        // Segment initial guess points setter

        fn sgmt_initial_guess_points(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            from_index: usize,
            guess_points: &Vec<Pose2d>,
        );

        // Constraints with waypoint scope

        fn wpt_linear_velocity_direction(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            index: usize,
            angle: f64,
        );

        fn wpt_linear_velocity_max_magnitude(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            index: usize,
            magnitude: f64,
        );

        fn wpt_angular_velocity_max_magnitude(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            index: usize,
            magnitude: f64,
        );

        fn wpt_linear_acceleration_max_magnitude(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            index: usize,
            magnitude: f64,
        );

        fn wpt_point_at(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            index: usize,
            field_point_x: f64,
            field_point_y: f64,
            heading_tolerance: f64,
            point_away: bool,
        );

        fn wpt_keep_in_circle(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            index: usize,
            center_x: f64,
            center_y: f64,
            radius: f64,
        );

        fn wpt_keep_in_polygon(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            index: usize,
            field_points_x: Vec<f64>,
            field_points_y: Vec<f64>,
        );

        fn wpt_keep_in_lane(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            index: usize,
            center_line_start_x: f64,
            center_line_start_y: f64,
            center_line_end_x: f64,
            center_line_end_y: f64,
            tolerance: f64,
        );

        fn wpt_keep_out_circle(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            index: usize,
            center_x: f64,
            center_y: f64,
            radius: f64,
        );

        // Constraints with segment scope

        fn sgmt_linear_velocity_direction(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            angle: f64,
        );

        fn sgmt_linear_velocity_max_magnitude(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            magnitude: f64,
        );

        fn sgmt_angular_velocity_max_magnitude(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            angular_velocity: f64,
        );

        fn sgmt_linear_acceleration_max_magnitude(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            magnitude: f64,
        );

        fn sgmt_point_at(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            field_point_x: f64,
            field_point_y: f64,
            heading_tolerance: f64,
            point_away: bool,
        );

        fn sgmt_keep_in_circle(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            center_x: f64,
            center_y: f64,
            radius: f64,
        );

        fn sgmt_keep_in_polygon(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            field_points_x: Vec<f64>,
            field_points_y: Vec<f64>,
        );

        #[allow(clippy::too_many_arguments)]
        fn sgmt_keep_in_lane(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            center_line_start_x: f64,
            center_line_start_y: f64,
            center_line_end_x: f64,
            center_line_end_y: f64,
            tolerance: f64,
        );

        fn sgmt_keep_out_circle(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            center_x: f64,
            center_y: f64,
            radius: f64,
        );

        // Trajectory generator functions

        fn add_callback(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            callback: fn(SwerveTrajectory, i64),
        );

        fn generate(
            self: &SwerveTrajectoryGenerator,
            diagnostics: bool,
            uuid: i64,
        ) -> Result<SwerveTrajectory>;

        type DifferentialTrajectoryGenerator;

        fn differential_trajectory_generator_new() -> UniquePtr<DifferentialTrajectoryGenerator>;

        fn set_drivetrain(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            drivetrain: &DifferentialDrivetrain,
        );

        fn set_bumpers(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            front: f64,
            left: f64,
            right: f64,
            back: f64,
        );

        fn set_control_interval_counts(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            counts: Vec<usize>,
        );

        // Pose constraints

        fn pose_wpt(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            index: usize,
            x: f64,
            y: f64,
            heading: f64,
        );

        fn translation_wpt(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            index: usize,
            x: f64,
            y: f64,
            heading_guess: f64,
        );

        fn empty_wpt(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            index: usize,
            x_guess: f64,
            y_guess: f64,
            heading_guess: f64,
        );

        // Segment initial guess points setter

        fn sgmt_initial_guess_points(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            from_index: usize,
            guess_points: &Vec<Pose2d>,
        );

        // Constraints with waypoint scope

        fn wpt_linear_velocity_direction(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            index: usize,
            angle: f64,
        );

        fn wpt_linear_velocity_max_magnitude(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            index: usize,
            magnitude: f64,
        );

        fn wpt_angular_velocity_max_magnitude(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            index: usize,
            angular_velocity: f64,
        );

        fn wpt_linear_acceleration_max_magnitude(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            index: usize,
            magnitude: f64,
        );

        fn wpt_point_at(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            index: usize,
            field_point_x: f64,
            field_point_y: f64,
            heading_tolerance: f64,
            point_away: bool,
        );

        fn wpt_keep_in_circle(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            index: usize,
            center_x: f64,
            center_y: f64,
            radius: f64,
        );

        fn wpt_keep_in_polygon(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            index: usize,
            field_points_x: Vec<f64>,
            field_points_y: Vec<f64>,
        );

        fn wpt_keep_in_lane(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            index: usize,
            center_line_start_x: f64,
            center_line_start_y: f64,
            center_line_end_x: f64,
            center_line_end_y: f64,
            tolerance: f64,
        );

        fn wpt_keep_out_circle(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            index: usize,
            center_x: f64,
            center_y: f64,
            radius: f64,
        );

        // Constraints with waypoint scope

        fn sgmt_linear_velocity_direction(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            angle: f64,
        );

        fn sgmt_linear_velocity_max_magnitude(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            magnitude: f64,
        );

        fn sgmt_angular_velocity_max_magnitude(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            angular_velocity: f64,
        );

        fn sgmt_linear_acceleration_max_magnitude(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            magnitude: f64,
        );

        fn sgmt_keep_in_circle(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            center_x: f64,
            center_y: f64,
            radius: f64,
        );

        fn sgmt_keep_in_polygon(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            field_points_x: Vec<f64>,
            field_points_y: Vec<f64>,
        );

        #[allow(clippy::too_many_arguments)]
        fn sgmt_keep_in_lane(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            center_line_start_x: f64,
            center_line_start_y: f64,
            center_line_end_x: f64,
            center_line_end_y: f64,
            tolerance: f64,
        );

        fn sgmt_keep_out_circle(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            center_x: f64,
            center_y: f64,
            radius: f64,
        );

        // Trajectory generator

        fn add_callback(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            callback: fn(DifferentialTrajectory, i64),
        );

        fn generate(
            self: &DifferentialTrajectoryGenerator,
            diagnostics: bool,
            uuid: i64,
        ) -> Result<DifferentialTrajectory>;

        // Cancel all generators

        fn cancel_all();
    }
}

/// This trajectory generator class contains functions to generate
/// time-optimal trajectories for several drivetrain types.
pub struct SwerveTrajectoryGenerator {
    generator: cxx::UniquePtr<crate::ffi::SwerveTrajectoryGenerator>,
}

impl Default for SwerveTrajectoryGenerator {
    fn default() -> Self {
        Self::new()
    }
}

impl SwerveTrajectoryGenerator {
    /// Constructs a new swerve trajectory optimization problem.
    pub fn new() -> SwerveTrajectoryGenerator {
        SwerveTrajectoryGenerator {
            generator: crate::ffi::swerve_trajectory_generator_new(),
        }
    }

    /// Sets the Drivetrain object.
    ///
    /// * `drivetrain` - The drivetrain.
    pub fn set_drivetrain(&mut self, drivetrain: &crate::ffi::SwerveDrivetrain) {
        crate::ffi::SwerveTrajectoryGenerator::set_drivetrain(self.generator.pin_mut(), drivetrain);
    }

    /// Adds a rectangular bumper to a list used when applying
    /// keep-out constraints.
    ///
    /// * `front` - Distance in meters from center to front bumper edge.
    /// * `left` - Distance in meters from center to left bumper edge.
    /// * `right` - Distance in meters from center to right bumper edge.
    /// * `back` - Distance in meters from center to back bumper edge.
    pub fn set_bumpers(&mut self, front: f64, left: f64, right: f64, back: f64) {
        crate::ffi::SwerveTrajectoryGenerator::set_bumpers(
            self.generator.pin_mut(),
            front,
            left,
            right,
            back,
        );
    }

    /// Sets the number of discrete samples for each trajectory segment.
    ///
    /// * `counts` - The sequence of control interval counts per segment. Length
    ///   is number of waypoints - 1.
    pub fn set_control_interval_counts(&mut self, counts: Vec<usize>) {
        crate::ffi::SwerveTrajectoryGenerator::set_control_interval_counts(
            self.generator.pin_mut(),
            counts,
        );
    }

    // Pose constraints

    /// Applies a pose constraint to a waypoint, and adds an initial guess with
    /// the same pose.
    ///
    /// * `index` - The waypoint's index.
    /// * `x` - The x.
    /// * `y` - The y.
    /// * `heading` - The heading.
    pub fn pose_wpt(&mut self, index: usize, x: f64, y: f64, heading: f64) {
        crate::ffi::SwerveTrajectoryGenerator::pose_wpt(
            self.generator.pin_mut(),
            index,
            x,
            y,
            heading,
        );
    }

    /// Applies a translation constraint to a waypoint, and adds an initial
    /// guess point with the same translation.
    ///
    /// * `index` - The waypoint's index.
    /// * `x` - The x.
    /// * `y` - The y.
    /// * `heading_guess` - The heading initial guess.
    pub fn translation_wpt(&mut self, index: usize, x: f64, y: f64, heading_guess: f64) {
        crate::ffi::SwerveTrajectoryGenerator::translation_wpt(
            self.generator.pin_mut(),
            index,
            x,
            y,
            heading_guess,
        );
    }

    /// Sets a waypoint's pose initial guess.
    ///
    /// * `index` - The waypoint's index.
    /// * `x_guess` - The x initial guess.
    /// * `y_guess` - The y initial guess.
    /// * `heading_guess` - The heading initial guess.
    pub fn empty_wpt(&mut self, index: usize, x_guess: f64, y_guess: f64, heading_guess: f64) {
        crate::ffi::SwerveTrajectoryGenerator::empty_wpt(
            self.generator.pin_mut(),
            index,
            x_guess,
            y_guess,
            heading_guess,
        );
    }

    // Segment initial guess points setter

    /// Adds a sequence of initial guess points between two waypoints.
    ///
    /// The points are inserted between the waypoints at fromIndex and
    /// fromIndex + 1. Linear interpolation between the waypoint initial guess
    /// points and these segment initial guess points is used as the initial
    /// guess of the robot's pose over the trajectory.
    ///
    /// * `from_index` - The index of the waypoint the initial guess point comes
    ///   after.
    /// * `guess_points` - The sequence of initial guess points.
    pub fn sgmt_initial_guess_points(
        &mut self,
        from_index: usize,
        guess_points: &Vec<crate::ffi::Pose2d>,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::sgmt_initial_guess_points(
            self.generator.pin_mut(),
            from_index,
            guess_points,
        );
    }

    // Constraints with waypoint scope

    /// Applies a linear velocity direction constraint to a waypoint.
    ///
    /// * `index` - The waypoint's index.
    /// * `angle` - The angle in radians.
    pub fn wpt_linear_velocity_direction(&mut self, index: usize, angle: f64) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_linear_velocity_direction(
            self.generator.pin_mut(),
            index,
            angle,
        );
    }

    /// Applies a linear velocity max magnitude constraint to a waypoint.
    ///
    /// * `index` - The waypoint's index.
    /// * `magnitude` - The magnitude.
    pub fn wpt_linear_velocity_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_linear_velocity_max_magnitude(
            self.generator.pin_mut(),
            index,
            magnitude,
        );
    }

    /// Applies an angular velocity max magnitude constraint to a waypoint.
    ///
    /// * `index` - The waypoint's index.
    /// * `magnitude` - The magnitude.
    pub fn wpt_angular_velocity_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_angular_velocity_max_magnitude(
            self.generator.pin_mut(),
            index,
            magnitude,
        );
    }

    /// Applies a linear acceleration max magnitude constraint to a waypoint.
    ///
    /// * `index` - The waypoint's index.
    /// * `magnitude` - The magnitude.
    pub fn wpt_linear_acceleration_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_linear_acceleration_max_magnitude(
            self.generator.pin_mut(),
            index,
            magnitude,
        );
    }

    /// Applies a point-at constraint to a waypoint.
    ///
    /// * `index` - The waypoint's index.
    /// * `field_point_x` - The x coordinate of the field point to point at.
    /// * `field_point_y` - The y coordinate of the field point to point at.
    /// * `heading_tolerance` - The heading tolerance.
    /// * `point_away` - Whether to point away from the field point.
    pub fn wpt_point_at(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        heading_tolerance: f64,
        point_away: bool,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_point_at(
            self.generator.pin_mut(),
            index,
            field_point_x,
            field_point_y,
            heading_tolerance,
            point_away,
        )
    }

    /// Applies a keep-in circle constraint to a waypoint.
    ///
    /// Applies to the robot bumpers.
    ///
    /// * `index` - The waypoint's index.
    /// * `center_x` - The x coordinate of the circle's center.
    /// * `center_y` - The y coordinate of the circle's center.
    /// * `radius` - The circle's radius.
    pub fn wpt_keep_in_circle(&mut self, index: usize, center_x: f64, center_y: f64, radius: f64) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_keep_in_circle(
            self.generator.pin_mut(),
            index,
            center_x,
            center_y,
            radius,
        )
    }

    /// Applies a keep-in polygon constraint to a waypoint.
    ///
    /// Applies to the robot bumpers.
    ///
    /// * `index` - The waypoint's index.
    /// * `field_points_x` - The x coordinates of the points defining the
    ///   keep-in polygon (must wind counterclockwise).
    /// * `field_points_y` - The x coordinates of the points defining the
    ///   keep-in polygon (must wind counterclockwise).
    pub fn wpt_keep_in_polygon(
        &mut self,
        index: usize,
        field_points_x: Vec<f64>,
        field_points_y: Vec<f64>,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_keep_in_polygon(
            self.generator.pin_mut(),
            index,
            field_points_x,
            field_points_y,
        );
    }

    /// Applies a keep-in lane constraint to a waypoint.
    ///
    /// Applies to the robot center.
    ///
    /// * `index` - The waypoint's index.
    /// * `center_line_start_x` - The x coordinate of the center line's start
    ///   point.
    /// * `center_line_start_y` - The y coordinate of the center line's start
    ///   point.
    /// * `center_line_end_x` - The x coordinate of the center line's end point.
    /// * `center_line_end_y` - The x coordinate of the center line's end point.
    /// * `tolerance` - The distance from the center line to each lane edge.
    pub fn wpt_keep_in_lane(
        &mut self,
        index: usize,
        center_line_start_x: f64,
        center_line_start_y: f64,
        center_line_end_x: f64,
        center_line_end_y: f64,
        tolerance: f64,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_keep_in_lane(
            self.generator.pin_mut(),
            index,
            center_line_start_x,
            center_line_start_y,
            center_line_end_x,
            center_line_end_y,
            tolerance,
        );
    }

    /// Applies a keep-out circle constraint to a waypoint.
    ///
    /// Applies to the robot bumpers.
    ///
    /// * `index` - The waypoint's index.
    /// * `center_x` - The x coordinate of the circle's center.
    /// * `center_y` - The y coordinate of the circle's center.
    /// * `radius` - The circle's radius.
    pub fn wpt_keep_out_circle(&mut self, index: usize, center_x: f64, center_y: f64, radius: f64) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_keep_out_circle(
            self.generator.pin_mut(),
            index,
            center_x,
            center_y,
            radius,
        )
    }

    // Constraints with segment scope

    /// Applies a linear velocity direction constraint between two waypoints.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `angle` - The angle in radians.
    pub fn sgmt_linear_velocity_direction(
        &mut self,
        from_index: usize,
        to_index: usize,
        angle: f64,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::sgmt_linear_velocity_direction(
            self.generator.pin_mut(),
            from_index,
            to_index,
            angle,
        );
    }

    /// Applies a linear velocity max magnitude constraint between two
    /// waypoints.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `magnitude` - The magnitude.
    pub fn sgmt_linear_velocity_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        magnitude: f64,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::sgmt_linear_velocity_max_magnitude(
            self.generator.pin_mut(),
            from_index,
            to_index,
            magnitude,
        );
    }

    /// Applies an angular velocity max magnitude constraint between two
    /// waypoints.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `magnitude` - The magnitude.
    pub fn sgmt_angular_velocity_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        magnitude: f64,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::sgmt_angular_velocity_max_magnitude(
            self.generator.pin_mut(),
            from_index,
            to_index,
            magnitude,
        );
    }

    /// Applies a linear acceleration max magnitude constraint between two
    /// waypoints.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `magnitude` - The magnitude.
    pub fn sgmt_linear_acceleration_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        magnitude: f64,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::sgmt_linear_acceleration_max_magnitude(
            self.generator.pin_mut(),
            from_index,
            to_index,
            magnitude,
        );
    }

    /// Applies a point-at constraint between two waypoints.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `field_point_x` - The x coordinate of the field point to point at.
    /// * `field_point_y` - The y coordinate of the field point to point at.
    /// * `heading_tolerance` - The heading tolerance.
    /// * `point_away` - Whether to face away from the field point.
    pub fn sgmt_point_at(
        &mut self,
        from_index: usize,
        to_index: usize,
        field_point_x: f64,
        field_point_y: f64,
        heading_tolerance: f64,
        point_away: bool,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::sgmt_point_at(
            self.generator.pin_mut(),
            from_index,
            to_index,
            field_point_x,
            field_point_y,
            heading_tolerance,
            point_away,
        )
    }

    /// Applies a keep-in circle constraint between two waypoints.
    ///
    /// Applies to the robot bumpers.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `center` - The circle's center.
    /// * `radius` - The circle's radius.
    pub fn sgmt_keep_in_circle(
        &mut self,
        from_index: usize,
        to_index: usize,
        center_x: f64,
        center_y: f64,
        radius: f64,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::sgmt_keep_in_circle(
            self.generator.pin_mut(),
            from_index,
            to_index,
            center_x,
            center_y,
            radius,
        )
    }

    /// Applies a keep-in polygon constraint between two waypoints.
    ///
    /// Applies to the robot bumpers.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `field_points_x` - The x coordinates of the points defining the
    ///   keep-in polygon (must wind counterclockwise).
    /// * `field_points_y` - The y coordinates of the points defining the
    ///   keep-in polygon (must wind counterclockwise).
    pub fn sgmt_keep_in_polygon(
        &mut self,
        from_index: usize,
        to_index: usize,
        field_points_x: Vec<f64>,
        field_points_y: Vec<f64>,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::sgmt_keep_in_polygon(
            self.generator.pin_mut(),
            from_index,
            to_index,
            field_points_x,
            field_points_y,
        );
    }

    /// Applies a keep-in lane constraint between two waypoints.
    ///
    /// Applies to the robot center.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `center_line_start_x` - The x coordinate of the center line's start
    ///   point.
    /// * `center_line_start_y` - The y coordinate of the center line's start
    ///   point.
    /// * `center_line_end_x` - The x coordinate of the center line's end point.
    /// * `center_line_end_y` - The y coordinate of the center line's end point.
    /// * `tolerance` - The distance from the center line to each lane edge.
    #[allow(clippy::too_many_arguments)]
    pub fn sgmt_keep_in_lane(
        &mut self,
        from_index: usize,
        to_index: usize,
        center_line_start_x: f64,
        center_line_start_y: f64,
        center_line_end_x: f64,
        center_line_end_y: f64,
        tolerance: f64,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::sgmt_keep_in_lane(
            self.generator.pin_mut(),
            from_index,
            to_index,
            center_line_start_x,
            center_line_start_y,
            center_line_end_x,
            center_line_end_y,
            tolerance,
        )
    }

    /// Applies a keep-out circle constraint between two waypoints.
    ///
    /// Applies to the robot bumpers.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `center_x` - The x coordinate of the circle's center.
    /// * `center_y` - The y coordinate of the circle's center.
    /// * `radius` - The circle's radius.
    pub fn sgmt_keep_out_circle(
        &mut self,
        from_index: usize,
        to_index: usize,
        center_x: f64,
        center_y: f64,
        radius: f64,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::sgmt_keep_out_circle(
            self.generator.pin_mut(),
            from_index,
            to_index,
            center_x,
            center_y,
            radius,
        );
    }

    /// Adds a callback that will be called on each iteration of the solver.
    ///
    /// * `callback` - a `fn` (not a closure) to be executed. The callback's
    ///   first parameter will be a `trajopt::SwerveTrajectory`, and the second
    ///   parameter will be an `i64` equal to the handle passed in `generate()`
    ///
    /// This function can be called multiple times to add multiple callbacks.
    pub fn add_callback(&mut self, callback: fn(SwerveTrajectory, i64)) {
        crate::ffi::SwerveTrajectoryGenerator::add_callback(self.generator.pin_mut(), callback);
    }

    /// Generates the trajectory.
    ///
    /// * `diagnostics` - If true, prints per-iteration details of the solver to
    ///   stdout.
    /// * `handle` - A number used to identify results from this generation in
    ///   the `add_callback` callback. If `add_callback` has not been called,
    ///   this value has no significance.
    ///
    /// Returns a result with either the final `trajopt::SwerveTrajectory`,
    /// or a TrajoptError if generation failed.
    pub fn generate(
        &self,
        diagnostics: bool,
        handle: i64,
    ) -> Result<SwerveTrajectory, TrajoptError> {
        match self.generator.generate(diagnostics, handle) {
            Ok(trajectory) => Ok(trajectory),
            Err(msg) => {
                let what = msg.what();
                Err(TrajoptError::from(
                    what.parse::<i8>()
                        .map_err(|_| TrajoptError::Unparsable(Box::from(what)))?,
                ))
            }
        }
    }
}

/// This trajectory generator class contains functions to generate
/// time-optimal trajectories for differential drivetrain types.
pub struct DifferentialTrajectoryGenerator {
    generator: cxx::UniquePtr<crate::ffi::DifferentialTrajectoryGenerator>,
}

impl Default for DifferentialTrajectoryGenerator {
    fn default() -> Self {
        Self::new()
    }
}

impl DifferentialTrajectoryGenerator {
    /// Constructs a new differential trajectory optimization problem.
    pub fn new() -> DifferentialTrajectoryGenerator {
        DifferentialTrajectoryGenerator {
            generator: crate::ffi::differential_trajectory_generator_new(),
        }
    }

    /// Sets the Drivetrain object.
    ///
    /// * `drivetrain` - The drivetrain.
    pub fn set_drivetrain(&mut self, drivetrain: &crate::ffi::DifferentialDrivetrain) {
        crate::ffi::DifferentialTrajectoryGenerator::set_drivetrain(
            self.generator.pin_mut(),
            drivetrain,
        );
    }

    /// Adds a rectangular bumper to a list used when applying
    /// keep-out constraints.
    ///
    /// * `front` - Distance in meters from center to front bumper edge.
    /// * `left` - Distance in meters from center to left bumper edge.
    /// * `right` - Distance in meters from center to right bumper edge.
    /// * `back` - Distance in meters from center to back bumper edge.
    pub fn set_bumpers(&mut self, front: f64, left: f64, right: f64, back: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::set_bumpers(
            self.generator.pin_mut(),
            front,
            left,
            right,
            back,
        );
    }

    /// Sets the number of discrete samples for each trajectory segment.
    ///
    /// * `counts` - The sequence of control interval counts per segment. Length
    ///   is number of waypoints - 1.
    pub fn set_control_interval_counts(&mut self, counts: Vec<usize>) {
        crate::ffi::DifferentialTrajectoryGenerator::set_control_interval_counts(
            self.generator.pin_mut(),
            counts,
        );
    }

    // Pose constraints

    /// Applies a pose constraint to a waypoint, and adds an initial guess with
    /// the same pose.
    ///
    /// * `index` - The waypoint's index.
    /// * `x` - The x.
    /// * `y` - The y.
    /// * `heading` - The heading.
    pub fn pose_wpt(&mut self, index: usize, x: f64, y: f64, heading: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::pose_wpt(
            self.generator.pin_mut(),
            index,
            x,
            y,
            heading,
        );
    }

    /// Applies a translation constraint to a waypoint, and adds an initial
    /// guess point with the same translation.
    ///
    /// * `index` - The waypoint's index.
    /// * `x` - The x.
    /// * `y` - The y.
    /// * `heading_guess` - The heading initial guess.
    pub fn translation_wpt(&mut self, index: usize, x: f64, y: f64, heading_guess: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::translation_wpt(
            self.generator.pin_mut(),
            index,
            x,
            y,
            heading_guess,
        );
    }

    /// Sets a waypoint's pose initial guess.
    ///
    /// * `index` - The waypoint's index.
    /// * `x_guess` - The x initial guess.
    /// * `y_guess` - The y initial guess.
    /// * `heading_guess` - The heading initial guess.
    pub fn empty_wpt(&mut self, index: usize, x_guess: f64, y_guess: f64, heading_guess: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::empty_wpt(
            self.generator.pin_mut(),
            index,
            x_guess,
            y_guess,
            heading_guess,
        );
    }

    // Segment initial guess points setter

    /// Adds a sequence of initial guess points between two waypoints.
    ///
    /// The points are inserted between the waypoints at fromIndex and
    /// fromIndex + 1. Linear interpolation between the waypoint initial guess
    /// points and these segment initial guess points is used as the initial
    /// guess of the robot's pose over the trajectory.
    ///
    /// * `from_index` - The index of the waypoint the initial guess point comes
    ///   after.
    /// * `guess_points` - The sequence of initial guess points.
    pub fn sgmt_initial_guess_points(
        &mut self,
        from_index: usize,
        guess_points: &Vec<crate::ffi::Pose2d>,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::sgmt_initial_guess_points(
            self.generator.pin_mut(),
            from_index,
            guess_points,
        );
    }

    // Constraints with waypoint scope

    /// Applies a linear velocity direction constraint to a waypoint.
    ///
    /// * `index` - The waypoint's index.
    /// * `angle` - The angle in radians.
    pub fn wpt_linear_velocity_direction(&mut self, index: usize, angle: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_linear_velocity_direction(
            self.generator.pin_mut(),
            index,
            angle,
        );
    }

    /// Applies a linear velocity max magnitude constraint to a waypoint.
    ///
    /// * `index` - The waypoint's index.
    /// * `magnitude` - The magnitude.
    pub fn wpt_linear_velocity_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_linear_velocity_max_magnitude(
            self.generator.pin_mut(),
            index,
            magnitude,
        );
    }

    /// Applies an angular velocity max magnitude constraint to a waypoint.
    ///
    /// * `index` - The waypoint's index.
    /// * `magnitude` - The magnitude.
    pub fn wpt_angular_velocity_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_angular_velocity_max_magnitude(
            self.generator.pin_mut(),
            index,
            magnitude,
        );
    }

    /// Applies a linear acceleration max magnitude constraint to a waypoint.
    ///
    /// * `index` - The waypoint's index.
    /// * `magnitude` - The magnitude.
    pub fn wpt_linear_acceleration_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_linear_acceleration_max_magnitude(
            self.generator.pin_mut(),
            index,
            magnitude,
        );
    }

    /// Applies a point-at constraint to a waypoint.
    ///
    /// * `index` - The waypoint's index.
    /// * `field_point_x` - The x coordinate of the field point to point at.
    /// * `field_point_y` - The y coordinate of the field point to point at.
    /// * `heading_tolerance` - The heading tolerance.
    /// * `point_away` - Whether to point away from the field point.
    pub fn wpt_point_at(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        heading_tolerance: f64,
        point_away: bool,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_point_at(
            self.generator.pin_mut(),
            index,
            field_point_x,
            field_point_y,
            heading_tolerance,
            point_away,
        )
    }

    /// Applies a keep-in circle constraint to a waypoint.
    ///
    /// Applies to the robot bumpers.
    ///
    /// * `index` - The waypoint's index.
    /// * `center_x` - The x coordinate of the circle's center.
    /// * `center_y` - The y coordinate of the circle's center.
    /// * `radius` - The circle's radius.
    pub fn wpt_keep_in_circle(&mut self, index: usize, center_x: f64, center_y: f64, radius: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_keep_in_circle(
            self.generator.pin_mut(),
            index,
            center_x,
            center_y,
            radius,
        )
    }

    /// Applies a keep-in polygon constraint to a waypoint.
    ///
    /// Applies to the robot bumpers.
    ///
    /// * `index` - The waypoint's index.
    /// * `field_points_x` - The x coordinates of the points defining the
    ///   keep-in polygon (must wind counterclockwise).
    /// * `field_points_y` - The x coordinates of the points defining the
    ///   keep-in polygon (must wind counterclockwise).
    pub fn wpt_keep_in_polygon(
        &mut self,
        index: usize,
        field_points_x: Vec<f64>,
        field_points_y: Vec<f64>,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_keep_in_polygon(
            self.generator.pin_mut(),
            index,
            field_points_x,
            field_points_y,
        );
    }

    /// Applies a keep-in lane constraint to a waypoint.
    ///
    /// Applies to the robot center.
    ///
    /// * `index` - The waypoint's index.
    /// * `center_line_start_x` - The x coordinate of the center line's start
    ///   point.
    /// * `center_line_start_y` - The y coordinate of the center line's start
    ///   point.
    /// * `center_line_end_x` - The x coordinate of the center line's end point.
    /// * `center_line_end_y` - The x coordinate of the center line's end point.
    /// * `tolerance` - The distance from the center line to each lane edge.
    pub fn wpt_keep_in_lane(
        &mut self,
        index: usize,
        center_line_start_x: f64,
        center_line_start_y: f64,
        center_line_end_x: f64,
        center_line_end_y: f64,
        tolerance: f64,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_keep_in_lane(
            self.generator.pin_mut(),
            index,
            center_line_start_x,
            center_line_start_y,
            center_line_end_x,
            center_line_end_y,
            tolerance,
        );
    }

    /// Applies a keep-out circle constraint to a waypoint.
    ///
    /// Applies to the robot bumpers.
    ///
    /// * `index` - The waypoint's index.
    /// * `center_x` - The x coordinate of the circle's center.
    /// * `center_y` - The y coordinate of the circle's center.
    /// * `radius` - The circle's radius.
    pub fn wpt_keep_out_circle(&mut self, index: usize, center_x: f64, center_y: f64, radius: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_keep_out_circle(
            self.generator.pin_mut(),
            index,
            center_x,
            center_y,
            radius,
        )
    }

    // Constraints with segment scope

    /// Applies a linear velocity direction constraint between two waypoints.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `angle` - The angle in radians.
    pub fn sgmt_linear_velocity_direction(
        &mut self,
        from_index: usize,
        to_index: usize,
        angle: f64,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::sgmt_linear_velocity_direction(
            self.generator.pin_mut(),
            from_index,
            to_index,
            angle,
        );
    }

    /// Applies a linear velocity max magnitude constraint between two
    /// waypoints.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `magnitude` - The magnitude.
    pub fn sgmt_linear_velocity_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        magnitude: f64,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::sgmt_linear_velocity_max_magnitude(
            self.generator.pin_mut(),
            from_index,
            to_index,
            magnitude,
        );
    }

    /// Applies an angular velocity max magnitude constraint between two
    /// waypoints.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `magnitude` - The magnitude.
    pub fn sgmt_angular_velocity_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        magnitude: f64,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::sgmt_angular_velocity_max_magnitude(
            self.generator.pin_mut(),
            from_index,
            to_index,
            magnitude,
        );
    }

    /// Applies a linear acceleration max magnitude constraint between two
    /// waypoints.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `magnitude` - The magnitude.
    pub fn sgmt_linear_acceleration_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        magnitude: f64,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::sgmt_linear_acceleration_max_magnitude(
            self.generator.pin_mut(),
            from_index,
            to_index,
            magnitude,
        );
    }

    /// Applies a keep-in circle constraint between two waypoints.
    ///
    /// Applies to the robot bumpers.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `center` - The circle's center.
    /// * `radius` - The circle's radius.
    pub fn sgmt_keep_in_circle(
        &mut self,
        from_index: usize,
        to_index: usize,
        center_x: f64,
        center_y: f64,
        radius: f64,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::sgmt_keep_in_circle(
            self.generator.pin_mut(),
            from_index,
            to_index,
            center_x,
            center_y,
            radius,
        )
    }

    /// Applies a keep-in polygon constraint between two waypoints.
    ///
    /// Applies to the robot bumpers.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `field_points_x` - The x coordinates of the points defining the
    ///   keep-in polygon (must wind counterclockwise).
    /// * `field_points_y` - The y coordinates of the points defining the
    ///   keep-in polygon (must wind counterclockwise).
    pub fn sgmt_keep_in_polygon(
        &mut self,
        from_index: usize,
        to_index: usize,
        field_points_x: Vec<f64>,
        field_points_y: Vec<f64>,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::sgmt_keep_in_polygon(
            self.generator.pin_mut(),
            from_index,
            to_index,
            field_points_x,
            field_points_y,
        );
    }

    /// Applies a keep-in lane constraint between two waypoints.
    ///
    /// Applies to the robot center.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `center_line_start_x` - The x coordinate of the center line's start
    ///   point.
    /// * `center_line_start_y` - The y coordinate of the center line's start
    ///   point.
    /// * `center_line_end_x` - The x coordinate of the center line's end point.
    /// * `center_line_end_y` - The y coordinate of the center line's end point.
    /// * `tolerance` - The distance from the center line to each lane edge.
    #[allow(clippy::too_many_arguments)]
    pub fn sgmt_keep_in_lane(
        &mut self,
        from_index: usize,
        to_index: usize,
        center_line_start_x: f64,
        center_line_start_y: f64,
        center_line_end_x: f64,
        center_line_end_y: f64,
        tolerance: f64,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::sgmt_keep_in_lane(
            self.generator.pin_mut(),
            from_index,
            to_index,
            center_line_start_x,
            center_line_start_y,
            center_line_end_x,
            center_line_end_y,
            tolerance,
        )
    }

    /// Applies a keep-out circle constraint between two waypoints.
    ///
    /// Applies to the robot bumpers.
    ///
    /// * `from_index` - The first waypoint's index.
    /// * `to_index` - The second waypoint's index.
    /// * `center_x` - The x coordinate of the circle's center.
    /// * `center_y` - The y coordinate of the circle's center.
    /// * `radius` - The circle's radius.
    pub fn sgmt_keep_out_circle(
        &mut self,
        from_index: usize,
        to_index: usize,
        center_x: f64,
        center_y: f64,
        radius: f64,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::sgmt_keep_out_circle(
            self.generator.pin_mut(),
            from_index,
            to_index,
            center_x,
            center_y,
            radius,
        );
    }

    /// Adds a callback that will be called on each iteration of the solver.
    ///
    /// * `callback` - a `fn` (not a closure) to be executed. The callback's
    ///   first parameter will be a `trajopt::DifferentialTrajectory`, and the
    ///   second parameter will be an `i64` equal to the handle passed in
    ///   `generate()`
    ///
    /// This function can be called multiple times to add multiple callbacks.
    pub fn add_callback(&mut self, callback: fn(DifferentialTrajectory, i64)) {
        crate::ffi::DifferentialTrajectoryGenerator::add_callback(
            self.generator.pin_mut(),
            callback,
        );
    }

    /// Generates the trajectory.
    ///
    /// * `diagnostics` - If true, prints per-iteration details of the solver to
    ///   stdout.
    /// * `handle` - A number used to identify results from this generation in
    ///   the `add_callback` callback. If `add_callback` has not been called,
    ///   this value has no significance.
    ///
    /// Returns a result with either the final
    /// `trajopt::DifferentialTrajectory`, or TrajoptError
    /// generation failed.
    pub fn generate(
        &self,
        diagnostics: bool,
        handle: i64,
    ) -> Result<DifferentialTrajectory, TrajoptError> {
        match self.generator.generate(diagnostics, handle) {
            Ok(trajectory) => Ok(trajectory),
            Err(msg) => {
                let what = msg.what();
                Err(TrajoptError::from(
                    what.parse::<i8>()
                        .map_err(|_| TrajoptError::Unparsable(Box::from(what)))?,
                ))
            }
        }
    }
}

/// Cancels all running generations.
pub fn cancel_all() {
    crate::ffi::cancel_all();
}

use error::TrajoptError;
pub use ffi::DifferentialDrivetrain;
pub use ffi::DifferentialTrajectory;
pub use ffi::DifferentialTrajectorySample;
pub use ffi::Pose2d;
pub use ffi::SwerveDrivetrain;
pub use ffi::SwerveTrajectory;
pub use ffi::SwerveTrajectorySample;
pub use ffi::Translation2d;

/// Solver error types.
pub mod error;
