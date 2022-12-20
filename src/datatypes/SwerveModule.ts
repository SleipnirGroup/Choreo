export default class SwerveModule {
    x: number;
    y: number;
    wheelRadius: number;
    wheelMaxAngularVelocity: number;
    wheelMaxTorque: number;
    constructor(
        x: number,
        y: number,
        wheelRadius: number,
        wheelMaxAngularVelocity: number,
        wheelMaxTorque: number
    ) {
        this.x = x;
        this.y = y;
        this.wheelRadius = wheelRadius;
        this.wheelMaxAngularVelocity = wheelMaxAngularVelocity;
        this.wheelMaxTorque = wheelMaxTorque;
    }
}
