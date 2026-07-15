import type {
  DifferentialSample as GeneratedDifferentialTrajectorySample,
  Expr as GeneratedExpr,
  HolonomicSample as GeneratedHolonomicSample,
  Parameters as GeneratedParameters,
  Pose2E as GeneratedPoseVariable,
  RobotConfig as GeneratedRobotConfig,
  Trajectory as GeneratedTrajectory,
  Variable as GeneratedVariable,
  WaypointID as GeneratedWaypointID,
  Waypoint as GeneratedWaypoint
} from "../../../document/ts/src";
import { ConstraintData } from "../ConstraintDefinitions";
export { TRAJ_SCHEMA_VERSION } from "./TrajSchemaVersion";
import { TRAJ_SCHEMA_VERSION } from "./TrajSchemaVersion";
export { PROJECT_SCHEMA_VERSION } from "./ProjectSchemaVersion";
import { PROJECT_SCHEMA_VERSION } from "./ProjectSchemaVersion";

export type Expr = GeneratedExpr;
export type { GeneratedParameters, GeneratedWaypoint };

export function isExpr(arg: unknown): arg is Expr {
  return (
    typeof arg === "object" &&
    arg !== null &&
    Object.hasOwn(arg, "exp") &&
    typeof (arg as Record<string, unknown>)["exp"] === "string" &&
    Object.hasOwn(arg, "val") &&
    typeof (arg as Record<string, unknown>)["val"] === "number"
  );
}

export function deepCopy<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export type VariableDimension = GeneratedVariable["dimension"];
export type Variable = GeneratedVariable;
export type PoseVariable = GeneratedPoseVariable;

export interface Variables {
  expressions: Record<string, Variable>;
  poses: Record<string, PoseVariable>;
}

export interface Bumper {
  front: Expr;
  back: Expr;
  side: Expr;
}

export interface BumperValue {
  front: number;
  back: number;
  side: number;
}

export interface Module {
  x: Expr;
  y: Expr;
}

export interface ModuleValue {
  x: number;
  y: number;
}

export type RobotConfig = GeneratedRobotConfig;

export interface MotorConfigValue {
  free_speed: number;
  stall_torque: number;
  kT: number;
  kV: number;
  supply_limit: number;
  stator_limit: number;
}

export interface RobotConfigValue {
  mass: number;
  inertia: number;
  gearing: number;
  radius: number;
  cof: number;
  differential_track_width: number;
  wheels: [ModuleValue, ModuleValue, ModuleValue, ModuleValue];
  bumpers: ModuleValue[];
  motor: MotorConfigValue;
}

export interface CodeGenConfig {
  root: string | null;
  genVars: boolean;
  genTrajData: boolean;
  useChoreoLib: boolean;
}

export interface Project {
  name: string;
  type: SampleType;
  version: typeof PROJECT_SCHEMA_VERSION;
  variables: Variables;
  config: RobotConfig;
  codegen: CodeGenConfig;
}

export interface Waypoint {
  x: GeneratedWaypoint["x"];
  y: GeneratedWaypoint["y"];
  heading: GeneratedWaypoint["heading"];
  intervals: GeneratedWaypoint["intervals"];
  split: GeneratedWaypoint["split"];
  fixTranslation: GeneratedWaypoint["fix_translation"];
  fixHeading: GeneratedWaypoint["fix_heading"];
  overrideIntervals: GeneratedWaypoint["override_intervals"];
}

export interface WaypointValue {
  x: number;
  y: number;
  heading: number;
  intervals: number;
  split: boolean;
  fixTranslation: boolean;
  fixHeading: boolean;
  overrideIntervals: boolean;
}

export type WaypointIDX = GeneratedWaypointID;

export type WaypointUUID = "first" | "last" | { uuid: string };

export interface Constraint {
  from: WaypointIDX;
  to?: WaypointIDX;
  data: ConstraintData;
  enabled: boolean;
}

export type SwerveSample = GeneratedHolonomicSample;
export type DifferentialSample = GeneratedDifferentialTrajectorySample;

export interface ProgressUpdate {
  type:
    | "swerveTrajectory"
    | "differentialTrajectory"
    | "diagnosticText"
    | "intervalCounts";
  update: SwerveSample[] | DifferentialSample[] | string | number[];
}

export interface ChoreoPath {
  waypoints: Waypoint[];
  constraints: Constraint[];
  targetDt: GeneratedParameters["target_dt"];
}

export interface ChoreoPathValue {
  waypoints: WaypointValue[];
  constraints: Constraint[];
  targetDt: number;
}

export type SampleType = "Swerve" | "Differential";
export interface Output {
  config: RobotConfigValue | null;
  sampleType: SampleType | undefined;
  waypoints: number[];
  samples: SwerveSample[] | DifferentialSample[];
  splits: number[];
}

export interface Trajectory {
  name: string;
  version: typeof TRAJ_SCHEMA_VERSION;
  params: ChoreoPath;
  snapshot: ChoreoPathValue;
  trajectory: Output;
  events: EventMarker[];
}

