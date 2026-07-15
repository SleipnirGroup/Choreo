/* eslint-disable */
/**
 * Auto-generated from document/schema.json.
 * Run "pnpm --dir document/ts generate" to regenerate.
 */

/**
 * The drive topology of the robot.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "DriveType".
 */
export type DriveType = "Swerve" | "Differential";
/**
 * Which samples a constraint applies to.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "ConstraintScope".
 */
export type ConstraintScope = "both" | "waypoint" | "segment";
/**
 * A stable persisted UUID string.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "UUID".
 */
export type UUID = string;
/**
 * Identifies a waypoint by UUID or by a first/last sentinel string.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "WaypointID".
 */
export type WaypointID =
  | {
      uuid: UUID;
    }
  | "first"
  | "last";
/**
 * A typed constraint; discriminated by the 'type' string field.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "ConstraintVariant".
 */
export type ConstraintVariant = MaxVelocity | MaxAngularVelocity | KeepInCircle | HeadingConstraint;
/**
 * All supported JSON progress update messages emitted by the C++ progress-update-sender.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "ProgressUpdateMessage".
 */
export type ProgressUpdateMessage =
  | IncompleteTrajectoryProgressMessage
  | DiagnosticProgressMessage
  | ErrorProgressMessage
  | CompleteTrajectoryProgressMessage;

/**
 * JSON schema covering every struct/enum in document/cpp that has to_json or from_json defined.
 */
export interface ChoreoDocumentSchema {
  [k: string]: unknown;
}
/**
 * A mathematical expression paired with a pre-evaluated numeric value in SI base units.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "Expr".
 */
export interface Expr {
  /**
   * MathJS expression string (e.g. '1.5 * kg', '90 deg')
   */
  exp: string;
  /**
   * Pre-evaluated SI base-unit value (e.g. metres, radians, kg, s)
   */
  val: number;
}
/**
 * A 2D translation parameterized by Expr values (metres).
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "Translation2e".
 */
export interface Translation2E {
  /**
   * X coordinate (m)
   */
  x: Expr;
  /**
   * Y coordinate (m)
   */
  y: Expr;
}
/**
 * A 2D pose parameterized by Expr values.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "Pose2e".
 */
export interface Pose2E {
  /**
   * X coordinate (m)
   */
  x: Expr;
  /**
   * Y coordinate (m)
   */
  y: Expr;
  /**
   * Heading (rad)
   */
  heading: Expr;
}
/**
 * A 2D oriented rectangular/elliptical region parameterized by Expr values.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "Region2e".
 */
export interface Region2E {
  /**
   * Center X (m)
   */
  x: Expr;
  /**
   * Center Y (m)
   */
  y: Expr;
  /**
   * Rotation (rad)
   */
  heading: Expr;
  /**
   * Width (m)
   */
  w: Expr;
  /**
   * Height (m)
   */
  h: Expr;
}
/**
 * A 2D force vector in newtons (choreo::ForceVector2d / wpi::math::ForceVector2d).
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "ForceVector2d".
 */
export interface ForceVector2D {
  /**
   * X force component (N)
   */
  x: number;
  /**
   * Y force component (N)
   */
  y: number;
}
/**
 * A document-level variable: a named, dimensioned Expr. The dimension tag selects the SI unit.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "Variable".
 */
export interface Variable {
  /**
   * Dimension tag (matches choreo::dimensions::*::tag)
   */
  dimension:
    | "Number"
    | "Length"
    | "LinVel"
    | "LinAcc"
    | "Angle"
    | "AngVel"
    | "AngAcc"
    | "Time"
    | "Mass"
    | "Torque"
    | "MoI"
    | "Current"
    | "KT"
    | "KV";
  var: Expr;
}
/**
 * All document-level named variables, grouped by geometric type.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "Variables".
 */
