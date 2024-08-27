import { Instance, getEnv, getParent, isAlive, types } from "mobx-state-tree";
import { Expr, Waypoint } from "./2025/DocumentTypes";
import { Env } from "./DocumentManager";
import { ExpressionStore } from "./ExpressionStore";
import { NavbarItemData } from "./UIData";

export const DEFAULT_WAYPOINT: Waypoint<number> = {
  x: 0,
  y: 0,
  heading: 0,
  fixTranslation: true,
  fixHeading: true,
  intervals: 40,
  split: false,
  overrideIntervals: false
};
export const HolonomicWaypointStore = types
  .model("WaypointStore", {
    x: ExpressionStore,
    y: ExpressionStore,
    heading: ExpressionStore,
    fixTranslation: true,
    fixHeading: true,
    intervals: 40,
    overrideIntervals: false,
    split: false,
    uuid: types.identifier
  })
  .views((self) => {
    return {
      get type(): number {
        if (self.fixHeading) {
          return 0; // Full
        } else if (self.fixTranslation) {
          return 1; // Translation
        } else {
          return 2; // Empty
        }
      },
      get selected(): boolean {
        if (!isAlive(self)) {
          return false;
        }
        return self.uuid === getEnv<Env>(self).selectedSidebar();
      },
      serialize(): Waypoint<Expr> {
        return {
          x: self.x.serialize(),
          y: self.y.serialize(),
          heading: self.heading.serialize(),
          fixTranslation: self.fixTranslation,
          fixHeading: self.fixHeading,
          intervals: self.intervals,
          overrideIntervals: self.overrideIntervals,
          split: self.split
        };
      }
    };
  })
  .views((self) => ({
    get typeName() {
      return NavbarItemData[self.type].name;
    },
    isLast(): boolean {
      try {
        const list = getParent<IHolonomicWaypointStore[]>(self);
        return list[list.length - 1]?.uuid === self.uuid;
      } catch (e) {
        console.error(e);
        return false;
      }
    }
  }))
  .actions((self) => {
    return {
      deserialize(point: Waypoint<Expr>) {
        self.x.deserialize(point.x);
        self.y.deserialize(point.y);
        self.heading.deserialize(point.heading);
        self.fixTranslation = point.fixTranslation;
        self.fixHeading = point.fixHeading;
        self.intervals = point.intervals;
        self.overrideIntervals = point.overrideIntervals;
        self.split = point.split;
      },
      setFixTranslation(fixTranslation: boolean) {
        self.fixTranslation = fixTranslation;
      },
      setFixHeading(fixHeading: boolean) {
        self.fixHeading = fixHeading;
      },
      setSelected(selected: boolean) {
        if (selected && !self.selected) {
          getEnv<Env>(self).select(
            getParent<IHolonomicWaypointStore[]>(self)?.find(
              (point) => self.uuid == point.uuid
            )
          );
        }
      },
      setIntervals(count: number) {
        self.intervals = count;
      },
      setOverrideIntervals(override: boolean) {
        self.overrideIntervals = override;
      },
      setSplit(split: boolean) {
        self.split = split;
      }
    };
  })
  .actions((self) => ({
    setType(type: number) {
      self.setFixHeading(type == 0);
      self.setFixTranslation(type == 0 || type == 1);
    }
  }))
  .views((self) => ({
    copyToClipboard(evt: ClipboardEvent) {
      console.log("copying waypoint to", evt.clipboardData);
      const content = JSON.stringify({
        dataType: "choreo/waypoint",
        ...self.serialize()
      });
      evt.clipboardData?.setData("text/plain", content);
      console.log(evt.clipboardData);
    }
  }));
export type IHolonomicWaypointStore = Instance<typeof HolonomicWaypointStore>;
