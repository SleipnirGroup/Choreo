/** CHANGES from v0.3:
 * added event markers
 */

export const SAVE_FILE_VERSION = "v0.3";
export interface SavedWaypoint {
  x: number;
  y: number;
  heading: number;
  isInitialGuess: boolean;
  translationConstrained: boolean;
  headingConstrained: boolean;
  controlIntervalCount: number; // positive-integer>
}
export interface SavedTrajectorySample {
  timestamp: number; //positive
  x: number;
  y: number;
  heading: number;
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
}
export interface SavedPath {
  waypoints: Array<SavedWaypoint>;
  trajectory: Array<SavedTrajectorySample> | null;
  constraints: Array<SavedConstraint>;
  usesDefaultFieldObstacles: boolean;
  usesControlIntervalGuessing: boolean;
  defaultControlIntervalCount: number;
  circleObstacles: Array<SavedCircleObstacle>;
  eventMarkers: Array<SavedEventMarker>;
}
export interface SavedPathList extends Record<string, SavedPath> {}
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
  type: "deadline" | "parallel" | "race" | "sequential"
  data: {
    "commands" : SavedCommand[]
  }
}
export type SavedWaitCommand = {
  type: "wait";
  data: {
    time: number;
  }
}
export type SavedNamedCommand = {
    type: "named";
    data: {
      name: string | null
    }
  }
export type SavedCommand = SavedWaitCommand | SavedGroupCommand | SavedNamedCommand;
export interface SavedEventMarker {
  name: string;
  target: SavedWaypointId;
  offset: number;
  command: SavedCommand;
}

