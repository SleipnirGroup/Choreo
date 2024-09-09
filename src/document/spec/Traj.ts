import { ConstraintData } from "../ConstraintDefinitions";
import { Expr, ExprOrNumber, SAVE_FILE_VERSION } from "./Misc";

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

export interface Trajectory {
  waypoints: number[];
  samples: SwerveSample[][] | DifferentialSample[][];
  forcesAvailable: boolean;
}

export interface TrajFile {
  name: string;
  version: typeof SAVE_FILE_VERSION;
  params: ChoreoPath<Expr>;
  snapshot: ChoreoPath<number>;
  traj: Trajectory;
  events: EventMarker<Expr>[];
  pplivCommands: PplibCommandMarker<number>[];
}

export interface CircleObstacle<T extends ExprOrNumber> {
  x: T;
  y: T;
  r: T;
}

export type GroupCommand<T extends ExprOrNumber> = {
  type: "deadline" | "parallel" | "race" | "sequential";
  data: {
    commands: PplibCommand<T>[];
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
export type PplibCommand<T extends ExprOrNumber> =
  | WaitCommand<T>
  | GroupCommand<T>
  | NamedCommand;
export interface PplibCommandMarker<T extends ExprOrNumber> {
  name: string;
  target: WaypointID;
  trajTargetIndex: number | undefined;
  offset: T;
  /**
   * The timestamp along the trajectory of the waypoint this marker targeted on the last generation.
   */
  targetTimestamp: number | undefined;
  command: PplibCommand<T>;
}
export interface EventMarker<T extends ExprOrNumber> {
  event: string;
  timestamp: T;
}