export interface Variables {
  /**
   * Named scalar/dimensional variables.
   */
  expressions?: {
    [k: string]: Variable;
  };
  /**
   * Named 2D translation variables.
   */
  translations?: {
    [k: string]: Translation2E;
  };
  /**
   * Named 2D pose variables.
   */
  poses?: {
    [k: string]: Pose2E;
  };
  /**
   * Named 2D region variables.
   */
  regions?: {
    [k: string]: Region2E;
  };
}
/**
 * Drivetrain motor model parameters.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "MotorConfig".
 */
export interface MotorConfig {
  /**
   * No-load speed (rad/s)
   */
  free_speed: Expr;
  /**
   * Stall torque (N·m)
   */
  stall_torque: Expr;
  /**
   * Torque constant (N·m/A)
   */
  kT: Expr;
  /**
   * Back-EMF constant (V·s/rad)
   */
  kV: Expr;
  /**
   * Supply current limit (A)
   */
  supply_limit: Expr;
  /**
   * Stator current limit (A)
   */
  stator_limit: Expr;
}
/**
 * Complete physical robot configuration.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "RobotConfig".
 */
export interface RobotConfig {
  /**
   * Robot mass (kg)
   */
  mass: Expr;
  /**
   * Moment of inertia (kg·m²)
   */
  inertia: Expr;
  /**
   * Motor-to-wheel gear ratio (dimensionless)
   */
  gearing: Expr;
  /**
   * Wheel radius (m)
   */
  radius: Expr;
  /**
   * Wheel coefficient of friction (dimensionless)
   */
  cof: Expr;
  /**
   * Track width for differential drive (m)
   */
  differential_track_width: Expr;
  /**
   * Swerve module positions relative to robot center: [FL, BL, BR, FR] (m)
   *
   * @minItems 4
   * @maxItems 4
   */
  wheels: [Translation2E, Translation2E, Translation2E, Translation2E];
  /**
   * Bumper vertices in counter-clockwise order, robot-relative (m)
   */
  bumpers: Translation2E[];
  motor: MotorConfig;
}
/**
 * Code generation settings stored in the project file.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "CodeGenConfig".
 */
export interface CodeGenConfig {
  /**
   * Output root directory path. Empty string means 'not set'.
   */
  root?: string;
  /**
   * Generate named variable accessors.
   */
  genVars?: boolean;
  /**
   * Generate data objects with details on each trajectory.
   */
  genTrajData?: boolean;
  /**
   * Emit ChoreoLib-compatible API calls.
   */
  useChoreoLib?: boolean;
}
/**
 * A trajectory waypoint with pose and optimization hints.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "Waypoint".
 */
export interface Waypoint {
  /**
   * A stable persisted UUID string.
   */
  uuid: string;
  /**
   * X position (m)
   */
  x: Expr;
  /**
   * Y position (m)
   */
  y: Expr;
  /**
   * Heading (rad)
   */
  heading: Expr;
  /**
   * Optimization intervals to next waypoint
   */
  intervals: number;
  /**
   * Start a new trajectory split here
   */
  split: boolean;
  /**
   * Constrain XY position exactly during optimization
   */
  fix_translation: boolean;
  /**
   * Constrain heading exactly during optimization
   */
  fix_heading: boolean;
  /**
   * Use intervals instead of auto-selection
   */
  override_intervals: boolean;
}
/**
 * Constraint: maximum linear speed along the path.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "MaxVelocity".
 */
export interface MaxVelocity {
  type: "MaxVelocity";
  /**
   * Maximum speed (m/s)
   */
  max: Expr;
}
/**
 * Constraint: maximum rotational speed.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "MaxAngularVelocity".
 */
export interface MaxAngularVelocity {
  type: "MaxAngularVelocity";
  /**
   * Maximum angular speed (rad/s)
   */
  max: Expr;
}
/**
 * Constraint: keep the robot within a circular field region.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "KeepInCircle".
 */
export interface KeepInCircle {
  type: "KeepInCircle";
  /**
   * Circle center X (m)
   */
  x: Expr;
  /**
   * Circle center Y (m)
   */
  y: Expr;
  /**
   * Circle radius (m)
   */
  r: Expr;
}
/**
 * Constraint: robot heading must stay within tolerance of a target angle.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "HeadingConstraint".
 */
