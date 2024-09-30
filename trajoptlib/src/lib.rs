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
        modules: Vec<Translation2d>,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    struct DifferentialDrivetrain {
        mass: f64,
        moi: f64,
        trackwidth: f64,
        wheel_radius: f64,
        wheel_max_angular_velocity: f64,
        wheel_max_torque: f64,
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
        acceleration_l: f64,
        acceleration_r: f64,
        force_l: f64,
        force_r: f64,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    struct DifferentialTrajectory {
        samples: Vec<DifferentialTrajectorySample>,
    }

    unsafe extern "C++" {
        include!("RustFFI.hpp");

        type SwervePathBuilder;

        fn set_drivetrain(self: Pin<&mut SwervePathBuilder>, drivetrain: &SwerveDrivetrain);
        fn set_bumpers(
            self: Pin<&mut SwervePathBuilder>,
            front: f64,
            left: f64,
            right: f64,
            back: f64,
        );
        fn set_control_interval_counts(self: Pin<&mut SwervePathBuilder>, counts: Vec<usize>);

        fn pose_wpt(self: Pin<&mut SwervePathBuilder>, index: usize, x: f64, y: f64, heading: f64);
        fn translation_wpt(
            self: Pin<&mut SwervePathBuilder>,
            index: usize,
            x: f64,
            y: f64,
            heading_guess: f64,
        );
        fn empty_wpt(
            self: Pin<&mut SwervePathBuilder>,
            index: usize,
            x_guess: f64,
            y_guess: f64,
            heading_guess: f64,
        );

        fn sgmt_initial_guess_points(
            self: Pin<&mut SwervePathBuilder>,
            from_index: usize,
            guess_points: &Vec<Pose2d>,
        );

        fn wpt_linear_velocity_direction(
            self: Pin<&mut SwervePathBuilder>,
            index: usize,
            angle: f64,
        );
        fn wpt_linear_velocity_max_magnitude(
            self: Pin<&mut SwervePathBuilder>,
            index: usize,
            magnitude: f64,
        );
        fn wpt_angular_velocity_max_magnitude(
            self: Pin<&mut SwervePathBuilder>,
            index: usize,
            angular_velocity: f64,
        );
        fn wpt_linear_acceleration_max_magnitude(
            self: Pin<&mut SwervePathBuilder>,
            index: usize,
            magnitude: f64,
        );
        fn wpt_point_at(
            self: Pin<&mut SwervePathBuilder>,
            index: usize,
            field_point_x: f64,
            field_point_y: f64,
            heading_tolerance: f64,
            flip: bool,
        );
        fn wpt_keep_in_circle(
            self: Pin<&mut SwervePathBuilder>,
            index: usize,
            field_point_x: f64,
            field_point_y: f64,
            keep_in_radius: f64,
        );
        fn wpt_keep_in_polygon(
            self: Pin<&mut SwervePathBuilder>,
            index: usize,
            field_points_x: Vec<f64>,
            field_points_y: Vec<f64>,
        );
        fn wpt_keep_out_circle(
            self: Pin<&mut SwervePathBuilder>,
            index: usize,
            field_point_x: f64,
            field_point_y: f64,
            keep_in_radius: f64,
        );

        fn sgmt_linear_velocity_direction(
            self: Pin<&mut SwervePathBuilder>,
            from_index: usize,
            to_index: usize,
            angle: f64,
        );
        fn sgmt_linear_velocity_max_magnitude(
            self: Pin<&mut SwervePathBuilder>,
            from_index: usize,
            to_index: usize,
            magnitude: f64,
        );
        fn sgmt_angular_velocity_max_magnitude(
            self: Pin<&mut SwervePathBuilder>,
            from_index: usize,
            to_index: usize,
            angular_velocity: f64,
        );
        fn sgmt_linear_acceleration_max_magnitude(
            self: Pin<&mut SwervePathBuilder>,
            from_index: usize,
            to_index: usize,
            magnitude: f64,
        );
        fn sgmt_point_at(
            self: Pin<&mut SwervePathBuilder>,
            from_index: usize,
            to_index: usize,
            field_point_x: f64,
            field_point_y: f64,
            heading_tolerance: f64,
            flip: bool,
        );
        fn sgmt_keep_in_circle(
            self: Pin<&mut SwervePathBuilder>,
            from_index: usize,
            to_index: usize,
            field_point_x: f64,
            field_point_y: f64,
            keep_in_radius: f64,
        );
        pub fn sgmt_keep_in_polygon(
            self: Pin<&mut SwervePathBuilder>,
            from_index: usize,
            to_index: usize,
            field_points_x: Vec<f64>,
            field_points_y: Vec<f64>,
        );

        fn sgmt_keep_out_circle(
            self: Pin<&mut SwervePathBuilder>,
            from_index: usize,
            to_index: usize,
            x: f64,
            y: f64,
            radius: f64,
        );

        fn generate(
            self: &SwervePathBuilder,
            diagnostics: bool,
            uuid: i64,
        ) -> Result<SwerveTrajectory>;

        fn add_progress_callback(
            self: Pin<&mut SwervePathBuilder>,
            callback: fn(SwerveTrajectory, i64),
        );

        fn swerve_path_builder_new() -> UniquePtr<SwervePathBuilder>;

        type DifferentialPathBuilder;

        fn set_drivetrain(
            self: Pin<&mut DifferentialPathBuilder>,
            drivetrain: &DifferentialDrivetrain,
        );
        fn set_bumpers(
            self: Pin<&mut DifferentialPathBuilder>,
            front: f64,
            left: f64,
            right: f64,
            back: f64,
        );
        fn set_control_interval_counts(self: Pin<&mut DifferentialPathBuilder>, counts: Vec<usize>);

        fn pose_wpt(
            self: Pin<&mut DifferentialPathBuilder>,
            index: usize,
            x: f64,
            y: f64,
            heading: f64,
        );
        fn translation_wpt(
            self: Pin<&mut DifferentialPathBuilder>,
            index: usize,
            x: f64,
            y: f64,
            heading_guess: f64,
        );
        fn empty_wpt(
            self: Pin<&mut DifferentialPathBuilder>,
            index: usize,
            x_guess: f64,
            y_guess: f64,
            heading_guess: f64,
        );

        fn sgmt_initial_guess_points(
            self: Pin<&mut DifferentialPathBuilder>,
            from_index: usize,
            guess_points: &Vec<Pose2d>,
        );

        fn wpt_linear_velocity_direction(
            self: Pin<&mut DifferentialPathBuilder>,
            index: usize,
            angle: f64,
        );
        fn wpt_linear_velocity_max_magnitude(
            self: Pin<&mut DifferentialPathBuilder>,
            index: usize,
            magnitude: f64,
        );
        fn wpt_angular_velocity_max_magnitude(
            self: Pin<&mut DifferentialPathBuilder>,
            index: usize,
            angular_velocity: f64,
        );
        fn wpt_linear_acceleration_max_magnitude(
            self: Pin<&mut DifferentialPathBuilder>,
            index: usize,
            magnitude: f64,
        );
        fn wpt_point_at(
            self: Pin<&mut DifferentialPathBuilder>,
            index: usize,
            field_point_x: f64,
            field_point_y: f64,
            heading_tolerance: f64,
            flip: bool,
        );
        fn wpt_keep_in_circle(
            self: Pin<&mut DifferentialPathBuilder>,
            index: usize,
            field_point_x: f64,
            field_point_y: f64,
            keep_in_radius: f64,
        );
        fn wpt_keep_in_polygon(
            self: Pin<&mut DifferentialPathBuilder>,
            index: usize,
            field_points_x: Vec<f64>,
            field_points_y: Vec<f64>,
        );
        fn wpt_keep_out_circle(
            self: Pin<&mut DifferentialPathBuilder>,
            index: usize,
            field_point_x: f64,
            field_point_y: f64,
            keep_in_radius: f64,
        );

        fn sgmt_linear_velocity_direction(
            self: Pin<&mut DifferentialPathBuilder>,
            from_index: usize,
            to_index: usize,
            angle: f64,
        );
        fn sgmt_linear_velocity_max_magnitude(
            self: Pin<&mut DifferentialPathBuilder>,
            from_index: usize,
            to_index: usize,
            magnitude: f64,
        );
        fn sgmt_angular_velocity_max_magnitude(
            self: Pin<&mut DifferentialPathBuilder>,
            from_index: usize,
            to_index: usize,
            angular_velocity: f64,
        );
        fn sgmt_linear_acceleration_max_magnitude(
            self: Pin<&mut DifferentialPathBuilder>,
            from_index: usize,
            to_index: usize,
            magnitude: f64,
        );
        fn sgmt_keep_in_circle(
            self: Pin<&mut DifferentialPathBuilder>,
            from_index: usize,
            to_index: usize,
            field_point_x: f64,
            field_point_y: f64,
            keep_in_radius: f64,
        );
        pub fn sgmt_keep_in_polygon(
            self: Pin<&mut DifferentialPathBuilder>,
            from_index: usize,
            to_index: usize,
            field_points_x: Vec<f64>,
            field_points_y: Vec<f64>,
        );

        fn sgmt_keep_out_circle(
            self: Pin<&mut DifferentialPathBuilder>,
            from_index: usize,
            to_index: usize,
            x: f64,
            y: f64,
            radius: f64,
        );

        fn generate(
            self: &DifferentialPathBuilder,
            diagnostics: bool,
            uuid: i64,
        ) -> Result<DifferentialTrajectory>;

        fn add_progress_callback(
            self: Pin<&mut DifferentialPathBuilder>,
            callback: fn(DifferentialTrajectory, i64),
        );

        fn differential_path_builder_new() -> UniquePtr<DifferentialPathBuilder>;

        fn cancel_all();
    }
}

