use trajoptlib::{Pose2d, SwerveDrivetrain, SwerveModule, SwervePathBuilder};

fn main() {
    let drivetrain = SwerveDrivetrain {
        mass: 80.0,
        moi: 6.0,
        modules: vec![
            SwerveModule {
                x: 0.6,
                y: 0.6,
                wheel_radius: 0.04,
                wheel_max_angular_velocity: 70.0,
                wheel_max_torque: 0.9,
            },
            SwerveModule {
                x: 0.6,
                y: -0.6,
                wheel_radius: 0.04,
                wheel_max_angular_velocity: 70.0,
                wheel_max_torque: 0.9,
            },
            SwerveModule {
                x: -0.6,
                y: 0.6,
                wheel_radius: 0.04,
                wheel_max_angular_velocity: 70.0,
                wheel_max_torque: 0.9,
            },
            SwerveModule {
                x: -0.6,
                y: -0.6,
                wheel_radius: 0.04,
                wheel_max_angular_velocity: 70.0,
                wheel_max_torque: 0.9,
            },
        ],
    };

    let mut path = SwervePathBuilder::new();
    path.add_progress_callback(|traj, handle| println!("{:?}: handle {}", traj, handle));
    path.set_drivetrain(&drivetrain);
    path.set_bumpers(1.3, 1.3);
    path.pose_wpt(0, 0.0, 0.0, 0.0);
    // path.sgmt_initial_guess_points(
    //     0,
    //     &vec![
    //         Pose2d {
    //             x: 1.,
    //             y: 0.5,
    //             heading: -0.5,
    //         },
    //         Pose2d {
    //             x: 2.,
    //             y: -0.5,
    //             heading: -0.5,
    //         },
    //     ],
    // );
    // path.pose_wpt(1, 0.25, 0.0, 0.0);
    path.sgmt_initial_guess_points(
        0,
        &vec![Pose2d {
            x: 2.0,
            y: 0.0,
            heading: 0.0,
        }],
    );
    let end_idx = 1;
    path.pose_wpt(end_idx, 4.0, 0., 0.0);
    path.wpt_linear_velocity_max_magnitude(0, 0.0);
    path.wpt_linear_velocity_max_magnitude(end_idx, 0.0);
    path.wpt_angular_velocity_max_magnitude(0, 0.0);
    path.wpt_angular_velocity_max_magnitude(end_idx, 0.0);
    // path.sgmt_circle_obstacle(0, 1, 0.5, 0.1, 0.2);
    let counts = path.calculate_control_interval_counts();
    println!("counts; {:#?}", &counts);
    path.set_control_interval_counts(vec![4, 3, 2]);

    println!("setup complete");
    // path.calculate_control_interval_counts();
    // println!("linear: {:#?}", path.calculate_linear_initial_guess());
    println!("spline: {:#?}", path.calculate_spline_initial_guess());
    // println!("{:#?}", path.generate(true, 0));
}
