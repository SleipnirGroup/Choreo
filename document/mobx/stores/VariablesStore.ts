import { types } from "mobx-state-tree";
import type { Variables } from "../../ts/src/generated/types";
import { Pose2EStore } from "./Pose2EStore";
import { Region2EStore } from "./Region2EStore";
import { Translation2EStore } from "./Translation2EStore";
import { VariableStore } from "./VariableStore";

export const VariablesStore = types
  .model("VariablesStore", {
    expressions: types.optional(types.map(VariableStore), {}),
    translations: types.optional(types.map(Translation2EStore), {}),
    poses: types.optional(types.map(Pose2EStore), {}),
    regions: types.optional(types.map(Region2EStore), {})
  })
  .views((self) => ({
    get serialize(): Variables {
      return {
        expressions: Object.fromEntries(
          Array.from(self.expressions.entries()).map(([k, v]) => [k, v.serialize])
        ),
        translations: Object.fromEntries(
          Array.from(self.translations.entries()).map(([k, v]) => [k, v.serialize])
        ),
        poses: Object.fromEntries(
          Array.from(self.poses.entries()).map(([k, v]) => [k, v.serialize])
        ),
        regions: Object.fromEntries(
          Array.from(self.regions.entries()).map(([k, v]) => [k, v.serialize])
        )
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: Variables) {
      self.expressions.clear();
      self.translations.clear();
      self.poses.clear();
      self.regions.clear();

      for (const [key, item] of Object.entries(value.expressions ?? {})) {
        self.expressions.set(
          key,
          VariableStore.create({
            dimension: item.dimension,
            var: {
              exp: item.var.exp,
              val: item.var.val
            }
          })
        );
      }

      for (const [key, item] of Object.entries(value.translations ?? {})) {
        self.translations.set(
          key,
          Translation2EStore.create({
            x: { exp: item.x.exp, val: item.x.val },
            y: { exp: item.y.exp, val: item.y.val }
          })
        );
      }

      for (const [key, item] of Object.entries(value.poses ?? {})) {
        self.poses.set(
          key,
          Pose2EStore.create({
            x: { exp: item.x.exp, val: item.x.val },
            y: { exp: item.y.exp, val: item.y.val },
            heading: { exp: item.heading.exp, val: item.heading.val }
          })
        );
      }

      for (const [key, item] of Object.entries(value.regions ?? {})) {
        self.regions.set(
          key,
          Region2EStore.create({
            x: { exp: item.x.exp, val: item.x.val },
            y: { exp: item.y.exp, val: item.y.val },
            heading: { exp: item.heading.exp, val: item.heading.val },
            w: { exp: item.w.exp, val: item.w.val },
            h: { exp: item.h.exp, val: item.h.val }
          })
        );
      }
    }
  }));
