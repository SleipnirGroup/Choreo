import { IStateStore } from "../../../document/DocumentModel";
import { SavedTrajectorySample } from "../../../document/DocumentSpecTypes";

/**
 * Represents a path gradient.
 */
export type PathGradient = {
  /**
   * The name/key of the path gradient.
   * Do not include spaces and match the key in the PathGradients object.
   */
  name: string;

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
  function: (
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[],
    documentModel: IStateStore
  ) => string;
};

/**
 * Represents a collection of static functions for calculating path gradient colors.
 */
class PathGradientFunctions {
  /**
   * Returns the color "yellow" for the given point in the trajectory.
   * This is the default color used when no gradient is applied.
   * NOTE: This function is not used and is included only for completeness.
   *
   * @param point - The current point in the trajectory.
   * @param i - The index of the current point in the trajectory.
   * @param arr - The array of all points in the trajectory.
   * @param documentModel - The document model object.
   * @returns The color "yellow".
   */
  static none(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[],
    documentModel: IStateStore
  ) {
    return "yellow";
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
  static velocity(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[],
    documentModel: IStateStore
  ) {
    // calculates the maginitude of the velocity vector, then divides it by the theoretical floor speed
    // then it scales the ratio [0, 1]: red to green[0, 100]
    const floorSpeed =
      documentModel.document.robotConfig.wheelMaxVelocity *
      documentModel.document.robotConfig.wheelRadius;
    const t = Math.hypot(point.velocityX, point.velocityY) / floorSpeed;
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
  static progress(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[],
    documentModel: IStateStore
  ) {
    // this creates a ratio [0, 1] of the current point against the total points
    // then scales it from red to greeen, [0, 100]
    const t = 1 - i / arr.length;
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
  static acceleration(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[],
    documentModel: IStateStore
  ) {
    let t = 0;

    if (i != 0 && i != arr.length - 1) {
      // first calculates the magnitude of the change in velocity vector over change in time
      // between the current point and the next point.
      // then, it is scaled/normalized for the HSL color value.
      const A = arr[i];
      const B = arr[i + 1];
      t = Math.hypot(B.velocityX - A.velocityX, B.velocityY - A.velocityY);
      const dt = B.timestamp - A.timestamp;
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
  static intervalDt(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[],
    documentModel: IStateStore
  ) {
    let t = 0;
    if (i == 0 || i == arr.length - 1) {
      t = 0;
    } else {
      const A = arr[i];
      const B = arr[i + 1];
      const dt = B.timestamp - A.timestamp;
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
  static angularVelocity(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[],
    documentModel: IStateStore
  ) {
    // the color value is normalized from red (0) to green (100)
    // based on an artificial angular velocity max of 2 r/s
    return `hsl(${Math.abs(point.angularVelocity * 100) / 2}, 100%, 50%)`;
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
  static splitTrajectories(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[],
    documentModel: IStateStore
  ) {
    const stopPointControlIntervals =
      documentModel.document.pathlist.activePath.stopPointIndices();

    for (let split = 0; split < stopPointControlIntervals.length - 1; split++) {
      if (
        i > stopPointControlIntervals[split] &&
        i < stopPointControlIntervals[split + 1]
      ) {
        // an absolute value sine function is used to generate a distinct color between [0, 1]
        // then a scalar is used to scale the color between the full color range [0, 360]
        return `hsl(${Math.abs(Math.sin(split) * 360)}, 100%, 50%)`;
      }
    }
  }
}

/**
 * Represents the available path gradients.
 * This links a gradient's user-facing description to its corresponding function.'
 */
export const PathGradients = {
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
