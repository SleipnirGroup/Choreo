/** CHANGES from v0.0.0:
 * Removed xConstrained, yConstrained, replaced with a combined translationConstrained
 */

export const SAVE_FILE_VERSION = "v0.1";
export interface SavedWaypoint {
  x: number;
  y: number;
  heading: number;
  velocityMagnitude: number;
  velocityAngle: number;
  angularVelocity: number;
  translationConstrained: boolean;
  headingConstrained: boolean;
  velocityMagnitudeConstrained: boolean;
  velocityAngleConstrained: boolean;
  angularVelocityConstrained: boolean;
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
  constraints: Array<SavedConstraint>
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
export interface SavedConstraint {
  scope: number | {start: number, end: number} | null | string;
  type:string;
  [key:string]: unknown;
}
