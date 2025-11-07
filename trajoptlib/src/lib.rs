#[cxx::bridge(namespace = "trajopt::rsffi")]
mod ffi {
    #[derive(Debug, Deserialize, Serialize, Clone)]
    struct Translation2d {
        x: f64,
        y: f64,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    struct SwerveDrivetrain {
        mass: f64,
        moi: f64,
        wheel_radius: f64,
        wheel_max_angular_velocity: f64,
        wheel_max_torque: f64,
        wheel_cof: f64,
        modules: Vec<Translation2d>,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    struct DifferentialDrivetrain {
        mass: f64,
        moi: f64,
        wheel_radius: f64,
        wheel_max_angular_velocity: f64,
        wheel_max_torque: f64,
        wheel_cof: f64,
        trackwidth: f64,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    struct Pose2d {
        x: f64,
        y: f64,
        heading: f64,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    struct SwerveTrajectorySample {
        timestamp: f64,
        x: f64,
        y: f64,
        heading: f64,
        velocity_x: f64,
        velocity_y: f64,
        angular_velocity: f64,
        acceleration_x: f64,
        acceleration_y: f64,
        angular_acceleration: f64,
        module_forces_x: Vec<f64>,
        module_forces_y: Vec<f64>,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    struct SwerveTrajectory {
        samples: Vec<SwerveTrajectorySample>,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    struct DifferentialTrajectorySample {
        timestamp: f64,
        x: f64,
        y: f64,
        heading: f64,
        velocity_l: f64,
        velocity_r: f64,
        angular_velocity: f64,
        acceleration_l: f64,
        acceleration_r: f64,
        angular_acceleration: f64,
        force_l: f64,
        force_r: f64,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    struct DifferentialTrajectory {
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

pub struct SwerveTrajectoryGenerator {
    generator: cxx::UniquePtr<crate::ffi::SwerveTrajectoryGenerator>,
}

impl Default for SwerveTrajectoryGenerator {
    fn default() -> Self {
        Self::new()
    }
}

impl SwerveTrajectoryGenerator {
    pub fn new() -> SwerveTrajectoryGenerator {
        SwerveTrajectoryGenerator {
            generator: crate::ffi::swerve_trajectory_generator_new(),
        }
    }

    pub fn set_drivetrain(&mut self, drivetrain: &crate::ffi::SwerveDrivetrain) {
        crate::ffi::SwerveTrajectoryGenerator::set_drivetrain(self.generator.pin_mut(), drivetrain);
    }

    pub fn set_bumpers(&mut self, front: f64, left: f64, right: f64, back: f64) {
        crate::ffi::SwerveTrajectoryGenerator::set_bumpers(
            self.generator.pin_mut(),
            front,
            left,
            right,
            back,
        );
    }

    pub fn set_control_interval_counts(&mut self, counts: Vec<usize>) {
        crate::ffi::SwerveTrajectoryGenerator::set_control_interval_counts(
            self.generator.pin_mut(),
            counts,
        );
    }

    // Constraints with waypoint scope

    pub fn pose_wpt(&mut self, index: usize, x: f64, y: f64, heading: f64) {
        crate::ffi::SwerveTrajectoryGenerator::pose_wpt(
            self.generator.pin_mut(),
            index,
            x,
            y,
            heading,
        );
    }

    pub fn translation_wpt(&mut self, index: usize, x: f64, y: f64, heading_guess: f64) {
        crate::ffi::SwerveTrajectoryGenerator::translation_wpt(
            self.generator.pin_mut(),
            index,
            x,
            y,
            heading_guess,
        );
    }

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

    pub fn wpt_linear_velocity_direction(&mut self, index: usize, angle: f64) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_linear_velocity_direction(
            self.generator.pin_mut(),
            index,
            angle,
        );
    }

    pub fn wpt_linear_velocity_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_linear_velocity_max_magnitude(
            self.generator.pin_mut(),
            index,
            magnitude,
        );
    }

    pub fn wpt_angular_velocity_max_magnitude(&mut self, index: usize, angular_velocity: f64) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_angular_velocity_max_magnitude(
            self.generator.pin_mut(),
            index,
            angular_velocity,
        );
    }

    pub fn wpt_linear_acceleration_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::SwerveTrajectoryGenerator::wpt_linear_acceleration_max_magnitude(
            self.generator.pin_mut(),
            index,
            magnitude,
        );
    }

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

    ///
    /// Add a callback that will be called on each iteration of the solver.
    ///
    /// * callback: a `fn` (not a closure) to be executed. The callback's first
    ///   parameter will be a `trajopt::SwerveTrajectory`, and the second
    ///   parameter will be an `i64` equal to the handle passed in `generate()`
    ///
    /// This function can be called multiple times to add multiple callbacks.
    pub fn add_callback(&mut self, callback: fn(SwerveTrajectory, i64)) {
        crate::ffi::SwerveTrajectoryGenerator::add_callback(self.generator.pin_mut(), callback);
    }

    ///
    /// Generate the trajectory;
    ///
    /// * diagnostics: If true, prints per-iteration details of the solver to
    ///   stdout.
    /// * handle: A number used to identify results from this generation in the
    ///   `add_callback` callback. If `add_callback` has not been called, this
    ///   value has no significance.
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

pub struct DifferentialTrajectoryGenerator {
    generator: cxx::UniquePtr<crate::ffi::DifferentialTrajectoryGenerator>,
}

impl Default for DifferentialTrajectoryGenerator {
    fn default() -> Self {
        Self::new()
    }
}

impl DifferentialTrajectoryGenerator {
    pub fn new() -> DifferentialTrajectoryGenerator {
        DifferentialTrajectoryGenerator {
            generator: crate::ffi::differential_trajectory_generator_new(),
        }
    }

    pub fn set_drivetrain(&mut self, drivetrain: &crate::ffi::DifferentialDrivetrain) {
        crate::ffi::DifferentialTrajectoryGenerator::set_drivetrain(
            self.generator.pin_mut(),
            drivetrain,
        );
    }

    pub fn set_bumpers(&mut self, front: f64, left: f64, right: f64, back: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::set_bumpers(
            self.generator.pin_mut(),
            front,
            left,
            right,
            back,
        );
    }

    pub fn set_control_interval_counts(&mut self, counts: Vec<usize>) {
        crate::ffi::DifferentialTrajectoryGenerator::set_control_interval_counts(
            self.generator.pin_mut(),
            counts,
        );
    }

    // Pose constraints

    pub fn pose_wpt(&mut self, index: usize, x: f64, y: f64, heading: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::pose_wpt(
            self.generator.pin_mut(),
            index,
            x,
            y,
            heading,
        );
    }

    pub fn translation_wpt(&mut self, index: usize, x: f64, y: f64, heading_guess: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::translation_wpt(
            self.generator.pin_mut(),
            index,
            x,
            y,
            heading_guess,
        );
    }

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

    pub fn wpt_linear_velocity_direction(&mut self, index: usize, angle: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_linear_velocity_direction(
            self.generator.pin_mut(),
            index,
            angle,
        );
    }

    pub fn wpt_linear_velocity_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_linear_velocity_max_magnitude(
            self.generator.pin_mut(),
            index,
            magnitude,
        );
    }

    pub fn wpt_angular_velocity_max_magnitude(&mut self, index: usize, angular_velocity: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_angular_velocity_max_magnitude(
            self.generator.pin_mut(),
            index,
            angular_velocity,
        );
    }

    pub fn wpt_linear_acceleration_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::DifferentialTrajectoryGenerator::wpt_linear_acceleration_max_magnitude(
            self.generator.pin_mut(),
            index,
            magnitude,
        );
    }

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

    ///
    /// Add a callback that will be called on each iteration of the solver.
    ///
    /// * callback: a `fn` (not a closure) to be executed. The callback's first
    ///   parameter will be a `trajopt::DifferentialTrajectory`, and the second
    ///   parameter will be an `i64` equal to the handle passed in `generate()`
    ///
    /// This function can be called multiple times to add multiple callbacks.
    pub fn add_callback(&mut self, callback: fn(DifferentialTrajectory, i64)) {
        crate::ffi::DifferentialTrajectoryGenerator::add_callback(
            self.generator.pin_mut(),
            callback,
        );
    }

    ///
    /// Generate the trajectory;
    ///
    /// * diagnostics: If true, prints per-iteration details of the solver to
    ///   stdout.
    /// * handle: A number used to identify results from this generation in the
    ///   `add_callback` callback. If `add_callback` has not been called, this
    ///   value has no significance.
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

pub mod error;
