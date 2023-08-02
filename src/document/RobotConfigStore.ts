import { getRoot, Instance, types } from "mobx-state-tree";
import { safeGetIdentifier } from "../util/mobxutils";
import { IDocumentModelStore } from "./DocumentModel";
import { SavedRobotConfig } from "./DocumentSpecTypes";

export const RobotConfigStore = types
  .model("RobotConfigStore", {
    mass: 45,
    rotationalInertia: 6,
    wheelMaxVelocity: 70, // 15 fps
    wheelMaxTorque: 2.0,
    wheelRadius: 0.0508, // 2 in
    bumperWidth: 0.9,
    bumperLength: 0.9,
    wheelbase: 0.622,
    trackWidth: 0.622,
    identifier: types.identifier,
  })
  .actions((self) => {
    return {
      fromSavedRobotConfig(config: SavedRobotConfig) {
        let {
          mass,
          rotationalInertia,
          wheelMaxTorque,
          wheelMaxVelocity,
          wheelbase,
          trackWidth,
          bumperLength,
          bumperWidth,
          wheelRadius,
        } = config;
        self.mass = mass;
        self.rotationalInertia = rotationalInertia;
        self.wheelMaxTorque = wheelMaxTorque;
        self.wheelMaxVelocity = wheelMaxVelocity;
        self.wheelbase = wheelbase;
        self.trackWidth = trackWidth;
        self.bumperLength = bumperLength;
        self.bumperWidth = bumperWidth;
        self.wheelRadius = wheelRadius;
      },
      setMass(arg: number) {
        self.mass = arg;
      },
      setRotationalInertia(arg: number) {
        self.rotationalInertia = arg;
      },
      setMaxTorque(arg: number) {
        self.wheelMaxTorque = arg;
      },
      setMaxVelocity(arg: number) {
        self.wheelMaxVelocity = arg;
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
        const root = getRoot<IDocumentModelStore>(self);
        return (
          root.uiState.selectedSidebarItem !== undefined &&
          self.identifier == safeGetIdentifier(root.uiState.selectedSidebarItem)
        );
      },
      asSavedRobotConfig(): SavedRobotConfig {
        let {
          mass,
          rotationalInertia,
          wheelMaxTorque,
          wheelMaxVelocity,
          wheelbase,
          trackWidth: trackwidth,
          bumperLength,
          bumperWidth,
          wheelRadius,
        } = self;
        return {
          mass,
          rotationalInertia,
          wheelMaxTorque,
          wheelMaxVelocity,
          wheelbase,
          trackWidth: trackwidth,
          bumperLength,
          bumperWidth,
          wheelRadius,
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
    };
  });
export interface IRobotConfigStore extends Instance<typeof RobotConfigStore> {}