export interface HeadingConstraint {
  type: "Heading";
  /**
   * Target heading (rad)
   */
  heading: Expr;
  /**
   * Allowed deviation (rad)
   */
  tolerance: Expr;
}
/**
 * A typed constraint applied at or between waypoints.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "Constraint".
 */
export interface Constraint {
  /**
   * A stable persisted UUID string.
   */
  uuid: string;
  /**
   * Waypoint the constraint starts at
   */
  from:
    | {
        uuid: UUID;
      }
    | "first"
    | "last";
  /**
   * Waypoint the constraint ends at (omit for point constraint)
   */
  to?:
    | {
        uuid: UUID;
      }
    | "first"
    | "last";
  data: ConstraintVariant;
  enabled: boolean;
}
/**
 * Trajectory parameters: waypoints, constraints, and target time step.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "Parameters".
 */
export interface Parameters {
  waypoints: Waypoint[];
  constraints: Constraint[];
  /**
   * Target optimization time step (s)
   */
  target_dt: Expr;
}
/**
 * Timing information anchoring an event marker to the trajectory.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "EventMarkerData".
 */
export interface EventMarkerData {
  /**
   * Target waypoint reference; null if not set.
   */
  target: WaypointID | null;
  /**
   * Pre-computed trajectory time at the target waypoint (s); null if not available.
   */
  targetTimestamp: number | null;
  /**
   * Time offset from the target (s)
   */
  offset: Expr;
}
/**
 * A named event placed at a time on the trajectory.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "EventMarker".
 */
export interface EventMarker {
  /**
   * A stable persisted UUID string.
   */
  uuid: string;
  name: string;
  from: EventMarkerData;
}
/**
 * WPILib Translation2d in metres.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "WpiTranslation2d".
 */
export interface WpiTranslation2D {
  /**
   * X position (m)
   */
  x: number;
  /**
   * Y position (m)
   */
  y: number;
}
/**
 * WPILib Rotation2d in radians.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "WpiRotation2d".
 */
export interface WpiRotation2D {
  /**
   * Rotation angle (rad)
   */
  radians: number;
}
/**
 * WPILib Pose2d with translation and rotation.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "WpiPose2d".
 */
export interface WpiPose2D {
  translation: WpiTranslation2D;
  rotation: WpiRotation2D;
}
/**
 * WPILib ChassisVelocities in field coordinates.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "WpiChassisVelocities".
 */
export interface WpiChassisVelocities {
  /**
   * X velocity (m/s)
   */
  vx: number;
  /**
   * Y velocity (m/s)
   */
  vy: number;
  /**
   * Angular velocity (rad/s)
   */
  omega: number;
}
/**
 * WPILib ChassisAccelerations in field coordinates.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "WpiChassisAccelerations".
 */
export interface WpiChassisAccelerations {
  /**
   * X acceleration (m/s^2)
   */
  ax: number;
  /**
   * Y acceleration (m/s^2)
   */
  ay: number;
  /**
   * Angular acceleration (rad/s^2)
   */
  alpha: number;
}
/**
 * wpi::math::HolonomicSample serialized as JSON.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "HolonomicSample".
 */
export interface HolonomicSample {
  /**
   * Sample timestamp relative to trajectory start (s)
   */
  time: number;
  pose: WpiPose2D;
  velocity: WpiChassisVelocities;
  acceleration: WpiChassisAccelerations;
}
/**
 * wpi::math::DifferentialSample serialized as JSON.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "DifferentialSample".
 */
export interface DifferentialSample {
  /**
   * Sample timestamp relative to trajectory start (s)
   */
  time: number;
  pose: WpiPose2D;
  velocity: WpiChassisVelocities;
  acceleration: WpiChassisAccelerations;
  /**
   * Left wheel speed (m/s)
   */
  leftVelocity: number;
  /**
   * Right wheel speed (m/s)
   */
  rightVelocity: number;
}
/**
 * WPILib HolonomicTrajectory JSON sample container.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "HolonomicSamplesContainer".
 */
