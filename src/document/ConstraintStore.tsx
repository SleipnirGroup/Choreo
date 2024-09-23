import { Instance, getEnv, getParent, isAlive, types } from "mobx-state-tree";
import {
  ConstraintDataObjects,
  IConstraintDataStore
} from "./ConstraintDataStore";
import { ConstraintKey } from "./ConstraintDefinitions";
import { Env } from "./DocumentManager";
import { IHolonomicWaypointStore } from "./HolonomicWaypointStore";
import { IChoreoPathStore } from "./path/ChoreoPathStore";
import { IHolonomicPathStore } from "./path/HolonomicPathStore";

export const WaypointScope = types.union(
  types.literal("first"),
  types.literal("last"),
  types.frozen<{ uuid: string }>()
);
export type IWaypointScope = IWaypointUUIDScope | "first" | "last";
type IWaypointUUIDScope = { uuid: string };

export type IConstraintStore = Instance<typeof ConstraintStore>;

export type IConstraintStoreKeyed<K extends ConstraintKey> =
  IConstraintStore & { data: IConstraintDataStore<K> };

export const ConstraintStore = types
  .model("ConstraintStore", {
    from: WaypointScope,
    to: types.maybe(WaypointScope),
    enabled: types.boolean,
    data: types.union(...Object.values(ConstraintDataObjects)),
    uuid: types.identifier
  })
  .views((self) => ({
    getType() {
      return self.data.type;
    },
    get wptScope() {
      return self.data.def.wptScope;
    },
    get sgmtScope() {
      return self.data.def.sgmtScope;
    },
    get selected(): boolean {
      if (!isAlive(self)) {
        return false;
      }
      return self.uuid === getEnv<Env>(self).selectedSidebar();
    },
    getPath(): IHolonomicPathStore {
      const path: IHolonomicPathStore = getParent<IHolonomicPathStore>(
        getParent<IChoreoPathStore>(getParent<IConstraintStore[]>(self))
      );
      return path;
    }
  }))
  .views((self) => ({
    getStartWaypoint(): IHolonomicWaypointStore | undefined {
      const startScope = self.from;
      return self.getPath().params.getByWaypointID(startScope);
    },
    getEndWaypoint(): IHolonomicWaypointStore | undefined {
      const scope = self.to ?? self.from;
      return self.getPath().params.getByWaypointID(scope);
    }
  }))
  .views((self) => ({
    getStartWaypointIndex(): number | undefined {
      const waypoint = self.getStartWaypoint();
      if (waypoint === undefined) return undefined;
      return self.getPath().params.findUUIDIndex(waypoint.uuid);
    },
    getEndWaypointIndex(): number | undefined {
      const waypoint = self.getEndWaypoint();
      if (waypoint === undefined) return undefined;
      return self.getPath().params.findUUIDIndex(waypoint.uuid);
    },

    get issues() {
      const startWaypoint = self.getStartWaypoint();
      const endWaypoint = self.getEndWaypoint();
      const issueText = [];

      if (self.to !== undefined) {
        if (startWaypoint === undefined || endWaypoint === undefined) {
          issueText.push("Constraint refers to missing waypoint(s)");
        }
      } else {
        if (startWaypoint === undefined) {
          issueText.push("Constraint refers to missing waypoint");
        }
      }
      return issueText;
    }
  }))
  .actions((self) => ({
    afterCreate() {},
    setFrom(from: IWaypointScope) {
      self.from = from;
    },
    setTo(to?: IWaypointScope) {
      self.to = to;
    },
    setSelected(selected: boolean) {
      if (selected && !self.selected) {
        getEnv<Env>(self).select(
          getParent<IConstraintStore[]>(self)?.find(
            (point) => self.uuid == point.uuid
          )
        );
      }
    },
    setEnabled(enabled: boolean) {
      self.enabled = enabled;
    }
  }));
