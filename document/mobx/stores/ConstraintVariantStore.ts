import { types } from "mobx-state-tree";
import type { ConstraintVariant } from "../../ts/src/generated/types";
import { HeadingConstraintStore } from "./HeadingConstraintStore";
import { KeepInCircleStore } from "./KeepInCircleStore";
import { MaxAngularVelocityStore } from "./MaxAngularVelocityStore";
import { MaxVelocityStore } from "./MaxVelocityStore";

export const ConstraintVariantStore = types
  .model("ConstraintVariantStore", {
    kind: types.enumeration("ConstraintVariantKind", [
      "MaxVelocity",
      "MaxAngularVelocity",
      "KeepInCircle",
      "Heading"
    ]),
    maxVelocity: types.maybe(MaxVelocityStore),
    maxAngularVelocity: types.maybe(MaxAngularVelocityStore),
    keepInCircle: types.maybe(KeepInCircleStore),
    headingConstraint: types.maybe(HeadingConstraintStore)
  })
  .views((self) => ({
    get serialize(): ConstraintVariant {
      if (self.kind === "MaxVelocity" && self.maxVelocity) {
        return self.maxVelocity.serialize;
      }
      if (self.kind === "MaxAngularVelocity" && self.maxAngularVelocity) {
        return self.maxAngularVelocity.serialize;
      }
      if (self.kind === "KeepInCircle" && self.keepInCircle) {
        return self.keepInCircle.serialize;
      }
      if (self.kind === "Heading" && self.headingConstraint) {
        return self.headingConstraint.serialize;
      }
      throw new Error("ConstraintVariantStore is missing active variant data.");
    }
  }))
  .actions((self) => ({
    deserialize(value: ConstraintVariant) {
      self.maxVelocity = undefined;
      self.maxAngularVelocity = undefined;
      self.keepInCircle = undefined;
      self.headingConstraint = undefined;

      if (value.type === "MaxVelocity") {
        self.kind = "MaxVelocity";
        self.maxVelocity = MaxVelocityStore.create({
          type: "MaxVelocity",
          max: value.max
        });
        return;
      }

      if (value.type === "MaxAngularVelocity") {
        self.kind = "MaxAngularVelocity";
        self.maxAngularVelocity = MaxAngularVelocityStore.create({
          type: "MaxAngularVelocity",
          max: value.max
        });
        return;
      }

      if (value.type === "KeepInCircle") {
        self.kind = "KeepInCircle";
        self.keepInCircle = KeepInCircleStore.create({
          type: "KeepInCircle",
          x: value.x,
          y: value.y,
          r: value.r
        });
        return;
      }

      self.kind = "Heading";
      self.headingConstraint = HeadingConstraintStore.create({
        type: "Heading",
        heading: value.heading,
        tolerance: value.tolerance
      });
    }
  }));
