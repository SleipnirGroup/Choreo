import { types } from "mobx-state-tree";
import type { Expr } from "../../ts/src/generated/types";

export const ExprStore = types
  .model("ExprStore", {
    exp: types.string,
    val: types.number
  })
  .views((self) => ({
    get serialize(): Expr {
      return {
        exp: self.exp,
        val: self.val
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: Expr) {
      self.exp = value.exp;
      self.val = value.val;
    }
  }));
