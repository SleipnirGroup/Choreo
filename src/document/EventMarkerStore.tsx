import {
  IAnyType,
  Instance,
  types,
  getRoot,
  isAlive,
  getParent,
} from "mobx-state-tree";
import { safeGetIdentifier } from "../util/mobxutils";
import { WaypointID, WaypointScope } from "./ConstraintStore";
import { IStateStore } from "./DocumentModel";
import { SavedCommand } from "./DocumentSpecTypes";
import { IHolonomicPathStore } from "./HolonomicPathStore";

export const CommandStore = types
  .model("CommandStore", {
    type: types.union(
      types.literal("parallel"),
      types.literal("sequential"),
      types.literal("deadline"),
      types.literal("race"),
      types.literal("wait"),
      types.literal("named")
    ),
    commands: types.array(types.late((): IAnyType => CommandStore)),
    time: types.number,
    name: types.maybeNull(types.string),
    uuid: types.identifier,
  })
  .views((self) => ({
    isGroup(): boolean {
      return (
        self.type === "deadline" ||
        self.type === "race" ||
        self.type === "parallel" ||
        self.type === "sequential"
      );
    },
    asSavedCommand(): SavedCommand {
      if (self.type === "named") {
        return {
          type: "named",
          data: {
            name: self.name,
          },
        };
      } else if (self.type === "wait") {
        return {
          type: "wait",
          data: {
            time: self.time,
          },
        };
      } else {
        return {
          type: self.type,
          data: {
            commands: self.commands.map((c) => c.asSavedCommand()),
          },
        };
      }
    },
  }))
  .actions((self) => ({
    fromSavedCommand(saved: SavedCommand) {
      self.commands.clear();
      self.name = "";
      self.time = 0;
      self.type = saved.type;
      if (saved.type === "named") {
        self.name = saved.data.name;
      } else if (saved.type === "wait") {
        self.time = saved.data.time;
      } else {
        saved.data.commands.forEach((s) => {
          let command = CommandStore.create();
          command.fromSavedCommand(s);
          self.commands.push(command);
        });
      }
    },
  }));

export interface ICommandStore extends Instance<typeof CommandStore> {}
export const EventMarkerStore = types
  .model("EventMarker", {
    name: types.string,
    target: WaypointScope,
    trajTargetIndex: types.number,
    offset: types.number,
    command: CommandStore,
    uuid: types.identifier,
  })
  .views((self) => ({
    get selected(): boolean {
      if (!isAlive(self)) {
        return false;
      }
      return (
        self.uuid ==
        safeGetIdentifier(
          getRoot<IStateStore>(self).uiState.selectedSidebarItem
        )
      );
    },
    setSelected(selected: boolean) {
      if (selected && !this.selected) {
        const root = getRoot<IStateStore>(self);
        root.select(
          getParent<IEventMarkerStore[]>(self)?.find(
            (point) => self.uuid == point.uuid
          )
        );
      }
    },
    getPath(): IHolonomicPathStore {
      const path: IHolonomicPathStore = getParent<IHolonomicPathStore>(
        getParent<IEventMarkerStore[]>(self)
      );
      return path;
    },
    getTargetIndex(): number | undefined {
      const path: IHolonomicPathStore = getParent<IHolonomicPathStore>(
        getParent<IEventMarkerStore[]>(self)
      );
      if (path === undefined) {
        return undefined;
      }
      const startScope = self.target;
      if (startScope === undefined) {
        return undefined;
      }
      const waypoint = path.getByWaypointID(startScope);
      if (waypoint === undefined) return undefined;
      return path.findUUIDIndex(waypoint.uuid);
    },
  }))
  .views((self) => ({
    get trajTimestamp(): number | undefined {
      let path = self.getPath();
      if (path === undefined) {
        return undefined;
      }
      return (path as IHolonomicPathStore).generatedWaypoints[
        self.trajTargetIndex
      ]?.timestamp;
    },
    get timestamp(): number | undefined {
      if (this.trajTimestamp === undefined) {
        return undefined;
      }
      return this.trajTimestamp + self.offset;
    },
  }))
  .actions((self) => ({
    setTrajTargetIndex(index: number | undefined) {
      if (index !== undefined) {
        self.trajTargetIndex = index;
      }
    },
    updateTargetIndex() {
      this.setTrajTargetIndex(self.getTargetIndex());
    },
    setTarget(target: WaypointID) {
      self.target = target;
    },
    setOffset(offset: number) {
      self.offset = offset;
    },
  }));

export interface IEventMarkerStore extends Instance<typeof EventMarkerStore> {}
