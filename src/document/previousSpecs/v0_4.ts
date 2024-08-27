/** CHANGES from v0.3:
 * Add module forces
 */

export const SAVE_FILE_VERSION = "v0.4";
export interface SavedWaypoint {
  x: number;
  y: number;
  heading: number;
  isInitialGuess: boolean;
  translationConstrained: boolean;
  headingConstrained: boolean;
  controlIntervalCount: number; // positive-integer
}
export type SavedGeneratedWaypoint = SavedWaypoint & {
  timestamp: number;
  isStopPoint: boolean;
};
export interface SavedTrajectorySample {
  timestamp: number; // positive
  x: number;
  y: number;
  heading: number;
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
  moduleForcesX: Array<number>;
  moduleForcesY: Array<number>;
}
export interface SavedPath {
  waypoints: Array<SavedWaypoint>;
  trajectory: Array<SavedTrajectorySample> | null;
  trajectoryWaypoints: Array<SavedGeneratedWaypoint>;
  constraints: Array<SavedConstraint>;
  usesDefaultFieldObstacles: boolean;
  usesControlIntervalGuessing: boolean;
  defaultControlIntervalCount: number;
  circleObstacles: Array<SavedCircleObstacle>;
  eventMarkers: Array<SavedEventMarker>;
  isTrajectoryStale: boolean;
}
export type SavedPathList = Record<string, SavedPath>;
export interface SavedRobotConfig {
  mass: number;
  rotationalInertia: number;
  wheelbase: number;
  trackWidth: number;
  wheelRadius: number;
  motorMaxVelocity: number;
  motorMaxTorque: number;
  gearing: number;
  bumperLength: number;
  bumperWidth: number;
}
export interface SavedDocument {
  version: typeof SAVE_FILE_VERSION;
  robotConfiguration: SavedRobotConfig;
  paths: SavedPathList;
  splitTrajectoriesAtStopPoints: boolean;
  usesObstacles: boolean;
}
export type SavedWaypointId = "first" | "last" | number;
export interface SavedConstraint {
  scope: Array<SavedWaypointId>;
  type: string;
  [key: string]: unknown;
}
export interface SavedCircleObstacle {
  x: number;
  y: number;
  radius: number;
}
export type SavedGroupCommand = {
  type: "deadline" | "parallel" | "race" | "sequential";
  data: {
    commands: SavedCommand[];
  };
};
export type SavedWaitCommand = {
  type: "wait";
  data: {
    waitTime: number;
  };
};
export type SavedNamedCommand = {
  type: "named";
  data: {
    name: string | null;
  };
};
export type SavedCommand =
  | SavedWaitCommand
  | SavedGroupCommand
  | SavedNamedCommand;
export interface SavedEventMarker {
  name: string;
  target: SavedWaypointId | null;
  trajTargetIndex: number | null;
  offset: number;
  /**
   * The timestamp along the trajectory of the waypoint this marker targeted on the last generation.
   */
  targetTimestamp: number | null;
  command: SavedCommand;
}
