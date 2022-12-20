import Waypoint from "./Waypoint";

export default class HolonomicWaypoint extends Waypoint {
    velocityX: number = 0;
    velocityY: number = 0;
    angularVelocity: number = 0;
    velocityXConstrained: boolean = false;
    velocityYConstrained: boolean = false;
    velocityMagnitudeConstrained: boolean = false;
    angularVelocityConstrained: boolean = false;

}
