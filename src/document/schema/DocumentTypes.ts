import { ConstraintData } from "../ConstraintDefinitions";
import { Dimensions } from "../ExpressionStore";
export { TRAJ_SCHEMA_VERSION } from "./TrajSchemaVersion";
import { TRAJ_SCHEMA_VERSION } from "./TrajSchemaVersion";
export { PROJECT_SCHEMA_VERSION } from "./ProjectSchemaVersion";
import { PROJECT_SCHEMA_VERSION } from "./ProjectSchemaVersion";
export type Expr = { exp: string; val: number };

export function isExpr(arg: any): arg is Expr {
  return (
    typeof arg === "object" &&
    Object.hasOwn(arg, "exp") &&
    typeof arg["exp"] === "string" &&
    Object.hasOwn(arg, "val") &&
    typeof arg["val"] === "number"
  );
}
export type ExprOrNumber = Expr | number;
export interface Variable {
  dimension: keyof typeof Dimensions;
  var: Expr;
}
export interface PoseVariable {
  x: Expr;
  y: Expr;
  heading: Expr;
}

export interface Variables {
  expressions: Record<string, Variable>;
  poses: Record<string, PoseVariable>;
}

export interface Bumper<T extends ExprOrNumber> {
  front: T;
  back: T;
  side: T;
}

export interface Module<T extends ExprOrNumber> {
  x: T;
  y: T;
}

export interface RobotConfig<T extends ExprOrNumber> {
  frontLeft: Module<T>;
  backLeft: Module<T>;
  mass: T;
  inertia: T;
  gearing: T;
  radius: T;
  /// motor rad/s
  vmax: T;
  /// motor N*m
  tmax: T; // N*m
  cof: T;
  bumper: Bumper<T>;
  differentialTrackWidth: T;
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
  config: RobotConfig<Expr>;
  codegen: CodeGenConfig;
}

export interface Waypoint<T extends ExprOrNumber> {
  x: T;
  y: T;
  heading: T;
  intervals: number;
  split: boolean;
  fixTranslation: boolean;
  fixHeading: boolean;
  overrideIntervals: boolean;
}

export type WaypointIDX = number | "first" | "last";

export type WaypointUUID = "first" | "last" | { uuid: string };

export interface Constraint {
  from: WaypointIDX;
  to?: WaypointIDX;
  data: ConstraintData;
  enabled: boolean;
}

export interface SwerveSample {
  t: number;
  x: number;
  y: number;
  heading: number;
  vx: number;
  vy: number;
  omega: number;
  ax: number;
  ay: number;
  alpha: number;
  fx?: [number, number, number, number];
  fy?: [number, number, number, number];
}

export interface DifferentialSample {
  t: number;
  x: number;
  y: number;
  heading: number;
  vl: number;
  vr: number;
  omega: number;
  al: number;
  ar: number;
  alpha: number;
  fl: number;
  fr: number;
}

export interface ProgressUpdate {
  type: "swerveTrajectory" | "differentialTrajectory";
  update: SwerveSample[] | DifferentialSample[] | string;
}

export interface ChoreoPath<T extends ExprOrNumber> {
  waypoints: Waypoint<T>[];
  constraints: Constraint[];
  targetDt: T;
}

export type SampleType = "Swerve" | "Differential";
export interface Output {
  config: RobotConfig<number> | null;
  sampleType: SampleType | undefined;
  waypoints: number[];
  samples: SwerveSample[] | DifferentialSample[];
  splits: number[];
}

export interface Trajectory {
  name: string;
  version: typeof TRAJ_SCHEMA_VERSION;
  params: ChoreoPath<Expr>;
  snapshot: ChoreoPath<number>;
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
  target: WaypointIDX | undefined;
  offset: Expr;
  /**
   * The timestamp along the trajectory of the waypoint this marker targeted on the last generation.
   */
  targetTimestamp: number | undefined;
};
export type PplibCommand = WaitCommand | GroupCommand | NamedCommand;
export type Command = PplibCommand | undefined | null;
export interface EventMarker {
  name: string;
  from: EventMarkerData;
  event: Command;
}
