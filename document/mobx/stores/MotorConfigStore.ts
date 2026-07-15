import { types } from "mobx-state-tree";
import type { MotorConfig } from "../../ts/src/generated/types";
import { ExprStore } from "./ExprStore";

export const MotorConfigStore = types
  .model("MotorConfigStore", {
    free_speed: ExprStore,
    stall_torque: ExprStore,
    kT: ExprStore,
    kV: ExprStore,
    supply_limit: ExprStore,
    stator_limit: ExprStore
  })
  .views((self) => ({
    get serialize(): MotorConfig {
      return {
        free_speed: self.free_speed.serialize,
        stall_torque: self.stall_torque.serialize,
        kT: self.kT.serialize,
        kV: self.kV.serialize,
        supply_limit: self.supply_limit.serialize,
        stator_limit: self.stator_limit.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: MotorConfig) {
      self.free_speed.deserialize(value.free_speed);
      self.stall_torque.deserialize(value.stall_torque);
      self.kT.deserialize(value.kT);
      self.kV.deserialize(value.kV);
      self.supply_limit.deserialize(value.supply_limit);
      self.stator_limit.deserialize(value.stator_limit);
    }
  }));