pub trait PathBuilder: Any {
    fn set_bumpers(&mut self, front: f64, left: f64, right: f64, back: f64);
    fn set_control_interval_counts(&mut self, counts: Vec<usize>);

    fn pose_wpt(&mut self, index: usize, x: f64, y: f64, heading: f64);
    fn translation_wpt(&mut self, index: usize, x: f64, y: f64, heading_guess: f64);
    fn empty_wpt(&mut self, index: usize, x_guess: f64, y_guess: f64, heading_guess: f64);

    #[allow(clippy::ptr_arg)]
    fn sgmt_initial_guess_points(&mut self, from_index: usize, guess_points: &Vec<Pose2d>);

    fn wpt_linear_velocity_direction(&mut self, index: usize, angle: f64);
    fn wpt_linear_velocity_max_magnitude(&mut self, index: usize, magnitude: f64);
    fn wpt_angular_velocity_max_magnitude(&mut self, index: usize, angular_velocity: f64);
    fn wpt_linear_acceleration_max_magnitude(&mut self, index: usize, magnitude: f64);
    fn wpt_point_at(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        heading_tolerance: f64,
        flip: bool,
    );
    fn wpt_keep_in_circle(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        keep_in_radius: f64,
    );
    fn wpt_keep_in_polygon(
        &mut self,
        index: usize,
        field_points_x: Vec<f64>,
        field_points_y: Vec<f64>,
    );
    fn wpt_keep_out_circle(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        keep_in_radius: f64,
    );

