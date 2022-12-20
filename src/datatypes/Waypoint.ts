export default class Waypoint {
    x: number = 0;
    y: number = 0;
    heading: number = 0;
    xConstrained: boolean = false;
    yConstrained: boolean = false;
    headingConstrained: boolean = false;
    controlIntervalCount: number = 0;
}
