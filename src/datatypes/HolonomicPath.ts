import HolonomicWaypoint from "./HolonomicWaypoint";

export default class HolonomicPath {
    holonomicWaypoints: Array<HolonomicWaypoint>;

    constructor(
        waypoints: Array<HolonomicWaypoint>
    ) {
        this.holonomicWaypoints = waypoints;
    }
}
