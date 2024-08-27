import { Sample } from "../../../document/2025/DocumentTypes";
import { IDocumentStore } from "../../../document/DocumentModel";

/**
 * Represents a path gradient.
 */
export type PathGradientArgs = {
  point: Sample;
  prev: Sample;
  next: Sample;
  arr: Sample[][];
  total: number;
  count: number;
  sect: number;
  idxInSect: number;
  documentModel: IDocumentStore;
};
export type PathGradient = {
  /**
   * The name/key of the path gradient.
   * Do not include spaces and match the key in the PathGradients object.
   */
  name: string;

  localizedDescription: string;
  /**
   * The localized/user-facing description of the path gradient.
   */
  description: string;
  /**
   * A function that calculates the gradient value for a given point in a saved trajectory sample.
   *
   * @param point - The saved trajectory sample point.
   * @param i - The index of the point in the array.
   * @param arr - The array of saved trajectory samples.
   * @param documentModel - The document model.
   * @returns The gradient value as a string.
   */
  function: (args: PathGradientArgs) => string;
};

/**
 * Represents a collection of static functions for calculating path gradient colors.
 */
class PathGradientFunctions {
  /**
   * Returns the "select-yellow" color for the given point in the trajectory.
   * This is the default color used when no gradient is applied.
   * NOTE: This function is not used and is included only for completeness.
   *
   * @param point - The current point in the trajectory.
   * @param i - The index of the current point in the trajectory.
   * @param arr - The array of all points in the trajectory.
   * @param documentModel - The document model object.
   * @returns The "select-yellow" color.
   */
  static none(args: PathGradientArgs): string {
    return "var(--select-yellow)";
  }

  /**
   * Calculates the color gradient for a given point on a saved trajectory based on its velocity.
   * Faster robot velocity is shown as green.
   *
   * @param point - The point on the saved trajectory.
   * @param i - The index of the point in the array.
   * @param arr - The array of saved trajectory samples.
   * @param documentModel - The document model.
   * @returns The color gradient in HSL format.
   */
  static velocity({ point, documentModel }: PathGradientArgs): string {
    // calculates the maginitude of the velocity vector, then divides it by the theoretical floor speed
    // then it scales the ratio [0, 1]: red to green[0, 100]
    const floorSpeed =
      documentModel.robotConfig.wheelMaxVelocity *
      documentModel.robotConfig.radius.value;
    const t = Math.hypot(point.vx, point.vy) / floorSpeed;
    return `hsl(${100 * t}, 100%, 50%)`;
  }

  /**
   * Calculates the progress color for a given point in a trajectory.
   * The color is determined based on the index of the point in the trajectory array.
   * Faster robot velocity is shown as green.
   *
   * @param point - The current point in the trajectory.
   * @param i - The index of the current point in the array.
   * @param arr - The array of trajectory points.
   * @param documentModel - The document model.
   * @returns The progress color in HSL format.
   */
  static progress({ count, total }: PathGradientArgs): string {
    // this creates a ratio [0, 1] of the current point against the total points
    // then scales it from red to greeen, [0, 100]
    const t = 1 - count / total;
    return `hsl(${100 * t}, 100%, 50%)`;
  }

  /**
   * Calculates the color gradient for the acceleration of a trajectory point.
   * Faster robot acceleration is shown as green.
   *
   * @param point - The trajectory point.
   * @param i - The index of the trajectory point in the array.
   * @param arr - The array of trajectory points.
   * @param documentModel - The document model.
   * @returns The color gradient for the acceleration.
   */
  static acceleration({ point, next, count, total }: PathGradientArgs): string {
    let t = 0;

    if (count != 0 && count != total - 1) {
      // first calculates the magnitude of the change in velocity vector over change in time
      // between the current point and the next point.
      // then, it is scaled/normalized for the HSL color value.
      const A = point;
      const B = next;
      t = Math.hypot(B.vx - A.vx, B.vy - A.vy);
      const dt = B.t - A.t;
      t /= dt * 10;
    }

    return `hsl(${100 * (1 - t)}, 100%, 50%)`;
  }

  /**
   * Computes the intervalDt value for a given point in a trajectory.
   * Shorter time difference between intervals is shown as green.
   *
   * @param point - The current point in the trajectory.
   * @param i - The index of the current point in the array.
   * @param arr - The array of trajectory points.
   * @param documentModel - The document model.
   * @returns The computed intervalDt value.
   */
  static intervalDt({ point, next, count, total }: PathGradientArgs): string {
    let t = 0;
    if (count == 0 || count == total - 1) {
      t = 0;
    } else {
      const A = point;
      const B = next;
      const dt = B.t - A.t;
      t = 1.5 - 10 * dt;
    }
    return `hsl(${100 * t}, 100%, 50%)`;
  }

  /**
   * Calculates the color value for the angular velocity of a trajectory point.
   * Faster robot angular velocity is shown as green.
   *
   * @param point - The trajectory point.
   * @param i - The index of the trajectory point in the array.
   * @param arr - The array of trajectory points.
   * @param documentModel - The document model.
   * @returns The color value in HSL format.
   */
  static angularVelocity({ point }: PathGradientArgs): string {
    // the color value is normalized from red (0) to green (100)
    // based on an artificial angular velocity max of 2 r/s
    return `hsl(${Math.abs(point.omega * 100) / 2}, 100%, 50%)`;
  }

  /**
   * Returns a different HSL color for each split trajectory by stop point
   *
   * @param point - Each point.
   * @param i - The index of the point in the array.
   * @param arr - The array of saved trajectory samples.
   * @param documentModel - The document model.
   * @returns The color gradient in HSL format.
   */
  static splitTrajectories({ arr, sect: i }: PathGradientArgs): string {
    if (arr.length < 2) {
      return "var(--select-yellow)";
    }

    // an absolute value sine function is used to generate a distinct color between [0, 1]
    // then a scalar is used to scale the color between the full color range [0, 360]
    return `hsl(${Math.abs(Math.sin(i) * 360)}, 100%, 50%)`;
  }
}

/**
 * Represents the available path gradients.
 * This links a gradient's user-facing description to its corresponding function.'
 */
export const PathGradients: Record<string, PathGradient> = {
  None: {
    name: "None",
    localizedDescription: "None",
    description: "No path gradient applied.",
    function: PathGradientFunctions.none
  },
  Velocity: {
    name: "Velocity",
    localizedDescription: "Velocity",
    description: "Faster robot velocity is shown as green.",
    function: PathGradientFunctions.velocity
  },
  Progress: {
    name: "Progress",
    localizedDescription: "Progress",
    description: "Further progress through the path is shown as red.",
    function: PathGradientFunctions.progress
  },
  Acceleration: {
    name: "Acceleration",
    localizedDescription: "Acceleration",
    description: "Faster robot acceleration is shown as green.",
    function: PathGradientFunctions.acceleration
  },
  IntervalDt: {
    name: "IntervalDt",
    localizedDescription: "Interval Δt",
    description: "Shorter time difference between intervals is shown as green",
    function: PathGradientFunctions.intervalDt
  },
  AngularVelocity: {
    name: "AngularVelocity",
    localizedDescription: "Angular Velocity",
    description: "Faster robot angular velocity is shown as green.",
    function: PathGradientFunctions.angularVelocity
  },
  SplitTrajectories: {
    name: "SplitTrajectories",
    localizedDescription: "Split Trajectories",
    description:
      "Split trajectories on stop points are shown in different colors.",
    function: PathGradientFunctions.splitTrajectories
  }
};
