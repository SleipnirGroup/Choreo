import {
  DifferentialSample,
  SwerveSample
} from "../../../document/schema/DocumentTypes";
import { IDocumentStore } from "../../../document/DocumentModel";

/**
 * Represents a path gradient.
 */
export type PathGradientArgs<S extends SwerveSample | DifferentialSample> = {
  /**
   * Array of all trajectory samples.
   */
  samples: S[];

  /**
   * Index of current trajectory sample within sample array.
   */
  index: number;

  /**
   * Section number, where a section is a region between stop points.
   */
  section: number;

  /**
   * Document model.
   */
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
   * A function that calculates the gradient value for a given point based on a
   * trajectory sample.
   *
   * @returns The gradient value as a string.
   */
  function: (args: PathGradientArgs<any>) => string;
};

/**
 * Represents a collection of static functions for calculating path gradient colors.
 */
class PathGradientFunctions {
  /**
   * Returns the "select-yellow" color for the given trajectory sample.
   *
   * This is the default color used when no gradient is applied.
   * NOTE: This function is not used and is included only for completeness.
   *
   * @returns The "select-yellow" color.
   */
  static none(_args: PathGradientArgs<any>): string {
    return "var(--select-yellow)";
  }

  /**
   * Produces a color gradient for linear velocity.
   *
   * Lower velocities are red and higher velocities are green.
   *
   * @returns The color value in HSL format.
   */
  static linearVelocity({
    samples,
    index,
    documentModel
  }: PathGradientArgs<any>): string {
    const sample = samples[index];

    // Linear velocity magnitude
    let v = 0;
    if (sample.vl !== undefined) {
      v = Math.abs(sample.vl + sample.vr) / 2;
    } else {
      v = Math.hypot(sample.vx, sample.vy);
    }

    const floorSpeed =
      documentModel.robotConfig.wheelMaxVelocity *
      documentModel.robotConfig.radius.value;

    // Divide by floor speed to scale linear velocity to [0, 1], then scale to
    // red-green hue [0, 100]
    return `hsl(${100 * (v / floorSpeed)}, 100%, 50%)`;
  }

  /**
   * Produces a color gradient for trajectory progress.
   *
   * 0% progress is green and 100% progress is red.
   *
   * @returns The color value in HSL format.
   */
  static progress({ samples, index }: PathGradientArgs<any>): string {
    // Scale progress to [0, 1], invert the range, then scale to red-green hue
    // [0, 100]
    return `hsl(${100 * (1 - index / samples.length)}, 100%, 50%)`;
  }

  /**
   * Produces a color gradient for linear acceleration.
   *
   * Lower accelerations are red and higher accelerations are green.
   *
   * @returns The color value in HSL format.
   */
  static linearAcceleration({ samples, index }: PathGradientArgs<any>): string {
    const sample = samples[index];

    // Linear acceleration magnitude
    let acceleration = 0;
    if (sample.vl !== undefined) {
      acceleration = Math.abs(sample.al + sample.ar) / 2;
    } else {
      acceleration = Math.hypot(sample.ax, sample.ay);
    }

    // Divide by 10 to scale linear acceleration to [0, 1], invert range, then
    // scale to red-green hue [0, 100]
    return `hsl(${(100 * acceleration) / 10}, 100%, 50%)`;
  }

  /**
   * Produces a color gradient for trajectory sample interval time difference
   * (dt).
   *
   * Shorter dts are red and longer dts are green.
   *
   * @returns The color value in HSL format.
   */
  static intervalDt({ samples, index }: PathGradientArgs<any>): string {
    const dt = samples[index + 1].t - samples[index].t;
    return `hsl(${100 * (1.5 - 10 * dt)}, 100%, 50%)`;
  }

  /**
   * Produces a color gradient for angular velocity.
   *
   * Lower angular velocities are red and higher angular velocities are green.
   *
   * @returns The color value in HSL format.
   */
  static angularVelocity({ samples, index }: PathGradientArgs<any>): string {
    // Scale angular velocity magnitude to [0, 1] using artificial 2π rad/s max,
    // then normalize to red-green hue [0, 100]
    return `hsl(${100 * (Math.abs(samples[index].omega) / (2 * Math.PI))}, 100%, 50%)`;
  }

  /**
   * Produces a different color for each split trajectory delimited by stop
   * points.
   *
   * @returns The color value in HSL format.
   */
  static splitTrajectories({ section }: PathGradientArgs<any>): string {
    if (section == 0) {
      return "var(--select-yellow)";
    }

    // Generate distinct color within [0, 1] with abs(sin(x)), then scale to
    // full hue range [0, 360]
    return `hsl(${360 * Math.abs(Math.sin(section))}, 100%, 50%)`;
  }
}

/**
 * Represents the available path gradients.
 *
 * This links a gradient's user-facing description to its corresponding function.'
 */
export const PathGradients = {
  None: {
    name: "None",
    localizedDescription: "None",
    description: "No path gradient applied.",
    function: PathGradientFunctions.none
  },
  LinearVelocity: {
    name: "LinearVelocity",
    localizedDescription: "Linear Velocity",
    description: "Faster robot linear velocity is shown as green.",
    function: PathGradientFunctions.linearVelocity
  },
  Progress: {
    name: "Progress",
    localizedDescription: "Progress",
    description: "Further progress through the path is shown as red.",
    function: PathGradientFunctions.progress
  },
  LinearAcceleration: {
    name: "LinearAcceleration",
    localizedDescription: "Linear Acceleration",
    description: "Faster robot linear acceleration is shown as green.",
    function: PathGradientFunctions.linearAcceleration
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
} as const;
