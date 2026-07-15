import { types } from "mobx-state-tree";
import type { RobotConfig } from "../../ts/src/generated/types";
import { ExprStore } from "./ExprStore";
import { MotorConfigStore } from "./MotorConfigStore";
import { Translation2EStore } from "./Translation2EStore";

export const RobotConfigStore = types
  .model("RobotConfigStore", {
    mass: ExprStore,
    inertia: ExprStore,
    gearing: ExprStore,
    radius: ExprStore,
    cof: ExprStore,
    differential_track_width: ExprStore,
    wheels: types.array(Translation2EStore),
    bumpers: types.array(Translation2EStore),
    motor: MotorConfigStore
  })
  .views((self) => ({
    get serialize(): RobotConfig {
      const wheels = self.wheels.map((item) => item.serialize);
      if (wheels.length !== 4) {
        throw new Error("RobotConfigStore requires exactly 4 wheel entries.");
      }

      return {
        mass: self.mass.serialize,
        inertia: self.inertia.serialize,
        gearing: self.gearing.serialize,
        radius: self.radius.serialize,
        cof: self.cof.serialize,
        differential_track_width: self.differential_track_width.serialize,
        wheels: [wheels[0], wheels[1], wheels[2], wheels[3]],
        bumpers: self.bumpers.map((item) => item.serialize),
        motor: self.motor.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: RobotConfig) {
      self.mass.deserialize(value.mass);
      self.inertia.deserialize(value.inertia);
      self.gearing.deserialize(value.gearing);
      self.radius.deserialize(value.radius);
      self.cof.deserialize(value.cof);
      self.differential_track_width.deserialize(value.differential_track_width);
      self.wheels.clear();
      value.wheels.forEach((wheel) => {
        self.wheels.push(Translation2EStore.create(wheel));
      });
      self.bumpers.clear();
      value.bumpers.forEach((bumper) => {
        self.bumpers.push(Translation2EStore.create(bumper));
      });
      self.motor.deserialize(value.motor);
    }
  }));
