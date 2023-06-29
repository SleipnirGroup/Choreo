import HolonomicDrivetrain from "./HolonomicDrivetrain";
import Obstacle from "./Obstacle";
import SwerveModule from "./SwerveModule";

export default class SwerveDrivetrain extends HolonomicDrivetrain {
  modules: Array<SwerveModule>;
  constructor(
    mass: number,
    moi: number,
    bumpers: Obstacle,
    modules: Array<SwerveModule>
  ) {
    super(mass, moi, bumpers);
    this.modules = modules;
  }
}