    fn sgmt_linear_velocity_direction(&mut self, from_index: usize, to_index: usize, angle: f64);
    fn sgmt_linear_velocity_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        magnitude: f64,
    );
    fn sgmt_angular_velocity_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        angular_velocity: f64,
    );
    fn sgmt_linear_acceleration_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        magnitude: f64,
    );
    fn sgmt_keep_in_circle(
        &mut self,
        from_index: usize,
        to_index: usize,
        field_point_x: f64,
        field_point_y: f64,
        keep_in_radius: f64,
    );
    fn sgmt_keep_in_polygon(
        &mut self,
        from_index: usize,
        to_index: usize,
        field_points_x: Vec<f64>,
        field_points_y: Vec<f64>,
    );

    fn sgmt_keep_out_circle(
        &mut self,
        from_index: usize,
        to_index: usize,
        x: f64,
        y: f64,
        radius: f64,
    );
}
pub struct SwervePathBuilder {
    path_builder: cxx::UniquePtr<crate::ffi::SwervePathBuilder>,
}
impl SwervePathBuilder {
    pub fn new() -> SwervePathBuilder {
        SwervePathBuilder {
            path_builder: crate::ffi::swerve_path_builder_new(),
        }
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
        crate::ffi::SwervePathBuilder::sgmt_point_at(
            self.path_builder.pin_mut(),
            from_index,
            to_index,
            field_point_x,
            field_point_y,
            heading_tolerance,
            flip,
        )
    }

