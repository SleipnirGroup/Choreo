use trajoptlib::{SwerveDrivetrain, SwerveTrajectoryGenerator, Translation2d};

fn main() {
    let drivetrain = SwerveDrivetrain {
        // kg
        mass: 45.0,
        // kg-m²
        moi: 6.0,
        // m
        wheel_radius: 0.04,
        // rad/s
        wheel_max_angular_velocity: 70.0,
        // N-m
        wheel_max_torque: 2.0,
        // unitless
        wheel_cof: 1.5,
        // m
        modules: vec![
            Translation2d { x: 0.6, y: 0.6 },
            Translation2d { x: 0.6, y: -0.6 },
            Translation2d { x: -0.6, y: 0.6 },
            Translation2d { x: -0.6, y: -0.6 },
        ],
    };

    let mut generator = SwerveTrajectoryGenerator::new();

    generator.add_callback(|trajectory, handle| println!("{:?}: handle {}", trajectory, handle));
    generator.set_drivetrain(&drivetrain);
    generator.set_bumpers(0.65, 0.65, 0.65, 0.65);

    generator.pose_wpt(0, 0.0, 0.0, 0.0);
    generator.pose_wpt(1, 1.0, 0.0, 0.0);

    generator.wpt_angular_velocity_max_magnitude(0, 0.0);
    generator.wpt_angular_velocity_max_magnitude(1, 0.0);
    generator.sgmt_keep_out_circle(0, 1, 0.5, 0.1, 0.2);

    generator.set_control_interval_counts(vec![40]);

    println!("{:?}", generator.generate(true, 0));
}
