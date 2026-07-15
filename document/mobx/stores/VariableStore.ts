import { types } from "mobx-state-tree";
import type { Variable } from "../../ts/src/generated/types";
import { ExprStore } from "./ExprStore";

export const VariableStore = types
  .model("VariableStore", {
    dimension: types.enumeration("VariableDimension", [
      "Number",
      "Length",
      "LinVel",
      "LinAcc",
      "Angle",
      "AngVel",
      "AngAcc",
      "Time",
      "Mass",
      "Torque",
      "MoI",
      "Current",
      "KT",
      "KV"
    ]),
    var: ExprStore
  })
  .views((self) => ({
    get serialize(): Variable {
      return {
        dimension: self.dimension as Variable["dimension"],
        var: self.var.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: Variable) {
      self.dimension = value.dimension as typeof self.dimension;
      self.var.deserialize(value.var);
    }
  }));
