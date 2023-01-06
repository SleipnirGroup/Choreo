import HolonomicWaypoint from "./HolonomicWaypoint";

export default class HolonomicPath {
    waypoints: Array<HolonomicWaypoint>;


    constructor(waypoints: Array<HolonomicWaypoint>) {
        this.waypoints = waypoints;
    }

    addWaypoint() {
        let name = Math.random().toString();
        this.waypoints.push(new HolonomicWaypoint(name))
    }
}
