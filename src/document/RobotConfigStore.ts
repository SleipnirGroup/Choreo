import { applySnapshot, getEnv, getRoot, Instance, types } from "mobx-state-tree";
import {
  maxTorqueCurrentLimited,
  MotorCurves
} from "../components/config/robotconfig/MotorCurves";
import { InToM, LbsToKg, MToIn } from "../util/UnitConversions";
import { SavedRobotConfig } from "./DocumentSpecTypes";
import { ExpressionStore, SerialExpr, Units } from "./ExpressionStore";
import { Unit } from "mathjs";

const DEFAULT_FRAME_SIZE = InToM(28);
const DEFAULT_BUMPER = DEFAULT_FRAME_SIZE + 2 * InToM(2.5 + 0.75); // 28x28 bot with 2.5" noodle and 0.75" backing
const DEFAULT_WHEELBASE = DEFAULT_FRAME_SIZE - 2 * InToM(2.625); //SDS Mk4i contact patch is 2.625 in from frame edge
export const ROBOT_CONFIG_DEFAULTS : SavedRobotConfig = {
  mass: LbsToKg(150),
  rotationalInertia: 6,
  motorMaxVelocity: MotorCurves.KrakenX60.motorMaxVelocity * 0.8,
  motorMaxTorque: maxTorqueCurrentLimited(MotorCurves.KrakenX60.kt, 60),
  gearing: 6.75, // SDS L2 mk4/mk4i
  wheelRadius: InToM(2),
  bumperWidth: DEFAULT_BUMPER,
  bumperLength: DEFAULT_BUMPER,
  wheelbase: DEFAULT_WHEELBASE,
  trackWidth: DEFAULT_WHEELBASE
} as const;
export const EXPR_DEFAULTS : ExprRobotConfig = {
  mass: "150 lbs",
  rotationalInertia: 6,
  motorMaxVelocity: `${MotorCurves.KrakenX60.motorMaxVelocity * 0.8} rpm`,
  motorMaxTorque: maxTorqueCurrentLimited(MotorCurves.KrakenX60.kt, 60),
  gearing: 6.75, // SDS L2 mk4/mk4i
  wheelRadius: "2 in",
  bumperWidth: `${MToIn(DEFAULT_BUMPER)} in`,
  bumperLength: `${MToIn(DEFAULT_BUMPER)} in`,
  wheelbase: `${MToIn(DEFAULT_WHEELBASE)} in`,
  trackWidth: `${MToIn(DEFAULT_WHEELBASE)} in`
}
export type SerialRobotConfig = Record<keyof typeof ROBOT_CONFIG_DEFAULTS, SerialExpr>
export type ExprRobotConfig = Record<keyof SavedRobotConfig, string | number>
export const RobotConfigStore = types
  .model("RobotConfigStore", {
    mass: ExpressionStore,
    rotationalInertia: ExpressionStore,
    motorMaxVelocity: ExpressionStore,
    motorMaxTorque: ExpressionStore,
    gearing: ExpressionStore,
    wheelRadius: ExpressionStore,
    bumperWidth: ExpressionStore,
    bumperLength: ExpressionStore,
    wheelbase: ExpressionStore,
    trackWidth: ExpressionStore,
    identifier: types.identifier
  })
  .views((self) => {
    return {
      get wheelMaxVelocity() {
        return (self.motorMaxVelocity.value * (Math.PI * 2)) / 60 / self.gearing.value;
      },
      get wheelMaxTorque() {
        return self.motorMaxTorque.value * self.gearing.value;
      },
      serialize() : SerialRobotConfig{
        return {
          mass: self.mass.serialize(),
          rotationalInertia: self.rotationalInertia.serialize(),
          motorMaxTorque: self.motorMaxTorque.serialize(),
          motorMaxVelocity: self.motorMaxVelocity.serialize(),
          gearing: self.gearing.serialize(),
          wheelbase: self.wheelbase.serialize(),
          trackWidth: self.trackWidth.serialize(),
          bumperLength: self.bumperLength.serialize(),
          bumperWidth: self.bumperWidth.serialize(),
          wheelRadius: self.wheelRadius.serialize()
        }
      }
    };
  })
  .actions((self) => {
    return {
      deserialize(config: SerialRobotConfig) {
        self.mass.deserialize(config.mass);
        self.rotationalInertia.deserialize(config.rotationalInertia);
        self.motorMaxVelocity.deserialize(config.motorMaxVelocity);
        self.motorMaxTorque.deserialize(config.motorMaxTorque);
        self.gearing.deserialize(config.gearing);
        self.wheelRadius.deserialize(config.wheelRadius);
        self.bumperWidth.deserialize(config.bumperWidth);
        self.bumperLength.deserialize(config.bumperLength);
        self.wheelbase.deserialize(config.wheelbase);
        self.trackWidth.deserialize(config.trackWidth);
      },
      fromSavedRobotConfig(config: SavedRobotConfig) {
        self.mass.set(config.mass);
        self.rotationalInertia.set(config.rotationalInertia);
        self.motorMaxVelocity.set(config.motorMaxVelocity);
        self.motorMaxTorque.set(config.motorMaxTorque);
        self.gearing.set(config.gearing);
        self.wheelRadius.set(config.wheelRadius);
        self.bumperWidth.set(config.bumperWidth);
        self.bumperLength.set(config.bumperLength);
        self.wheelbase.set(config.wheelbase);
        self.trackWidth.set(config.trackWidth);
      }
    };
  })
  .views((self) => {
    return {
      asSavedRobotConfig(): SavedRobotConfig {
        const {
          mass,
          rotationalInertia,
          motorMaxTorque,
          motorMaxVelocity,
          gearing,
          wheelbase,
          trackWidth: trackwidth,
          bumperLength,
          bumperWidth,
          wheelRadius
        } = self;
        return {
          mass: mass.value,
          rotationalInertia: rotationalInertia.value,
          motorMaxTorque: motorMaxTorque.value,
          motorMaxVelocity: motorMaxVelocity.value,
          gearing: gearing.value,
          wheelbase: wheelbase.value,
          trackWidth: trackwidth.value,
          bumperLength: bumperLength.value,
          bumperWidth: bumperWidth.value,
          wheelRadius: wheelRadius.value
        };
      },
      asSolverRobotConfig(): Omit<
        SavedRobotConfig,
        "motorMaxTorque" | "motorMaxVelocity" | "gearing"
      > & {
        wheelMaxTorque: number;
        wheelMaxVelocity: number;
      } {
        // JavaScript, please have better syntax for what we're trying to do here.
        const {
          mass,
          rotationalInertia,
          wheelbase,
          trackWidth,
          bumperLength,
          bumperWidth,
          wheelRadius,
          wheelMaxTorque,
          wheelMaxVelocity
        } = self;
        return {
          mass: mass.value,
          rotationalInertia: rotationalInertia.value,
          wheelbase: wheelbase.value,
          trackWidth: trackWidth.value,
          bumperLength: bumperLength.value,
          bumperWidth: bumperWidth.value,
          wheelRadius: wheelRadius.value,
          wheelMaxTorque,
          wheelMaxVelocity
        };
      },
      bumperSVGElement() {
        let l = self.bumperLength.value;
        let w = self.bumperWidth.value;
        return `M ${ l / 2} ${ w / 2}
                L ${ l / 2} ${-w / 2}
                L ${-l / 2} ${-w / 2}
                L ${-l / 2} ${ w / 2}
                L ${ l / 2} ${ w / 2}`;
      },
      dashedBumperSVGElement() {
        let l = self.bumperLength.value;
        let w = self.bumperWidth.value;
        return `
            M ${l / 2} ${w / 4}
            L ${l / 2} ${w / 2}
            L ${l / 4} ${w / 2}

            M ${-l / 4} ${w / 2}
            L ${-l / 2} ${w / 2}
            L ${-l / 2} ${w / 4}

            M ${-l / 2} ${-w / 4}
            L ${-l / 2} ${-w / 2}
            L ${-l / 4} ${-w / 2}

            M ${l / 4} ${-w / 2}
            L ${l / 2} ${-w / 2}
            L ${l / 2} ${-w / 4}
            `;
      }
    };
  });
export interface IRobotConfigStore extends Instance<typeof RobotConfigStore> {}
