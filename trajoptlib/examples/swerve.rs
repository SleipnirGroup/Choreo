use trajoptlib::{SwerveDrivetrain, SwervePathBuilder, Translation2d};

fn main() {
    let drivetrain = SwerveDrivetrain {
        mass: 45.0,
        moi: 6.0,
        wheel_radius: 0.04,
        wheel_max_angular_velocity: 70.0,
        wheel_max_torque: 2.0,
        modules: vec![
            Translation2d { x: 0.6, y: 0.6 },
            Translation2d { x: 0.6, y: -0.6 },
            Translation2d { x: -0.6, y: 0.6 },
            Translation2d { x: -0.6, y: -0.6 },
        ],
    };

    let mut path = SwervePathBuilder::new();

    path.add_progress_callback(|traj, handle| println!("{:?}: handle {}", traj, handle));
    path.set_drivetrain(&drivetrain);
    path.set_bumpers(1.3, 1.3);

    path.pose_wpt(0, 0.0, 0.0, 0.0);
    path.pose_wpt(1, 1.0, 0.0, 0.0);

    path.wpt_angular_velocity_max_magnitude(0, 0.0);
    path.wpt_angular_velocity_max_magnitude(1, 0.0);
    path.sgmt_circle_obstacle(0, 1, 0.5, 0.1, 0.2);

    path.set_control_interval_counts(vec![40]);

    println!("{:?}", path.generate(true, 0));
}
