use choreo_document::{
    ConstraintVariant, DifferentialSample, IncompleteTrajectoryProgressMessage, MotorConfig,
    ProgressUpdateMessage, ProjectFile, TrajectoryFile, WaypointId,
};
use serde_json::{Value, json};

fn expr(value: f64) -> Value {
    json!({ "exp": value.to_string(), "val": value })
}

fn robot_config() -> Value {
    let wheel = json!({ "x": expr(0.25), "y": expr(0.25) });
    json!({
        "mass": expr(50.0),
        "inertia": expr(5.0),
        "gearing": expr(6.75),
        "radius": expr(0.05),
        "cof": expr(1.2),
        "differential_track_width": expr(0.6),
        "wheels": [wheel.clone(), wheel.clone(), wheel.clone(), wheel],
        "bumpers": [],
        "motor": {
            "free_speed": expr(600.0),
            "stall_torque": expr(3.0),
            "kT": expr(0.02),
            "kV": expr(0.02),
            "supply_limit": expr(40.0),
            "stator_limit": expr(80.0)
        }
    })
}

#[test]
fn project_file_round_trips_schema_field_names() {
    let input = json!({
        "uuid": "project-id",
        "name": "Test Project",
        "version": 4,
        "type": "Swerve",
        "variables": {
            "expressions": {},
            "translations": {},
            "poses": {},
            "regions": {}
        },
        "config": robot_config(),
        "codegen": {
            "root": "",
            "genVars": true,
            "genTrajData": true,
            "useChoreoLib": true
        }
    });

    let project: ProjectFile = serde_json::from_value(input.clone()).unwrap();
    assert!(project.variables.expressions.is_empty());
    assert!(project.variables.translations.is_empty());
    assert!(project.variables.poses.is_empty());
    assert!(project.variables.regions.is_empty());
    let output = serde_json::to_value(project).unwrap();

    assert_eq!(output["variables"], json!({}));
    assert_eq!(output["uuid"], input["uuid"]);
    assert_eq!(output["name"], input["name"]);
    assert_eq!(output["version"], input["version"]);
    assert_eq!(output["type"], input["type"]);
    assert_eq!(output["codegen"], input["codegen"]);
    assert_eq!(output["config"]["motor"]["kT"], expr(0.02));
    assert_eq!(output["config"]["motor"]["kV"], expr(0.02));
}

#[test]
fn ungenerated_trajectory_accepts_omitted_nullable_fields() {
    let input = json!({
        "uuid": "trajectory-id",
        "name": "Test Trajectory",
        "version": 4,
        "params": {
            "waypoints": [],
            "constraints": [],
            "target_dt": expr(0.05)
        },
        "events": []
    });

    let trajectory: TrajectoryFile = serde_json::from_value(input.clone()).unwrap();
    assert!(trajectory.config.is_none());
    assert!(trajectory.snapshot.is_none());
    assert!(trajectory.trajectory.is_none());
    assert_eq!(serde_json::to_value(trajectory).unwrap(), input);
}

#[test]
fn unions_preserve_their_wire_representation() {
    let first: WaypointId = serde_json::from_value(json!("first")).unwrap();
    let by_uuid: WaypointId = serde_json::from_value(json!({ "uuid": "waypoint-id" })).unwrap();
    assert_eq!(serde_json::to_value(first).unwrap(), json!("first"));
    assert_eq!(
        serde_json::to_value(by_uuid).unwrap(),
        json!({ "uuid": "waypoint-id" })
    );

    let constraint_json = json!({
        "type": "MaxVelocity",
        "max": expr(4.5)
    });
    let constraint: ConstraintVariant = serde_json::from_value(constraint_json.clone()).unwrap();
    assert_eq!(serde_json::to_value(constraint).unwrap(), constraint_json);
}

#[test]
fn progress_and_sample_camel_case_fields_round_trip() {
    let progress_json = json!({
        "version": 1,
        "event": "incompleteTrajectory",
        "driveType": "Swerve",
        "sampleCount": 0,
        "sampleStructType": "struct:HolonomicSample",
        "sampleStructSize": 64,
        "samplesBase64": ""
    });
    let progress: ProgressUpdateMessage = serde_json::from_value(progress_json.clone()).unwrap();
    assert!(matches!(
        progress,
        ProgressUpdateMessage::IncompleteTrajectoryProgressMessage(
            IncompleteTrajectoryProgressMessage {
                sample_count: 0,
                ..
            }
        )
    ));
    assert_eq!(serde_json::to_value(progress).unwrap(), progress_json);

    let sample_json = json!({
        "time": 0.0,
        "pose": {
            "translation": { "x": 1.0, "y": 2.0 },
            "rotation": { "radians": 0.5 }
        },
        "velocity": { "vx": 1.0, "vy": 0.0, "omega": 0.1 },
        "acceleration": { "ax": 0.5, "ay": 0.0, "alpha": 0.01 },
        "leftVelocity": 0.9,
        "rightVelocity": 1.1
    });
    let sample: DifferentialSample = serde_json::from_value(sample_json.clone()).unwrap();
    assert_eq!(serde_json::to_value(sample).unwrap(), sample_json);
}

#[test]
fn motor_config_rejects_legacy_field_names() {
    let mut motor = robot_config()["motor"].clone();
    motor["kt"] = motor["kT"].take();

    assert!(serde_json::from_value::<MotorConfig>(motor).is_err());
}
