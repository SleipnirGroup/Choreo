import { applySnapshot, getRoot, Instance, types } from "mobx-state-tree";
import { safeGetIdentifier } from "../util/mobxutils";
import { IStateStore } from "./DocumentModel";
import { SavedRobotConfig } from "./DocumentSpecTypes";

export const RobotConfigStore = types
  .model("RobotConfigStore", {
    mass: 45,
    rotationalInertia: 6,
    motorMaxVelocity: 6000, // kraken max speed in rpm
    motorMaxTorque: 1,
    gearing: 6.75,
    wheelRadius: 0.0508, // 2 in
    bumperWidth: 0.9,
    bumperLength: 0.9,
    wheelbase: 0.622,
    trackWidth: 0.622,
    identifier: types.identifier,
  })
  .views((self) => {
    return {
      get wheelMaxVelocity() {
        return (self.motorMaxVelocity * (Math.PI * 2)) / 60 / self.gearing;
      },
      get wheelMaxTorque() {
        return self.motorMaxTorque * self.gearing;
      },
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
      },
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
        let {
          mass,
          rotationalInertia,
          motorMaxTorque,
          motorMaxVelocity,
          gearing,
          wheelbase,
          trackWidth: trackwidth,
          bumperLength,
          bumperWidth,
          wheelRadius,
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
          wheelRadius,
        };
      },
      asSolverRobotConfig(): SavedRobotConfig & {
        wheelMaxTorque: number;
        wheelMaxVelocity: number;
      } {
        let {
          mass,
          rotationalInertia,
          motorMaxTorque,
          motorMaxVelocity,
          gearing,
          wheelbase,
          trackWidth: trackwidth,
          bumperLength,
          bumperWidth,
          wheelRadius,
        } = self;
        let wheelMaxTorque = self.wheelMaxTorque;
        let wheelMaxVelocity = self.wheelMaxVelocity;
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
          wheelRadius,
          wheelMaxTorque,
          wheelMaxVelocity,
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
      },
    };
  });
export interface IRobotConfigStore extends Instance<typeof RobotConfigStore> {}
