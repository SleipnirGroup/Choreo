use core::f64;

use trajoptlib::{DifferentialDrivetrain, DifferentialPathBuilder, PathBuilder};

fn main() {
    let drivetrain = DifferentialDrivetrain {
        mass: 45.0,                                                                // kg
        moi: 6.0,                                                                  // kg m^2
        wheel_radius: 0.05,                                                        // m
        wheel_max_angular_velocity: 6000.0 * 2.0 * f64::consts::PI / (60.0 * 6.5), // motor rpm / 60 * 2pi / gear ratio
        wheel_max_torque: 0.9,                                                     // N m
        trackwidth: 0.5588,                                                        // m
    };

    let mut path = DifferentialPathBuilder::new();

    path.add_progress_callback(|trajectory, handle| {
        println!("{:?}: handle {}", trajectory, handle)
    });
    path.set_drivetrain(&drivetrain);
    path.set_bumpers(0.65, 0.65, 0.65, 0.65);

    path.pose_wpt(0, 0.0, 0.0, 0.0);
    path.pose_wpt(1, 1.0, 0.0, 0.0);

    path.wpt_angular_velocity_max_magnitude(0, 0.0);
    path.wpt_angular_velocity_max_magnitude(1, 0.0);
    // path.sgmt_keep_out_circle(0, 1, 0.5, 0.1, 0.2);

    path.set_control_interval_counts(vec![40]);

    println!("{:?}", path.generate(true, 0));
}
