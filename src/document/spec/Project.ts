import { Dimensions } from "../ExpressionStore";
import { Expr, ExprOrNumber, SAVE_FILE_VERSION } from "./Misc";

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

export type SampleType = "Swerve" | "Differential";

export interface ProjectFile {
  name: string;
  type: SampleType;
  version: typeof SAVE_FILE_VERSION;
  variables: Variables;
  config: RobotConfig<Expr>;
}