    pub fn set_drivetrain(&mut self, drivetrain: &crate::ffi::SwerveDrivetrain) {
        crate::ffi::SwervePathBuilder::set_drivetrain(self.path_builder.pin_mut(), drivetrain);
    }

    ///
    /// Generate the trajectory;
    ///
    /// * diagnostics: If true, prints per-iteration details of the solver to
    ///   stdout.
    /// * handle: A number used to identify results from this generation in the
    ///   `add_progress_callback` callback. If `add_progress_callback` has not
    ///   been called, this value has no significance.
    ///
    /// Returns a result with either the final `trajopt::SwerveTrajectory`,
    /// or a TrajoptError if generation failed.
    pub fn generate(
        &self,
        diagnostics: bool,
        handle: i64,
    ) -> Result<SwerveTrajectory, TrajoptError> {
        match self.path_builder.generate(diagnostics, handle) {
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

    ///
    /// Add a callback that will be called on each iteration of the solver.
    ///
    /// * callback: a `fn` (not a closure) to be executed. The callback's first
    ///   parameter will be a `trajopt::SwerveTrajectory`, and the second
    ///   parameter will be an `i64` equal to the handle passed in `generate()`
    ///
    /// This function can be called multiple times to add multiple callbacks.
    pub fn add_progress_callback(&mut self, callback: fn(SwerveTrajectory, i64)) {
        crate::ffi::SwervePathBuilder::add_progress_callback(self.path_builder.pin_mut(), callback);
    }
}
impl PathBuilder for SwervePathBuilder {
    fn set_bumpers(&mut self, front: f64, left: f64, right: f64, back: f64) {
        crate::ffi::SwervePathBuilder::set_bumpers(
            self.path_builder.pin_mut(),
            front,
            left,
            right,
            back,
        );
    }

    fn set_control_interval_counts(&mut self, counts: Vec<usize>) {
        crate::ffi::SwervePathBuilder::set_control_interval_counts(
            self.path_builder.pin_mut(),
            counts,
        );
    }

    fn pose_wpt(&mut self, index: usize, x: f64, y: f64, heading: f64) {
        crate::ffi::SwervePathBuilder::pose_wpt(self.path_builder.pin_mut(), index, x, y, heading);
    }

    fn translation_wpt(&mut self, index: usize, x: f64, y: f64, heading_guess: f64) {
        crate::ffi::SwervePathBuilder::translation_wpt(
            self.path_builder.pin_mut(),
            index,
            x,
            y,
            heading_guess,
        );
    }

    fn empty_wpt(&mut self, index: usize, x_guess: f64, y_guess: f64, heading_guess: f64) {
        crate::ffi::SwervePathBuilder::empty_wpt(
            self.path_builder.pin_mut(),
            index,
            x_guess,
            y_guess,
            heading_guess,
        );
    }

    fn sgmt_initial_guess_points(
        &mut self,
        from_index: usize,
        guess_points: &Vec<crate::ffi::Pose2d>,
    ) {
        crate::ffi::SwervePathBuilder::sgmt_initial_guess_points(
            self.path_builder.pin_mut(),
            from_index,
            guess_points,
        );
    }

    fn wpt_linear_velocity_direction(&mut self, index: usize, angle: f64) {
        crate::ffi::SwervePathBuilder::wpt_linear_velocity_direction(
            self.path_builder.pin_mut(),
            index,
            angle,
        );
    }

    fn wpt_linear_velocity_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::SwervePathBuilder::wpt_linear_velocity_max_magnitude(
            self.path_builder.pin_mut(),
            index,
            magnitude,
        );
    }

    fn wpt_angular_velocity_max_magnitude(&mut self, index: usize, angular_velocity: f64) {
        crate::ffi::SwervePathBuilder::wpt_angular_velocity_max_magnitude(
            self.path_builder.pin_mut(),
            index,
            angular_velocity,
        );
    }

    fn wpt_linear_acceleration_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::SwervePathBuilder::wpt_linear_acceleration_max_magnitude(
            self.path_builder.pin_mut(),
            index,
            magnitude,
        );
    }

