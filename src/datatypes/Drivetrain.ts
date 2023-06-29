import Obstacle from "./Obstacle";

export default class Drivetrain {
  mass: number = 0;
  moi: number = 0;
  bumpers: Obstacle;
  constructor(mass: number, moi: number, bumpers: Obstacle) {
    this.mass = mass;
    this.moi = moi;
    this.bumpers = bumpers;
  }
}
