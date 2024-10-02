import { ConstraintData } from "../ConstraintDefinitions";
import { Dimensions } from "../ExpressionStore";
import { ChoreoPath, DifferentialSample, EventMarker, Expr, PplibCommandMarker, SwerveSample } from "./v2025_0_0";
export type * from "./v2025_0_0";
export {isExpr} from "./v2025_0_0";
/**
 * Remove forcesAvailable
 */
export const SAVE_FILE_VERSION = "v2025.0.1";

export interface Output {
  waypoints: number[];
  samples: SwerveSample[] | DifferentialSample[];
  splits: number[];
}

export interface Trajectory {
  name: string;
  version: typeof SAVE_FILE_VERSION;
  params: ChoreoPath<Expr>;
  snapshot: ChoreoPath<number>;
  trajectory: Output;
  events: EventMarker[];
  pplibCommands: PplibCommandMarker<number>[];
}