    fn wpt_point_at(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        heading_tolerance: f64,
        flip: bool,
    ) {
        crate::ffi::SwervePathBuilder::wpt_point_at(
            self.path_builder.pin_mut(),
            index,
            field_point_x,
            field_point_y,
            heading_tolerance,
            flip,
        )
    }

    fn wpt_keep_in_circle(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        keep_in_radius: f64,
    ) {
        crate::ffi::SwervePathBuilder::wpt_keep_in_circle(
            self.path_builder.pin_mut(),
            index,
            field_point_x,
            field_point_y,
            keep_in_radius,
        )
    }

    fn wpt_keep_in_polygon(
        &mut self,
        index: usize,
        field_points_x: Vec<f64>,
        field_points_y: Vec<f64>,
    ) {
        crate::ffi::SwervePathBuilder::wpt_keep_in_polygon(
            self.path_builder.pin_mut(),
            index,
            field_points_x,
            field_points_y,
        );
    }

    fn wpt_keep_out_circle(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        keep_in_radius: f64,
    ) {
        crate::ffi::SwervePathBuilder::wpt_keep_out_circle(
            self.path_builder.pin_mut(),
            index,
            field_point_x,
            field_point_y,
            keep_in_radius,
        )
    }

    fn sgmt_linear_velocity_direction(&mut self, from_index: usize, to_index: usize, angle: f64) {
        crate::ffi::SwervePathBuilder::sgmt_linear_velocity_direction(
            self.path_builder.pin_mut(),
            from_index,
            to_index,
            angle,
        );
    }

    fn sgmt_linear_velocity_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        magnitude: f64,
    ) {
        crate::ffi::SwervePathBuilder::sgmt_linear_velocity_max_magnitude(
            self.path_builder.pin_mut(),
            from_index,
            to_index,
            magnitude,
        );
    }

    fn sgmt_angular_velocity_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        angular_velocity: f64,
    ) {
        crate::ffi::SwervePathBuilder::sgmt_angular_velocity_max_magnitude(
            self.path_builder.pin_mut(),
            from_index,
            to_index,
            angular_velocity,
        );
    }

    fn sgmt_linear_acceleration_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        magnitude: f64,
    ) {
        crate::ffi::SwervePathBuilder::sgmt_linear_acceleration_max_magnitude(
            self.path_builder.pin_mut(),
            from_index,
            to_index,
            magnitude,
        );
    }

    fn sgmt_keep_in_circle(
        &mut self,
        from_index: usize,
        to_index: usize,
        field_point_x: f64,
        field_point_y: f64,
        keep_in_radius: f64,
    ) {
        crate::ffi::SwervePathBuilder::sgmt_keep_in_circle(
            self.path_builder.pin_mut(),
            from_index,
            to_index,
            field_point_x,
            field_point_y,
            keep_in_radius,
        )
    }

    fn sgmt_keep_in_polygon(
        &mut self,
        from_index: usize,
        to_index: usize,
        field_points_x: Vec<f64>,
        field_points_y: Vec<f64>,
    ) {
        crate::ffi::SwervePathBuilder::sgmt_keep_in_polygon(
            self.path_builder.pin_mut(),
            from_index,
            to_index,
            field_points_x,
            field_points_y,
        );
    }

    fn sgmt_keep_out_circle(
        &mut self,
        from_index: usize,
        to_index: usize,
        x: f64,
        y: f64,
        radius: f64,
    ) {
        crate::ffi::SwervePathBuilder::sgmt_keep_out_circle(
            self.path_builder.pin_mut(),
            from_index,
            to_index,
            x,
            y,
            radius,
        );
    }
}

impl Default for SwervePathBuilder {
    fn default() -> Self {
        Self::new()
    }
}

pub struct DifferentialPathBuilder {
    path_builder: cxx::UniquePtr<crate::ffi::DifferentialPathBuilder>,
}

impl DifferentialPathBuilder {
    pub fn new() -> DifferentialPathBuilder {
        DifferentialPathBuilder {
            path_builder: crate::ffi::differential_path_builder_new(),
        }
    }

