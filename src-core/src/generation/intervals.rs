use crate::spec::trajectory::Parameters;
use crate::ChoreoResult;

pub fn guess_control_interval_counts(params: &Parameters<f64>) -> ChoreoResult<Vec<usize>> {
    Ok(params
        .waypoints
        .iter()
        .map(|w| {
            if w.override_intervals {
                w.intervals
            } else {
                25
            }
        })
        .collect::<Vec<usize>>())
}
