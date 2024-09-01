// use super::types::{Constraint, Expr, RobotConfig, Traj, Waypoint, expr};
use super::types::{expr, Traj};
// use crate::document::types::ConstraintData;
use crate::error::ChoreoError;
use crate::util::math_util::angle_modulus;
use crate::Result;

// A value version since commands don't support borrows, but we need the borrow
// version for generation.
#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn cmd_adjust_waypoint_headings(traj: Traj) -> Result<Traj> {
    adjust_waypoint_headings(&traj)
}

pub fn adjust_waypoint_headings(traj: &Traj) -> Result<Traj> {
    let mut modified_traj = traj.clone();
    let mut snapshot = traj.path.snapshot();
    let mut new_headings = vec![0f64; snapshot.waypoints.len()];
    let mut heading_fixed_references = vec![0u8; snapshot.waypoints.len()];
    let mut last_fixed_idx = 0;

    for (idx, wpt) in snapshot.waypoints.iter().enumerate() {
        if idx == 0 && !wpt.fix_heading {
            return Err(ChoreoError::HeadingConflict(idx));
        }
        if wpt.fix_heading {
            // set heading for fixed heading wpt
            new_headings[idx] = wpt.heading;
            heading_fixed_references[idx] += 1;
            if idx > 0 {
                // interpolate headings from last fixed idx
                let start = snapshot.waypoints[last_fixed_idx].heading;
                let dtheta = angle_modulus(wpt.heading - start);
                for interp_idx in last_fixed_idx + 1..idx {
                    let scalar =
                        (interp_idx - last_fixed_idx) as f64 / (idx - last_fixed_idx) as f64;
                    new_headings[interp_idx] = start + scalar * dtheta;
                }
            }
            last_fixed_idx = idx;
        }
    }
    modified_traj
        .path
        .waypoints
        .iter_mut()
        .zip(snapshot.waypoints.iter_mut())
        .zip(new_headings.into_iter())
        .for_each(|((path_wpt, snap_wpt), new_heading)| {
            path_wpt.heading = expr(format!("{new_heading} rad").as_str(), new_heading);
            snap_wpt.heading = new_heading;
        });
    modified_traj.snapshot = Some(snapshot);
    Ok(modified_traj)
}
