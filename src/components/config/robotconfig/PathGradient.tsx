import { IStateStore } from "../../../document/DocumentModel";
import { SavedTrajectorySample } from "../../../document/DocumentSpecTypes";

export type PathGradient = {
  name: string;
  description: string;
  function: (
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[],
    documentModel: IStateStore
  ) => string;
};

class PathGradientFunctions {
  static none(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[],
    documentModel: IStateStore
  ) {
    return "yellow";
  }

  static progress(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[],
    documentModel: IStateStore
  ) {
    const t = 1 - i / arr.length;
    return `hsl(${100 * t}, 100%, 50%)`;
  }

  static velocity(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[],
    documentModel: IStateStore
  ) {
    const t = Math.hypot(point.velocityX, point.velocityY) / 5.0;
    return `hsl(${100 * t}, 100%, 50%)`;
  }

  static acceleration(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[],
    documentModel: IStateStore
  ) {
    if (i == 0 || i == arr.length - 1) {
      const t = 0;
      return `hsl(${100 * (1 - t)}, 100%, 50%)`;
    } else {
      const A = arr[i];
      const B = arr[i + 1];
      let t = Math.hypot(B.velocityX - A.velocityX, B.velocityY - A.velocityY);
      const dt = B.timestamp - A.timestamp;
      t /= dt;
      t /= 10;
      return `hsl(${100 * (1 - t)}, 100%, 50%)`;
    }
  }

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
      t = 0.5 + 10 * (0.1 - dt);
    }
    //compute circumradius
    return `hsl(${100 * t}, 100%, 50%)`;
  }

  static angularVelocity(
    point: SavedTrajectorySample,
    i: number,
    arr: SavedTrajectorySample[],
    documentModel: IStateStore
  ) {
    const colorValue = Math.abs(
      Math.sin(point.angularVelocity / 0.00000000001) * 40
    );
    return `hsl(${colorValue}, 100%, 50%)`;
  }

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
        return `hsl(${Math.abs(Math.sin(split) * 360)}, 100%, 50%)`;
      }
    }
  }
}

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
