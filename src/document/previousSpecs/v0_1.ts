/** CHANGES from v0.0.1:
 * Removed velocityMagnitude, velocityAngle, angularVelocity,
 * velocityMagnitudeConstrained, velocityAngleConstrained, angularVelocityConstrained
 * from SavedWaypoint.
 *
 * Added isInitialGuess to SavedWaypoint.
 *
 * Added constraints to SavedPath.
 *
 * Added SavedWaypointID, SavedConstraint.
 */

export const SAVE_FILE_VERSION = "v0.1";
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
}
export interface SavedPathList extends Record<string, SavedPath> {}
export interface SavedRobotConfig {
  mass: number;
  rotationalInertia: number;
  wheelbase: number;
  trackWidth: number;
  wheelRadius: number;
  wheelMaxVelocity: number;
  wheelMaxTorque: number;
  bumperLength: number;
  bumperWidth: number;
}
export interface SavedDocument {
  version: typeof SAVE_FILE_VERSION;
  robotConfiguration: SavedRobotConfig;
  paths: SavedPathList;
}
export type SavedWaypointId = "first" | "last" | number;
export interface SavedConstraint {
  scope: Array<SavedWaypointId>;
  type: string;
  [key: string]: unknown;
}
