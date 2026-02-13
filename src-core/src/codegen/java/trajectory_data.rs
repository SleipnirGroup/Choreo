use crate::{
    codegen::{TRAJ_DATA_FILENAME, validate_name::validate_name},
    spec::trajectory::{Sample, TrajectoryFile},
};

#[derive(Clone)]
struct Pose2d {
    x: f64,
    y: f64,
    heading: f64,
}
impl From<&Sample> for Pose2d {
    fn from(value: &Sample) -> Self {
        Pose2d {
            x: value.x(),
            y: value.y(),
            heading: value.heading(),
        }
    }
}
impl Pose2d {
    pub fn to_java_code(&self) -> String {
        format!(
            "new Pose2d({}, {}, Rotation2d.fromRadians({}))",
            self.x, self.y, self.heading
        )
    }
}

#[derive(Clone)]
struct TrajEntry {
    var_name: String,
    traj_name: String,
    map_name: String,
    segment: Option<usize>,
    total_time_secs: f64,
    first_pose: Pose2d,
    last_pose: Pose2d,
}
impl From<&TrajectoryFile> for Vec<TrajEntry> {
    fn from(traj: &TrajectoryFile) -> Self {
        let mut entries = Vec::new();
        if let Some(first_sample) = traj.trajectory.samples.first()
            && let Some(last_sample) = traj.trajectory.samples.last()
        {
            entries.push(TrajEntry {
                var_name: traj.name.clone(),
                traj_name: traj.name.clone(),
                map_name: traj.name.clone(),
                segment: None,
                total_time_secs: last_sample.t(),
                first_pose: Pose2d::from(first_sample),
                last_pose: Pose2d::from(last_sample),
            });

            let split_intervals = [
                traj.trajectory.splits.clone(),
                [traj.trajectory.samples.len() - 1].to_vec(),
            ]
            .concat();
            if split_intervals.len() <= 2 {
                return entries;
            };
            for (i, intervals) in split_intervals.windows(2).enumerate() {
                // These should never fail, but Rust can't yet determine that intervals is actually a size 2 array.
                if let Some(first_sample) = intervals
                    .first()
                    .and_then(|start| traj.trajectory.samples.get(*start))
                    && let Some(last_sample) = intervals
                        .last()
                        .and_then(|end| traj.trajectory.samples.get(*end))
                {
                    let var_name = format!("{}${i}", traj.name);
                    let traj_name = traj.name.clone();
                    entries.push(TrajEntry {
                        var_name: var_name.clone(),
                        traj_name: traj_name.clone(),
                        map_name: var_name.clone(),
                        segment: Some(i),
                        total_time_secs: last_sample.t() - first_sample.t(),
                        first_pose: Pose2d::from(first_sample),
                        last_pose: Pose2d::from(last_sample),
                    });
                }
            }
        }
        entries
    }
}

impl TrajEntry {
    pub fn to_java_code(&self) -> String {
        let var_name = &self.var_name;
        let traj_name = &self.traj_name;
        let segment = match self.segment {
            Some(i) => format!("OptionalInt.of({i})"),
            None => "OptionalInt.empty()".to_string(),
        };
        let total_time_secs = self.total_time_secs;
        let first_pose = self.first_pose.to_java_code();
        let last_pose = self.last_pose.to_java_code();
        let err_msg = match validate_name(var_name) {
            Ok(_) => String::new(),
            Err(e) => e.javadoc_comment(),
        };
        format!(
            r#"{err_msg}public static final ChoreoTraj {var_name} = new ChoreoTraj(
    "{traj_name}",
    {segment},
    {total_time_secs},
    {first_pose},
    {last_pose}
);"#
        )
    }
}

const CHOREOLIB_HELPERS: &str = r#"
    // If these methods cause errors because you're not using ChoreoLib,
    // turn off "Include ChoreoLib-specific Helpers" in Choreo's codegen settings.
    /**
     * Load an AutoTrajectory directly from a ChoreoTraj, which may be a segment of a larger trajectory.
     */
    public AutoTrajectory asAutoTraj(AutoRoutine routine) {
        if (this.segment.isPresent()) {
            return routine.trajectory(this.name, this.segment.getAsInt());
        }
        return routine.trajectory(this.name);
    }"#;
const CHOREOLIB_HELPER_IMPORTS: &str = r#"import choreo.auto.AutoRoutine;
import choreo.auto.AutoTrajectory;
// If the 2 imports above cause errors because you're not using ChoreoLib,
// turn off "Include ChoreoLib-specific Helpers" in Choreo's codegen settings."#;

pub fn traj_file_contents(
    trajs: Vec<TrajectoryFile>,
    package_name: String,
    is_using_choreolib: bool,
) -> String {
    let trajectories = trajs
        .iter()
        .map(Vec::<TrajEntry>::from)
        .collect::<Vec<Vec<TrajEntry>>>()
        .concat();
    let extra_imports = if is_using_choreolib {
        CHOREOLIB_HELPER_IMPORTS
    } else {
        ""
    };
    let extra_helpers = if is_using_choreolib {
        CHOREOLIB_HELPERS
    } else {
        ""
    };
    let traj_list = trajectories
        .iter()
        .map(TrajEntry::to_java_code)
        .map(|item| item.replace("\n", "\n\t"))
        .collect::<Vec<String>>()
        .join("\n\t");
    let traj_map = trajectories
        .iter()
        .map(|entry| format!("\tMap.entry(\"{}\", {})", entry.map_name, entry.var_name))
        .collect::<Vec<String>>()
        .join(",\n\t");
    format!(
        r#"package {package_name};

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import java.util.Map;
import java.util.OptionalInt;

{extra_imports}

/**
 * A class containing the name, start pose, end pose, and total time of every Choreo trajectory.
 * This prevents your code from referencing deleted or misspelled trajectories,
 * and removes the need for JSON parsing to load a trajectory's essential data.
 * DO NOT MODIFY THIS FILE YOURSELF! It is automatically generated by Choreo.
 */
public record {TRAJ_DATA_FILENAME}(
    String name,
    OptionalInt segment,
    double totalTimeSecs,
    Pose2d initialPoseBlue,
    Pose2d endPoseBlue
) {{
    {traj_list}

    /**
     * A map between trajectory names and their corresponding data.
     * This allows for trajectory data to be looked up with strings during runtime.
     */
    public static final Map<String, ChoreoTraj> ALL_TRAJECTORIES = Map.ofEntries(
    {traj_map}
    );

    /**
     * Looks up the ChoreoTraj segment of the given overall ChoreoTraj.
     * WARNING: will raise an exception if not called with a valid segment index.
     */
    public ChoreoTraj segment(int segment) {{
        var traj = ChoreoTraj.ALL_TRAJECTORIES.get(this.name + "$" + segment);
        if (traj == null) {{
            throw new NullPointerException("Trajectory " + this.name + " does not have segment #" + segment + ".");
        }}
        return traj;
    }}
    {extra_helpers}
}}
"#
    )
}
