import { applySnapshot, getRoot, Instance, types } from "mobx-state-tree";
import {
  maxTorqueCurrentLimited,
  MotorCurves
} from "../components/config/robotconfig/MotorCurves";
import { safeGetIdentifier } from "../util/mobxutils";
import { InToM, LbsToKg } from "../util/UnitConversions";
import { IStateStore } from "./DocumentModel";
import { SavedRobotConfig } from "./DocumentSpecTypes";

const DEFAULT_FRAME_SIZE = InToM(28);
const DEFAULT_BUMPER = DEFAULT_FRAME_SIZE + 2 * InToM(2.5 + 0.75); // 28x28 bot with 2.5" noodle and 0.75" backing
const DEFAULT_WHEELBASE = DEFAULT_FRAME_SIZE - 2 * InToM(2.625); //SDS Mk4i contact patch is 2.625 in from frame edge

export const ROBOT_CONFIG_DEFAULTS = {
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
};
export const RobotConfigStore = types
  .model("RobotConfigStore", {
    ...ROBOT_CONFIG_DEFAULTS,
    identifier: types.identifier
  })
  .views((self) => {
    return {
      get wheelMaxVelocity() {
        return (self.motorMaxVelocity * (Math.PI * 2)) / 60 / self.gearing;
      },
      get wheelMaxTorque() {
        return self.motorMaxTorque * self.gearing;
      }
    };
  })
  .actions((self) => {
    return {
      fromSavedRobotConfig(config: SavedRobotConfig) {
        applySnapshot(self, { identifier: self.identifier, ...config });
      },
      setMass(arg: number) {
        self.mass = arg;
      },
      setRotationalInertia(arg: number) {
        self.rotationalInertia = arg;
      },
      setMaxTorque(arg: number) {
        self.motorMaxTorque = arg;
      },
      setMaxVelocity(arg: number) {
        self.motorMaxVelocity = arg;
      },
      setGearing(arg: number) {
        self.gearing = arg;
      },
      setBumperWidth(arg: number) {
        self.bumperWidth = arg;
      },
      setBumperLength(arg: number) {
        self.bumperLength = arg;
      },
      setWheelbase(arg: number) {
        self.wheelbase = arg;
      },
      setTrackwidth(arg: number) {
        self.trackWidth = arg;
      },
      setWheelRadius(arg: number) {
        self.wheelRadius = arg;
      }
    };
  })
  .views((self) => {
    return {
      get selected(): boolean {
        const root = getRoot<IStateStore>(self);
        return (
          root.uiState.selectedSidebarItem !== undefined &&
          self.identifier == safeGetIdentifier(root.uiState.selectedSidebarItem)
        );
      },
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
          mass,
          rotationalInertia,
          wheelbase,
          trackWidth,
          bumperLength,
          bumperWidth,
          wheelRadius,
          wheelMaxTorque,
          wheelMaxVelocity
        };
      },
      bumperSVGElement() {
        return `M ${self.bumperLength / 2} ${self.bumperWidth / 2}
            L ${self.bumperLength / 2} ${-self.bumperWidth / 2}
            L ${-self.bumperLength / 2} ${-self.bumperWidth / 2}
            L ${-self.bumperLength / 2} ${self.bumperWidth / 2}
            L ${self.bumperLength / 2} ${self.bumperWidth / 2}
            `;
      },
      dashedBumperSVGElement() {
        return `M ${self.bumperLength / 2} ${self.bumperWidth / 4}
            L ${self.bumperLength / 2} ${self.bumperWidth / 2}
            L ${self.bumperLength / 4} ${self.bumperWidth / 2}

            M ${-self.bumperLength / 4} ${self.bumperWidth / 2}
            L ${-self.bumperLength / 2} ${self.bumperWidth / 2}
            L ${-self.bumperLength / 2} ${self.bumperWidth / 4}

            M ${-self.bumperLength / 2} ${-self.bumperWidth / 4}
            L ${-self.bumperLength / 2} ${-self.bumperWidth / 2}
            L ${-self.bumperLength / 4} ${-self.bumperWidth / 2}

            M ${self.bumperLength / 4} ${-self.bumperWidth / 2}
            L ${self.bumperLength / 2} ${-self.bumperWidth / 2}
            L ${self.bumperLength / 2} ${-self.bumperWidth / 4}
            `;
      }
    };
  });
export interface IRobotConfigStore extends Instance<typeof RobotConfigStore> {}
