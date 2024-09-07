import { ConstraintData } from "../ConstraintDefinitions";
import { Dimensions } from "../ExpressionStore";

export const SAVE_FILE_VERSION = "v2025.0.0";
export type Expr = [string, number];

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
  left: T;
  back: T;
  right: T;
}

export interface Module<T extends ExprOrNumber> {
  x: T;
  y: T;
}

export interface RobotConfig<T extends ExprOrNumber> {
  modules: [Module<T>, Module<T>, Module<T>, Module<T>];
  mass: T;
  inertia: T;
  gearing: T;
  radius: T;
  /// motor rad/s
  vmax: T;
  /// motor N*m
  tmax: T; // N*m
  bumper: Bumper<T>;
}

export interface Project {
  name: string;
  type: SampleType;
  version: typeof SAVE_FILE_VERSION;
  variables: Variables;
  config: RobotConfig<Expr>;
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

export type WaypointID = number | "first" | "last";

export interface Constraint {
  from: WaypointID;
  to?: WaypointID;
  data: ConstraintData;
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
  al: number;
  ar: number;
  fl: number;
  fr: number;
}

export interface ProgressUpdate {
  type: "swerveTraj" | "diffTraj";
  update: SwerveSample[] | DifferentialSample[] | string;
}

export interface ChoreoPath<T extends ExprOrNumber> {
  waypoints: Waypoint<T>[];
  constraints: Constraint[];
}

export type SampleType = "Swerve" | "Differential";
export interface Output {
  waypoints: number[];
  samples: SwerveSample[][] | DifferentialSample[][];
  forcesAvailable: boolean;
}

export interface Traj {
  name: string;
  version: typeof SAVE_FILE_VERSION;
  params: ChoreoPath<Expr>;
  snapshot: ChoreoPath<number>;
  traj: Output;
}

export interface CircleObstacle<T extends ExprOrNumber> {
  x: T;
  y: T;
  r: T;
}

export type GroupCommand<T extends ExprOrNumber> = {
  type: "deadline" | "parallel" | "race" | "sequential";
  data: {
    commands: Command<T>[];
  };
};
export type WaitCommand<T extends ExprOrNumber> = {
  type: "wait";
  data: {
    waitTime: T;
  };
};
export type NamedCommand = {
  type: "named";
  data: {
    name: string | null;
  };
};
export type Command<T extends ExprOrNumber> =
  | WaitCommand<T>
  | GroupCommand<T>
  | NamedCommand;
export interface EventMarker<T extends ExprOrNumber> {
  name: string;
  target: WaypointID;
  trajTargetIndex: number | undefined;
  offset: T;
  /**
   * The timestamp along the trajectory of the waypoint this marker targeted on the last generation.
   */
  targetTimestamp: number | undefined;
  command: Command<T>;
}