    pub fn set_drivetrain(&mut self, drivetrain: &crate::ffi::DifferentialDrivetrain) {
        crate::ffi::DifferentialPathBuilder::set_drivetrain(
            self.path_builder.pin_mut(),
            drivetrain,
        );
    }

    ///
    /// Generate the trajectory;
    ///
    /// * diagnostics: If true, prints per-iteration details of the solver to
    ///   stdout.
    /// * handle: A number used to identify results from this generation in the
    ///   `add_progress_callback` callback. If `add_progress_callback` has not
    ///   been called, this value has no significance.
    ///
    /// Returns a result with either the final
    /// `trajopt::DifferentialTrajectory`, or TrajoptError
    /// generation failed.
    pub fn generate(
        &self,
        diagnostics: bool,
        handle: i64,
    ) -> Result<DifferentialTrajectory, TrajoptError> {
        match self.path_builder.generate(diagnostics, handle) {
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

    ///
    /// Add a callback that will be called on each iteration of the solver.
    ///
    /// * callback: a `fn` (not a closure) to be executed. The callback's first
    ///   parameter will be a `trajopt::DifferentialTrajectory`, and the second
    ///   parameter will be an `i64` equal to the handle passed in `generate()`
    ///
    /// This function can be called multiple times to add multiple callbacks.
    pub fn add_progress_callback(&mut self, callback: fn(DifferentialTrajectory, i64)) {
        crate::ffi::DifferentialPathBuilder::add_progress_callback(
            self.path_builder.pin_mut(),
            callback,
        );
    }
}
impl PathBuilder for DifferentialPathBuilder {
    fn set_bumpers(&mut self, front: f64, left: f64, right: f64, back: f64) {
        crate::ffi::DifferentialPathBuilder::set_bumpers(
            self.path_builder.pin_mut(),
            front,
            left,
            right,
            back,
        );
    }

    fn set_control_interval_counts(&mut self, counts: Vec<usize>) {
        crate::ffi::DifferentialPathBuilder::set_control_interval_counts(
            self.path_builder.pin_mut(),
            counts,
        );
    }

    fn pose_wpt(&mut self, index: usize, x: f64, y: f64, heading: f64) {
        crate::ffi::DifferentialPathBuilder::pose_wpt(
            self.path_builder.pin_mut(),
            index,
            x,
            y,
            heading,
        );
    }

    fn translation_wpt(&mut self, index: usize, x: f64, y: f64, heading_guess: f64) {
        crate::ffi::DifferentialPathBuilder::translation_wpt(
            self.path_builder.pin_mut(),
            index,
            x,
            y,
            heading_guess,
        );
    }

    fn empty_wpt(&mut self, index: usize, x_guess: f64, y_guess: f64, heading_guess: f64) {
        crate::ffi::DifferentialPathBuilder::empty_wpt(
            self.path_builder.pin_mut(),
            index,
            x_guess,
            y_guess,
            heading_guess,
        );
    }

    fn sgmt_initial_guess_points(
        &mut self,
        from_index: usize,
        guess_points: &Vec<crate::ffi::Pose2d>,
    ) {
        crate::ffi::DifferentialPathBuilder::sgmt_initial_guess_points(
            self.path_builder.pin_mut(),
            from_index,
            guess_points,
        );
    }

    fn wpt_linear_velocity_direction(&mut self, index: usize, angle: f64) {
        crate::ffi::DifferentialPathBuilder::wpt_linear_velocity_direction(
            self.path_builder.pin_mut(),
            index,
            angle,
        );
    }

    fn wpt_linear_velocity_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::DifferentialPathBuilder::wpt_linear_velocity_max_magnitude(
            self.path_builder.pin_mut(),
            index,
            magnitude,
        );
    }

    fn wpt_angular_velocity_max_magnitude(&mut self, index: usize, angular_velocity: f64) {
        crate::ffi::DifferentialPathBuilder::wpt_angular_velocity_max_magnitude(
            self.path_builder.pin_mut(),
            index,
            angular_velocity,
        );
    }

    fn wpt_linear_acceleration_max_magnitude(&mut self, index: usize, magnitude: f64) {
        crate::ffi::DifferentialPathBuilder::wpt_linear_acceleration_max_magnitude(
            self.path_builder.pin_mut(),
            index,
            magnitude,
        );
    }

    fn wpt_point_at(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        heading_tolerance: f64,
        flip: bool,
    ) {
        crate::ffi::DifferentialPathBuilder::wpt_point_at(
            self.path_builder.pin_mut(),
            index,
            field_point_x,
            field_point_y,
            heading_tolerance,
            flip,
        )
    }

    fn wpt_keep_in_circle(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        keep_in_radius: f64,
    ) {
        crate::ffi::DifferentialPathBuilder::wpt_keep_in_circle(
            self.path_builder.pin_mut(),
            index,
            field_point_x,
            field_point_y,
            keep_in_radius,
        )
    }

    fn wpt_keep_in_polygon(
        &mut self,
        index: usize,
        field_points_x: Vec<f64>,
        field_points_y: Vec<f64>,
    ) {
        crate::ffi::DifferentialPathBuilder::wpt_keep_in_polygon(
            self.path_builder.pin_mut(),
            index,
            field_points_x,
            field_points_y,
        );
    }

    fn wpt_keep_out_circle(
        &mut self,
        index: usize,
        field_point_x: f64,
        field_point_y: f64,
        keep_in_radius: f64,
    ) {
        crate::ffi::DifferentialPathBuilder::wpt_keep_out_circle(
            self.path_builder.pin_mut(),
            index,
            field_point_x,
            field_point_y,
            keep_in_radius,
        )
    }

    fn sgmt_linear_velocity_direction(&mut self, from_index: usize, to_index: usize, angle: f64) {
        crate::ffi::DifferentialPathBuilder::sgmt_linear_velocity_direction(
            self.path_builder.pin_mut(),
            from_index,
            to_index,
            angle,
        );
    }

    fn sgmt_linear_velocity_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        magnitude: f64,
    ) {
        crate::ffi::DifferentialPathBuilder::sgmt_linear_velocity_max_magnitude(
            self.path_builder.pin_mut(),
            from_index,
            to_index,
            magnitude,
        );
    }

