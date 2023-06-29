import ObstaclePoint from "./ObstaclePoint";

export default class Obstacle {
  safetyDistance: number = 0;
  applyToAllSegments: boolean = false;
  points: Array<ObstaclePoint>;
  constructor(
    safetyDistance: number,
    applyToAllSegments: boolean,
    points: Array<ObstaclePoint>
  ) {
    this.safetyDistance = safetyDistance;
    this.applyToAllSegments = applyToAllSegments;
    this.points = points;
  }
}