export type GroupCommand = {
  type: "deadline" | "parallel" | "race" | "sequential";
  data: {
    commands: PplibCommand[];
  };
};
export type WaitCommand = {
  type: "wait";
  data: {
    waitTime: Expr;
  };
};
export type NamedCommand = {
  type: "named";
  data: {
    name: string | null;
  };
};

export type EventMarkerData = {
  target: number | null;
  offset: Expr;
  targetTimestamp: number | null;
};
export type PplibCommand = WaitCommand | GroupCommand | NamedCommand;
export type Command = PplibCommand | undefined | null;
export interface EventMarker {
  name: string;
  from: EventMarkerData;
  event: Command;
}

export type FieldJSON = {
  game: string;
  "field-image": string;
  "size-pixels": [number, number];
  "field-corners": {
    "top-left": [number, number];
    "bottom-right": [number, number];
  };
  "field-size": [number, number];
  "field-unit": "meter" | "foot" | "inch";
  "origin-fraction": [number, number];
};
export interface CustomFieldData {
  fieldImageBase64: string;
  fieldJson: FieldJSON;
  fieldJSONRelativePath: string | undefined;
}

export function toGeneratedRobotConfig(config: RobotConfig): GeneratedRobotConfig {
  return deepCopy(config);
}

export function fromGeneratedRobotConfig(config: GeneratedRobotConfig): RobotConfig {
  return deepCopy(config);
}

export function toGeneratedSwerveSample(
  sample: SwerveSample
): GeneratedHolonomicSample {
  return deepCopy(sample);
}

export function fromGeneratedSwerveSample(
  sample: GeneratedHolonomicSample
): SwerveSample {
  return deepCopy(sample);
}

export function toGeneratedDifferentialSample(
  sample: DifferentialSample
): GeneratedDifferentialTrajectorySample {
  return deepCopy(sample);
}

export function fromGeneratedDifferentialSample(
  sample: GeneratedDifferentialTrajectorySample
): DifferentialSample {
  return deepCopy(sample);
}

export function toGeneratedTrajectory(
  output: Output
): GeneratedTrajectory {
  if (output.sampleType === "Differential") {
    return {
      sample_type: "Differential",
      waypoints: deepCopy(output.waypoints),
      splits: deepCopy(output.splits),
      samples: {
        samples: (output.samples as DifferentialSample[]).map(
          toGeneratedDifferentialSample
        )
      }
    };
  }

  return {
    sample_type: "Swerve",
    waypoints: deepCopy(output.waypoints),
    splits: deepCopy(output.splits),
    samples: {
      samples: (output.samples as SwerveSample[]).map(toGeneratedSwerveSample)
    }
  };
}

export function fromGeneratedTrajectory(output: GeneratedTrajectory): Output {
  if (output.sample_type === "Differential") {
    return {
      config: null,
      sampleType: "Differential",
      waypoints: deepCopy(output.waypoints),
      splits: deepCopy(output.splits),
      samples: output.samples.samples.map((sample) =>
        fromGeneratedDifferentialSample(
          sample as GeneratedDifferentialTrajectorySample
        )
      )
    };
  }

  return {
    config: null,
    sampleType: "Swerve",
    waypoints: deepCopy(output.waypoints),
    splits: deepCopy(output.splits),
    samples: output.samples.samples.map((sample) =>
      fromGeneratedSwerveSample(sample as GeneratedHolonomicSample)
    )
  };
}

export function toGeneratedWaypoint(waypoint: Waypoint): GeneratedWaypoint {
  return {
    x: deepCopy(waypoint.x),
    y: deepCopy(waypoint.y),
    heading: deepCopy(waypoint.heading),
    intervals: waypoint.intervals,
    split: waypoint.split,
    fix_translation: waypoint.fixTranslation,
    fix_heading: waypoint.fixHeading,
    override_intervals: waypoint.overrideIntervals
  };
}

export function fromGeneratedWaypoint(waypoint: GeneratedWaypoint): Waypoint {
  return {
    x: deepCopy(waypoint.x),
    y: deepCopy(waypoint.y),
    heading: deepCopy(waypoint.heading),
    intervals: waypoint.intervals,
    split: waypoint.split,
    fixTranslation: waypoint.fix_translation,
    fixHeading: waypoint.fix_heading,
    overrideIntervals: waypoint.override_intervals
  };
}

export function toGeneratedParameters(
  params: ChoreoPath,
  constraints: GeneratedParameters["constraints"]
): GeneratedParameters {
  return {
    waypoints: params.waypoints.map(toGeneratedWaypoint),
    constraints: deepCopy(constraints),
    target_dt: deepCopy(params.targetDt)
  };
}

export function fromGeneratedParameters(
  params: GeneratedParameters,
  constraints: Constraint[]
): ChoreoPath {
  return {
    waypoints: params.waypoints.map(fromGeneratedWaypoint),
    constraints: deepCopy(constraints),
    targetDt: deepCopy(params.target_dt)
  };
}