    fn sgmt_angular_velocity_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        angular_velocity: f64,
    ) {
        crate::ffi::DifferentialPathBuilder::sgmt_angular_velocity_max_magnitude(
            self.path_builder.pin_mut(),
            from_index,
            to_index,
            angular_velocity,
        );
    }

    fn sgmt_linear_acceleration_max_magnitude(
        &mut self,
        from_index: usize,
        to_index: usize,
        magnitude: f64,
    ) {
        crate::ffi::DifferentialPathBuilder::sgmt_linear_acceleration_max_magnitude(
            self.path_builder.pin_mut(),
            from_index,
            to_index,
            magnitude,
        );
    }

    fn sgmt_keep_in_circle(
        &mut self,
        from_index: usize,
        to_index: usize,
        field_point_x: f64,
        field_point_y: f64,
        keep_in_radius: f64,
    ) {
        crate::ffi::DifferentialPathBuilder::sgmt_keep_in_circle(
            self.path_builder.pin_mut(),
            from_index,
            to_index,
            field_point_x,
            field_point_y,
            keep_in_radius,
        )
    }

    fn sgmt_keep_in_polygon(
        &mut self,
        from_index: usize,
        to_index: usize,
        field_points_x: Vec<f64>,
        field_points_y: Vec<f64>,
    ) {
        crate::ffi::DifferentialPathBuilder::sgmt_keep_in_polygon(
            self.path_builder.pin_mut(),
            from_index,
            to_index,
            field_points_x,
            field_points_y,
        );
    }

    fn sgmt_keep_out_circle(
        &mut self,
        from_index: usize,
        to_index: usize,
        x: f64,
        y: f64,
        radius: f64,
    ) {
        crate::ffi::DifferentialPathBuilder::sgmt_keep_out_circle(
            self.path_builder.pin_mut(),
            from_index,
            to_index,
            x,
            y,
            radius,
        );
    }
}

impl Default for DifferentialPathBuilder {
    fn default() -> Self {
        Self::new()
    }
}

pub fn cancel_all() {
    crate::ffi::cancel_all();
}

use std::any::Any;

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