export interface HolonomicSamplesContainer {
  samples: HolonomicSample[];
}
/**
 * WPILib DifferentialTrajectory JSON sample container.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "DifferentialSamplesContainer".
 */
export interface DifferentialSamplesContainer {
  samples: DifferentialSample[];
}
/**
 * A generated trajectory for one drive type (Trajectory<SwerveDriveType> or Trajectory<DifferentialDriveType>).
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "Trajectory".
 */
export interface Trajectory {
  /**
   * Drive-type discriminator tag.
   */
  sample_type: "Swerve" | "Differential";
  /**
   * Trajectory timestamps (s) corresponding to each waypoint.
   */
  waypoints: number[];
  /**
   * Sample indices at which trajectory splits begin.
   */
  splits: number[];
  /**
   * Drive-type-specific trajectory samples serialized by WPILib (Swerve -> HolonomicSample, Differential -> DifferentialSample).
   */
  samples: HolonomicSamplesContainer | DifferentialSamplesContainer;
}
/**
 * Contents of a .traj file: a single named trajectory with its parameters and events.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "TrajectoryFile".
 */
export interface TrajectoryFile {
  /**
   * A stable persisted UUID string.
   */
  uuid: string;
  name: string;
  /**
   * File format version
   */
  version: number;
  /**
   * Robot config snapshot used when the trajectory was generated; null if not stored.
   */
  config?: RobotConfig | null;
  /**
   * Frozen parameter snapshot from the last generation run; null if not generated yet.
   */
  snapshot?: Parameters | null;
  params: Parameters;
  /**
   * Generated trajectory output; null if not yet generated.
   */
  trajectory?: Trajectory | null;
  events: EventMarker[];
}
/**
 * Trajectory parameters: waypoints, constraints, and target time step.
 */
export interface Parameters {
  waypoints: Waypoint[];
  constraints: Constraint[];
  /**
   * Target optimization time step (s)
   */
  target_dt: Expr;
}
/**
 * Progress event carrying an incomplete trajectory sample update encoded as a WPILib struct-array base64 blob.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "IncompleteTrajectoryProgressMessage".
 */
export interface IncompleteTrajectoryProgressMessage {
  version: 1;
  event: "incompleteTrajectory";
  driveType: DriveType;
  sampleCount: number;
  /**
   * WPILib struct type string (e.g. struct:HolonomicSample).
   */
  sampleStructType: string;
  /**
   * WPILib struct size in bytes for one sample.
   */
  sampleStructSize: number;
  /**
   * Base64-encoded packed WPILib struct-array bytes for the samples.
   */
  samplesBase64: string;
}
/**
 * Progress event carrying diagnostic text.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "DiagnosticProgressMessage".
 */
export interface DiagnosticProgressMessage {
  version: 1;
  event: "diagnostic";
  payload: {
    text: string;
  };
}
/**
 * Progress event carrying an error message.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "ErrorProgressMessage".
 */
export interface ErrorProgressMessage {
  version: 1;
  event: "error";
  payload: {
    message: string;
  };
}
/**
 * Progress event carrying the final generated trajectory file JSON payload.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "CompleteTrajectoryProgressMessage".
 */
export interface CompleteTrajectoryProgressMessage {
  version: 1;
  event: "completeTrajectory";
  payload: {
    /**
     * Serialized TrajectoryFile JSON string.
     */
    trajectoryFile: string;
  };
}
/**
 * Contents of a .chor project file: robot config, drive type, document-level variables, and code-gen settings.
 *
 * This interface was referenced by `ChoreoDocumentSchema`'s JSON-Schema
 * via the `definition` "ProjectFile".
 */
export interface ProjectFile {
  /**
   * A stable persisted UUID string.
   */
  uuid: string;
  name: string;
  /**
   * File format version
   */
  version: number;
  type: DriveType;
  variables: Variables;
  config: RobotConfig;
  codegen: CodeGenConfig;
}
