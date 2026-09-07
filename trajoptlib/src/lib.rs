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
    /// A DC motor model for a single drive wheel.
    ///
    /// All rotational quantities are referenced to the wheel, not the motor
    /// shaft. To convert from motor constants to wheel-referenced constants,
    /// divide speeds by the gear ratio and multiply torques, kT, and kV by the
    /// gear ratio. kS and the current limits are unaffected by gearing.
    ///
    /// The model assumes a 12 V nominal supply.
    struct MotorConfig {
        /// Free speed of the wheel at nominal voltage (rad/s).
        free_speed: f64,
        /// Stall torque applied to the wheel at nominal voltage (N−m).
        stall_torque: f64,
        /// Torque constant: wheel torque per amp of stator current (N−m/A).
        kT: f64,
        /// Velocity constant: back-EMF voltage per unit of wheel angular
        /// velocity (V/(rad/s)).
        kV: f64,
        /// Static friction voltage: the voltage required to overcome friction
        /// and start the wheel moving (V). This is the kS term from SysID.
        kS: f64,
        /// Maximum current drawn from the supply per motor (A).
        supply_limit: f64,
        /// Maximum stator current per motor (A). Also bounds the braking
        /// current.
        stator_limit: f64,
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
        /// The motor model of each drive wheel. All quantities are
        /// wheel-referenced (motor constants scaled by the gear ratio).
        motor_config: MotorConfig,
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
            angular_velocity: f64,
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
            flip: bool,
        );

        fn wpt_keep_in_circle(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            index: usize,
            field_point_x: f64,
            field_point_y: f64,
            keep_in_radius: f64,
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
            field_point_x: f64,
            field_point_y: f64,
            keep_in_radius: f64,
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
            flip: bool,
        );

        fn sgmt_keep_in_circle(
            self: Pin<&mut SwerveTrajectoryGenerator>,
            from_index: usize,
            to_index: usize,
            field_point_x: f64,
            field_point_y: f64,
            keep_in_radius: f64,
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
            x: f64,
            y: f64,
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
            flip: bool,
        );

        fn wpt_keep_in_circle(
            self: Pin<&mut DifferentialTrajectoryGenerator>,
            index: usize,
            field_point_x: f64,
            field_point_y: f64,
            keep_in_radius: f64,
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
            field_point_x: f64,
            field_point_y: f64,
            keep_in_radius: f64,
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
            field_point_x: f64,
            field_point_y: f64,
            keep_in_radius: f64,
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
            x: f64,
            y: f64,
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
    /// Construct a new swerve trajectory optimization problem.
    pub fn new() -> SwerveTrajectoryGenerator {
        SwerveTrajectoryGenerator {
            generator: crate::ffi::swerve_trajectory_generator_new(),
        }
    }

    /// Set the Drivetrain object.
    pub fn set_drivetrain(&mut self, drivetrain: &crate::ffi::SwerveDrivetrain) {
        crate::ffi::SwerveTrajectoryGenerator::set_drivetrain(self.generator.pin_mut(), drivetrain);
    }

    /// Add a rectangular bumper to a list used when applying
    /// keep-out constraints.
    ///
    /// * `front` - Distance in meters from center to front bumper edge
    /// * `left` - Distance in meters from center to left bumper edge
    /// * `right` - Distance in meters from center to right bumper edge
    /// * `back` - Distance in meters from center to back bumper edge
    pub fn set_bumpers(&mut self, front: f64, left: f64, right: f64, back: f64) {
        crate::ffi::SwerveTrajectoryGenerator::set_bumpers(
            self.generator.pin_mut(),
            front,
            left,
            right,
            back,
        );
    }

    /// If using a discrete algorithm, specify the number of discrete
    /// samples for every segment of the trajectory
    ///
    /// * `counts` - the sequence of control interval counts per segment, length
    ///   is number of waypoints - 1
    pub fn set_control_interval_counts(&mut self, counts: Vec<usize>) {
        crate::ffi::SwerveTrajectoryGenerator::set_control_interval_counts(
            self.generator.pin_mut(),
            counts,
        );
    }

    // Constraints with waypoint scope

    /// Create a pose waypoint constraint on the waypoint at the provided
    /// index, and add an initial guess with the same pose This specifies that
    /// the position and heading of the robot at the waypoint must be fixed
    /// at the values provided.
    ///
    /// * `index` - index of the pose waypoint
    /// * `x` - the x
    /// * `y` - the y
    /// * `heading` - the heading
    pub fn pose_wpt(&mut self, index: usize, x: f64, y: f64, heading: f64) {
        crate::ffi::SwerveTrajectoryGenerator::pose_wpt(
            self.generator.pin_mut(),
            index,
            x,
            y,
            heading,
        );
    }

    /// Create a translation waypoint constraint on the waypoint at the
    /// provided index, and add an initial guess point with the same
    /// translation. This specifies that the position of the robot at the
    /// waypoint must be fixed at the value provided.
    ///
    /// * `index` - index of the pose waypoint
    /// * `x` - the x
    /// * `y` - the y
    /// * `headingGuess` - optionally, an initial guess of the heading
    pub fn translation_wpt(&mut self, index: usize, x: f64, y: f64, heading_guess: f64) {
        crate::ffi::SwerveTrajectoryGenerator::translation_wpt(
            self.generator.pin_mut(),
            index,
            x,
            y,
            heading_guess,
        );
    }

    /// Create an empty waypoint at the provided index, and provide a guess of
    /// the instantaneous pose of the robot there. The waypoint itself is left
    /// unconstrained.
    ///
    /// * `index` - index of the waypoint
    /// * `x_guess` - an initial guess of the x
    /// * `y_guess` - an initial guess of the y
    /// * `heading_guess` - an initial guess of the heading
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

    /// Add a sequence of initial guess points between two waypoints. The points
    /// are inserted between the waypoints at `from_index` and `from_index` + 1.
    /// Linear interpolation between the waypoint initial guess points and these
    /// segment initial guess points is used as the initial guess of the robot's
    /// pose over the trajectory.
    ///
    /// * `from_index` - index of the waypoint the initial guess points come
    ///   immediately after
    /// * `guess_points` - the sequence of initial guess points
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

    /// Apply a linear velocity direction equality constraint to the waypoint
    /// at the provided index. This constrains the direction of the robot's
    /// linear velocity, but not its magnitude.
    ///
    /// * `index` - index of the waypoint
    /// * `angle` - the direction of the linear velocity (radians)
    pub fn wpt_linear_velocity_direction(&mut self, index: usize, angle: f64) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_linear_velocity_direction(
            self.generator.pin_mut(),
            index,
            angle,
        );
    }

    /// Apply a linear velocity max magnitude inequality constraint to
    /// the waypoint at the provided index.
    ///
    /// * `index` - index of the waypoint
    /// * `magnitude` - the maximum linear velocity magnitude (m/s). Must be
    ///   nonnegative.
    pub fn wpt_linear_velocity_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_linear_velocity_max_magnitude(
            self.generator.pin_mut(),
            index,
            magnitude,
        );
    }

    /// Apply an angular velocity max magnitude inequality constraint to
    /// the waypoint at the provided index.
    ///
    /// * `index` - index of the waypoint
    /// * `angular_velocity` - the maximum angular velocity magnitude (rad/s).
    ///   Must be nonnegative.
    pub fn wpt_angular_velocity_max_magnitude(&mut self, index: usize, angular_velocity: f64) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_angular_velocity_max_magnitude(
            self.generator.pin_mut(),
            index,
            angular_velocity,
        );
    }

    /// Apply a linear acceleration max magnitude inequality constraint to
    /// the waypoint at the provided index.
    ///
    /// * `index` - index of the waypoint
    /// * `magnitude` - the maximum linear acceleration magnitude (m/s²). Must
    ///   be nonnegative.
    pub fn wpt_linear_acceleration_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_linear_acceleration_max_magnitude(
            self.generator.pin_mut(),
            index,
            magnitude,
        );
    }

    /// Apply a point-at constraint to the waypoint at the provided index,
    /// specifying a point on the field at which the robot should point.
    ///
    /// * `index` - index of the waypoint
    /// * `field_point_x` - the x coordinate of the field point
    /// * `field_point_y` - the y coordinate of the field point
    /// * `heading_tolerance` - the allowed robot heading tolerance (radians).
    ///   Must be nonnegative.
    /// * `flip` - false points at the field point while true points away from
    ///   the field point
    pub fn wpt_point_at(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        heading_tolerance: f64,
        flip: bool,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_point_at(
            self.generator.pin_mut(),
            index,
            field_point_x,
            field_point_y,
            heading_tolerance,
            flip,
        )
    }

    /// Keep the robot's bumpers within a circle on the field at the waypoint at
    /// the provided index.
    ///
    /// * `index` - index of the waypoint
    /// * `field_point_x` - the x coordinate of the circle's center
    /// * `field_point_y` - the y coordinate of the circle's center
    /// * `keep_in_radius` - the radius of the circle (m). Must be nonnegative.
    pub fn wpt_keep_in_circle(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        keep_in_radius: f64,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_keep_in_circle(
            self.generator.pin_mut(),
            index,
            field_point_x,
            field_point_y,
            keep_in_radius,
        )
    }

    /// Keep the robot's bumpers within a polygon on the field at the waypoint
    /// at the provided index. The polygon's points must be wound
    /// counterclockwise. Does nothing if the two coordinate lists have
    /// different lengths.
    ///
    /// * `index` - index of the waypoint
    /// * `field_points_x` - the x coordinates of the polygon's points
    /// * `field_points_y` - the y coordinates of the polygon's points
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

    /// Keep the robot's center between two lines parallel to a center line over
    /// the waypoint at the provided index.
    ///
    /// * `index` - index of the waypoint
    /// * `center_line_start_x` - the x coordinate of the center line's start
    ///   point
    /// * `center_line_start_y` - the y coordinate of the center line's start
    ///   point
    /// * `center_line_end_x` - the x coordinate of the center line's end point
    /// * `center_line_end_y` - the y coordinate of the center line's end point
    /// * `tolerance` - distance from the center line to each lane edge (m).
    ///   Passing zero constrains the robot to the center line itself.
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

    /// Keep the robot's bumpers out of a circle on the field at the waypoint at
    /// the provided index.
    ///
    /// * `index` - index of the waypoint
    /// * `field_point_x` - the x coordinate of the circle's center
    /// * `field_point_y` - the y coordinate of the circle's center
    /// * `keep_in_radius` - the radius of the keep-out circle (m). Must be
    ///   nonnegative.
    pub fn wpt_keep_out_circle(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        keep_in_radius: f64,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_keep_out_circle(
            self.generator.pin_mut(),
            index,
            field_point_x,
            field_point_y,
            keep_in_radius,
        )
    }

    // Constraints with segment scope

    /// Apply a linear velocity direction equality constraint to the continuum
    /// of state between the waypoints at `from_index` and `to_index`. This
    /// constrains the direction of the robot's linear velocity, but not its
    /// magnitude.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `angle` - the direction of the linear velocity (radians)
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

    /// Apply a linear velocity max magnitude inequality constraint to
    /// the continuum of state between the waypoints at `from_index` and
    /// `to_index`.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `magnitude` - the maximum linear velocity magnitude (m/s). Must be
    ///   nonnegative.
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

    /// Apply an angular velocity max magnitude inequality constraint to
    /// the continuum of state between the waypoints at `from_index` and
    /// `to_index`.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `angular_velocity` - the maximum angular velocity magnitude (rad/s).
    ///   Must be nonnegative.
    pub fn sgmt_angular_velocity_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        angular_velocity: f64,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::sgmt_angular_velocity_max_magnitude(
            self.generator.pin_mut(),
            from_index,
            to_index,
            angular_velocity,
        );
    }

    /// Apply a linear acceleration max magnitude inequality constraint to
    /// the continuum of state between the waypoints at `from_index` and
    /// `to_index`.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `magnitude` - the maximum linear acceleration magnitude (m/s²). Must
    ///   be nonnegative.
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

    /// Keep the robot's bumpers within a circle on the field over the continuum
    /// of state between the waypoints at `from_index` and `to_index`.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `field_point_x` - the x coordinate of the circle's center
    /// * `field_point_y` - the y coordinate of the circle's center
    /// * `keep_in_radius` - the radius of the circle (m). Must be nonnegative.
    pub fn sgmt_keep_in_circle(
        &mut self,
        from_index: usize,
        to_index: usize,
        field_point_x: f64,
        field_point_y: f64,
        keep_in_radius: f64,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::sgmt_keep_in_circle(
            self.generator.pin_mut(),
            from_index,
            to_index,
            field_point_x,
            field_point_y,
            keep_in_radius,
        )
    }

    /// Keep the robot's bumpers within a polygon on the field over the
    /// continuum of state between the waypoints at `from_index` and
    /// `to_index`.The polygon's points must be wound
    /// counterclockwise. Does nothing if the two coordinate lists have
    /// different lengths.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `field_points_x` - the x coordinates of the polygon's points
    /// * `field_points_y` - the y coordinates of the polygon's points
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

    /// Keep the robot's center between two lines parallel to a center line over
    /// the continuum of state between the waypoints at `from_index` and
    /// `to_index`.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `center_line_start_x` - the x coordinate of the center line's start
    ///   point
    /// * `center_line_start_y` - the y coordinate of the center line's start
    ///   point
    /// * `center_line_end_x` - the x coordinate of the center line's end point
    /// * `center_line_end_y` - the y coordinate of the center line's end point
    /// * `tolerance` - distance from the center line to each lane edge (m).
    ///   Passing zero constrains the robot to the center line itself.
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

    /// Keep the robot's bumpers out of a circle on the field over the continuum
    /// of state between the waypoints at `from_index` and `to_index`.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `x` - the x coordinate of the circle's center
    /// * `y` - the y coordinate of the circle's center
    /// * `radius` - the radius of the keep-out circle (m). Must be nonnegative.
    pub fn sgmt_keep_out_circle(
        &mut self,
        from_index: usize,
        to_index: usize,
        x: f64,
        y: f64,
        radius: f64,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::sgmt_keep_out_circle(
            self.generator.pin_mut(),
            from_index,
            to_index,
            x,
            y,
            radius,
        );
    }

    /// Apply a point-at constraint to the continuum of state between the
    /// waypoints at `from_index` and `to_index`, specifying a point on the
    /// field at which the robot should point.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `field_point_x` - the x coordinate of the field point
    /// * `field_point_y` - the y coordinate of the field point
    /// * `heading_tolerance` - the allowed robot heading tolerance (radians).
    ///   Must be nonnegative.
    /// * `flip` - false points at the field point while true points away from
    ///   the field point
    pub fn sgmt_point_at(
        &mut self,
        from_index: usize,
        to_index: usize,
        field_point_x: f64,
        field_point_y: f64,
        heading_tolerance: f64,
        flip: bool,
    ) {
        crate::ffi::SwerveTrajectoryGenerator::sgmt_point_at(
            self.generator.pin_mut(),
            from_index,
            to_index,
            field_point_x,
            field_point_y,
            heading_tolerance,
            flip,
        )
    }

    /// Add a callback that will be called on each iteration of the solver.
    ///
    /// * `callback` - a `fn` (not a closure) to be executed. The callback's
    ///   first parameter will be a `trajopt::SwerveTrajectory`, and the second
    ///   parameter will be an `i64` equal to the handle passed in `generate()`
    ///
    /// This function can be called multiple times to add multiple callbacks.
    pub fn add_callback(&mut self, callback: fn(SwerveTrajectory, i64)) {
        crate::ffi::SwerveTrajectoryGenerator::add_callback(self.generator.pin_mut(), callback);
    }

    /// Generate the trajectory;
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
    /// Construct a new differential trajectory optimization problem.
    pub fn new() -> DifferentialTrajectoryGenerator {
        DifferentialTrajectoryGenerator {
            generator: crate::ffi::differential_trajectory_generator_new(),
        }
    }

    /// Set the Drivetrain object.
    pub fn set_drivetrain(&mut self, drivetrain: &crate::ffi::DifferentialDrivetrain) {
        crate::ffi::DifferentialTrajectoryGenerator::set_drivetrain(
            self.generator.pin_mut(),
            drivetrain,
        );
    }

    /// Add a rectangular bumper to a list used when applying
    /// keep-out constraints.
    ///
    /// * `front` - Distance in meters from center to front bumper edge
    /// * `left` - Distance in meters from center to left bumper edge
    /// * `right` - Distance in meters from center to right bumper edge
    /// * `back` - Distance in meters from center to back bumper edge
    pub fn set_bumpers(&mut self, front: f64, left: f64, right: f64, back: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::set_bumpers(
            self.generator.pin_mut(),
            front,
            left,
            right,
            back,
        );
    }

    /// If using a discrete algorithm, specify the number of discrete
    /// samples for every segment of the trajectory
    ///
    /// * `counts` - the sequence of control interval counts per segment, length
    ///   is number of waypoints - 1
    pub fn set_control_interval_counts(&mut self, counts: Vec<usize>) {
        crate::ffi::DifferentialTrajectoryGenerator::set_control_interval_counts(
            self.generator.pin_mut(),
            counts,
        );
    }

    // Pose constraints

    /// Create a pose waypoint constraint on the waypoint at the provided
    /// index, and add an initial guess with the same pose This specifies that
    /// the position and heading of the robot at the waypoint must be fixed
    /// at the values provided.
    ///
    /// * `index` - index of the pose waypoint
    /// * `x` - the x
    /// * `y` - the y
    /// * `heading` - the heading
    pub fn pose_wpt(&mut self, index: usize, x: f64, y: f64, heading: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::pose_wpt(
            self.generator.pin_mut(),
            index,
            x,
            y,
            heading,
        );
    }

    /// Create a translation waypoint constraint on the waypoint at the
    /// provided index, and add an initial guess point with the same
    /// translation. This specifies that the position of the robot at the
    /// waypoint must be fixed at the value provided.
    ///
    /// * `index` - index of the pose waypoint
    /// * `x` - the x
    /// * `y` - the y
    /// * `headingGuess` - optionally, an initial guess of the heading
    pub fn translation_wpt(&mut self, index: usize, x: f64, y: f64, heading_guess: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::translation_wpt(
            self.generator.pin_mut(),
            index,
            x,
            y,
            heading_guess,
        );
    }

    /// Create an empty waypoint at the provided index, and provide a guess of
    /// the instantaneous pose of the robot there. The waypoint itself is left
    /// unconstrained.
    ///
    /// * `index` - index of the waypoint
    /// * `x_guess` - an initial guess of the x
    /// * `y_guess` - an initial guess of the y
    /// * `heading_guess` - an initial guess of the heading
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

    /// Add a sequence of initial guess points between two waypoints. The points
    /// are inserted between the waypoints at `from_index` and `from_index` + 1.
    /// Linear interpolation between the waypoint initial guess points and these
    /// segment initial guess points is used as the initial guess of the robot's
    /// pose over the trajectory.
    ///
    /// * `from_index` - index of the waypoint the initial guess points come
    ///   immediately after
    /// * `guess_points` - the sequence of initial guess points
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

    /// Apply a linear velocity direction equality constraint to the waypoint
    /// at the provided index. This constrains the direction of the robot's
    /// linear velocity, but not its magnitude.
    ///
    /// * `index` - index of the waypoint
    /// * `angle` - the direction of the linear velocity (radians)
    pub fn wpt_linear_velocity_direction(&mut self, index: usize, angle: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_linear_velocity_direction(
            self.generator.pin_mut(),
            index,
            angle,
        );
    }

    /// Apply a linear velocity max magnitude inequality constraint to
    /// the waypoint at the provided index.
    ///
    /// * `index` - index of the waypoint
    /// * `magnitude` - the maximum linear velocity magnitude (m/s). Must be
    ///   nonnegative.
    pub fn wpt_linear_velocity_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_linear_velocity_max_magnitude(
            self.generator.pin_mut(),
            index,
            magnitude,
        );
    }

    /// Apply an angular velocity max magnitude inequality constraint to
    /// the waypoint at the provided index.
    ///
    /// * `index` - index of the waypoint
    /// * `angular_velocity` - the maximum angular velocity magnitude (rad/s).
    ///   Must be nonnegative.
    pub fn wpt_angular_velocity_max_magnitude(&mut self, index: usize, angular_velocity: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_angular_velocity_max_magnitude(
            self.generator.pin_mut(),
            index,
            angular_velocity,
        );
    }

    /// Apply a linear acceleration max magnitude inequality constraint to
    /// the waypoint at the provided index.
    ///
    /// * `index` - index of the waypoint
    /// * `magnitude` - the maximum linear acceleration magnitude (m/s²). Must
    ///   be nonnegative.
    pub fn wpt_linear_acceleration_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_linear_acceleration_max_magnitude(
            self.generator.pin_mut(),
            index,
            magnitude,
        );
    }

    /// Apply a point-at constraint to the waypoint at the provided index,
    /// specifying a point on the field at which the robot should point.
    ///
    /// * `index` - index of the waypoint
    /// * `field_point_x` - the x coordinate of the field point
    /// * `field_point_y` - the y coordinate of the field point
    /// * `heading_tolerance` - the allowed robot heading tolerance (radians).
    ///   Must be nonnegative.
    /// * `flip` - false points at the field point while true points away from
    ///   the field point
    pub fn wpt_point_at(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        heading_tolerance: f64,
        flip: bool,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_point_at(
            self.generator.pin_mut(),
            index,
            field_point_x,
            field_point_y,
            heading_tolerance,
            flip,
        )
    }

    /// Keep the robot's bumpers within a circle on the field at the waypoint at
    /// the provided index.
    ///
    /// * `index` - index of the waypoint
    /// * `field_point_x` - the x coordinate of the circle's center
    /// * `field_point_y` - the y coordinate of the circle's center
    /// * `keep_in_radius` - the radius of the circle (m). Must be nonnegative.
    pub fn wpt_keep_in_circle(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        keep_in_radius: f64,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_keep_in_circle(
            self.generator.pin_mut(),
            index,
            field_point_x,
            field_point_y,
            keep_in_radius,
        )
    }

    /// Keep the robot's bumpers within a polygon on the field at the waypoint
    /// at the provided index. The polygon's points must be wound
    /// counterclockwise. Does nothing if the two coordinate lists have
    /// different lengths.
    ///
    /// * `index` - index of the waypoint
    /// * `field_points_x` - the x coordinates of the polygon's points
    /// * `field_points_y` - the y coordinates of the polygon's points
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

    /// Keep the robot's center between two lines parallel to a center line over
    /// the waypoint at the provided index.
    ///
    /// * `index` - index of the waypoint
    /// * `center_line_start_x` - the x coordinate of the center line's start
    ///   point
    /// * `center_line_start_y` - the y coordinate of the center line's start
    ///   point
    /// * `center_line_end_x` - the x coordinate of the center line's end point
    /// * `center_line_end_y` - the y coordinate of the center line's end point
    /// * `tolerance` - distance from the center line to each lane edge (m).
    ///   Passing zero constrains the robot to the center line itself.
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

    /// Keep the robot's bumpers out of a circle on the field at the waypoint at
    /// the provided index.
    ///
    /// * `index` - index of the waypoint
    /// * `field_point_x` - the x coordinate of the circle's center
    /// * `field_point_y` - the y coordinate of the circle's center
    /// * `keep_in_radius` - the radius of the keep-out circle (m). Must be
    ///   nonnegative.
    pub fn wpt_keep_out_circle(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        keep_in_radius: f64,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_keep_out_circle(
            self.generator.pin_mut(),
            index,
            field_point_x,
            field_point_y,
            keep_in_radius,
        )
    }

    // Constraints with segment scope

    /// Apply a linear velocity direction equality constraint to the continuum
    /// of state between the waypoints at `from_index` and `to_index`. This
    /// constrains the direction of the robot's linear velocity, but not its
    /// magnitude.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `angle` - the direction of the linear velocity (radians)
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

    /// Apply a linear velocity max magnitude inequality constraint to
    /// the continuum of state between the waypoints at `from_index` and
    /// `to_index`.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `magnitude` - the maximum linear velocity magnitude (m/s). Must be
    ///   nonnegative.
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

    /// Apply an angular velocity max magnitude inequality constraint to
    /// the continuum of state between the waypoints at `from_index` and
    /// `to_index`.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `angular_velocity` - the maximum angular velocity magnitude (rad/s).
    ///   Must be nonnegative.
    pub fn sgmt_angular_velocity_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        angular_velocity: f64,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::sgmt_angular_velocity_max_magnitude(
            self.generator.pin_mut(),
            from_index,
            to_index,
            angular_velocity,
        );
    }

    /// Apply a linear acceleration max magnitude inequality constraint to
    /// the continuum of state between the waypoints at `from_index` and
    /// `to_index`.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `magnitude` - the maximum linear acceleration magnitude (m/s²). Must
    ///   be nonnegative.
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

    /// Keep the robot's bumpers within a circle on the field over the continuum
    /// of state between the waypoints at `from_index` and `to_index`.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `field_point_x` - the x coordinate of the circle's center
    /// * `field_point_y` - the y coordinate of the circle's center
    /// * `keep_in_radius` - the radius of the circle (m). Must be nonnegative.
    pub fn sgmt_keep_in_circle(
        &mut self,
        from_index: usize,
        to_index: usize,
        field_point_x: f64,
        field_point_y: f64,
        keep_in_radius: f64,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::sgmt_keep_in_circle(
            self.generator.pin_mut(),
            from_index,
            to_index,
            field_point_x,
            field_point_y,
            keep_in_radius,
        )
    }

    /// Keep the robot's bumpers within a polygon on the field over the
    /// continuum of state between the waypoints at `from_index` and
    /// `to_index`. The polygon's points must be wound counterclockwise.
    /// Does nothing if the two coordinate lists have different lengths.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `field_points_x` - the x coordinates of the polygon's points
    /// * `field_points_y` - the y coordinates of the polygon's points
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

    /// Keep the robot's center between two lines parallel to a center line over
    /// the continuum of state between the waypoints at `from_index` and
    /// `to_index`.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `center_line_start_x` - the x coordinate of the center line's start
    ///   point
    /// * `center_line_start_y` - the y coordinate of the center line's start
    ///   point
    /// * `center_line_end_x` - the x coordinate of the center line's end point
    /// * `center_line_end_y` - the y coordinate of the center line's end point
    /// * `tolerance` - distance from the center line to each lane edge (m).
    ///   Passing zero constrains the robot to the center line itself.
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

    /// Keep the robot's bumpers out of a circle on the field over the continuum
    /// of state between the waypoints at `from_index` and `to_index`.
    ///
    /// * `from_index` - index of the waypoint at the beginning of the continuum
    /// * `to_index` - index of the waypoint at the end of the continuum
    /// * `x` - the x coordinate of the circle's center
    /// * `y` - the y coordinate of the circle's center
    /// * `radius` - the radius of the keep-out circle (m). Must be nonnegative.
    pub fn sgmt_keep_out_circle(
        &mut self,
        from_index: usize,
        to_index: usize,
        x: f64,
        y: f64,
        radius: f64,
    ) {
        crate::ffi::DifferentialTrajectoryGenerator::sgmt_keep_out_circle(
            self.generator.pin_mut(),
            from_index,
            to_index,
            x,
            y,
            radius,
        );
    }

    /// Add a callback that will be called on each iteration of the solver.
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

    /// Generate the trajectory;
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
pub use ffi::MotorConfig;
pub use ffi::Pose2d;
pub use ffi::SwerveDrivetrain;
pub use ffi::SwerveTrajectory;
pub use ffi::SwerveTrajectorySample;
pub use ffi::Translation2d;

/// Solver error types.
pub mod error;
