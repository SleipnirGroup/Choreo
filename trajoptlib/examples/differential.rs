use std::f64;

use trajoptlib::{DifferentialDrivetrain, DifferentialTrajectoryGenerator};

fn main() {
    let drivetrain = DifferentialDrivetrain {
        // kg
        mass: 45.0,
        // kg-m²
        moi: 6.0,
        // m
        wheel_radius: 0.05,
        // motor rpm / 60 * 2pi / gear ratio
        wheel_max_angular_velocity: 6000.0 * 2.0 * f64::consts::PI / (60.0 * 6.5),
        // N-m
        wheel_max_torque: 0.9,
        // unitless
        wheel_cof: 1.5,
        motor_curve_enabled: true,
        // rad/s
        wheel_free_angular_velocity: 6000.0 * 2.0 * f64::consts::PI / (60.0 * 6.5),
        // N-m
        wheel_stall_torque: 7.09 * 6.5,
        // m
        trackwidth: 0.5588,
    };

    let mut generator = DifferentialTrajectoryGenerator::new();

    generator.add_callback(|trajectory, handle| println!("{:?}: handle {}", trajectory, handle));
    generator.set_drivetrain(&drivetrain);
    generator.set_bumpers(0.65, 0.65, 0.65, 0.65);

    generator.pose_wpt(0, 0.0, 0.0, 0.0);
    generator.pose_wpt(1, 1.0, 0.0, 0.0);

    generator.wpt_angular_velocity_max_magnitude(0, 0.0);
    generator.wpt_angular_velocity_max_magnitude(1, 0.0);
    // generator.sgmt_keep_out_circle(0, 1, 0.5, 0.1, 0.2);

    generator.set_control_interval_counts(vec![40]);

    println!("{:?}", generator.generate(true, 0));
}
