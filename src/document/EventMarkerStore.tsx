import {
  IAnyType,
  Instance,
  types,
  getRoot,
  isAlive,
  getParent,
  destroy,
  detach
} from "mobx-state-tree";
import { moveItem } from "mobx-utils";
import { safeGetIdentifier } from "../util/mobxutils";
import { WaypointID, WaypointScope } from "./ConstraintStore";
import { IStateStore } from "./DocumentModel";
import { SavedCommand } from "./DocumentSpecTypes";
import { IHolonomicPathStore } from "./HolonomicPathStore";
import { v4 as uuidv4 } from "uuid";

export type CommandType =
  | "sequential"
  | "parallel"
  | "deadline"
  | "race"
  | "wait"
  | "named";
export const CommandTypeNames = {
  sequential: { id: "sequential", name: "Sequence" },
  parallel: { id: "parallel", name: "Parallel" },
  deadline: { id: "deadline", name: "Deadline" },
  race: { id: "race", name: "Race" },
  wait: { id: "wait", name: "Wait" },
  named: { id: "named", name: "Named" }
};
export const CommandUIData = Object.values(CommandTypeNames);

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
    uuid: types.identifier
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
            name: self.name
          }
        };
      } else if (self.type === "wait") {
        return {
          type: "wait",
          data: {
            waitTime: self.time
          }
        };
      } else {
        return {
          type: self.type,
          data: {
            commands: self.commands.map((c) => c.asSavedCommand())
          }
        };
      }
    }
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
        self.time = saved.data.waitTime;
      } else {
        saved.data.commands.forEach((s) => {
          const command = CommandStore.create({
            type: "wait",
            time: 0,
            uuid: uuidv4()
          });
          command.fromSavedCommand(s);
          self.commands.push(command);
        });
      }
    },
    reorder(startIndex: number, endIndex: number) {
      moveItem(self.commands, startIndex, endIndex);
    },
    setType(type: CommandType) {
      self.type = type;
    },
    setName(name: string) {
      self.name = name;
    },
    setTime(waitTime: number) {
      self.time = Math.max(0, waitTime);
    },
    addSubCommand() {
      const newCommand = CommandStore.create({
        type: "named",
        uuid: uuidv4(),
        time: 0,
        name: "",
        commands: []
      });
      self.commands.push(newCommand);
      return newCommand;
    },
    pushCommand(subcommand: ICommandStore) {
      self.commands.push(subcommand);
    },
    detachCommand(index: number) {
      return detach(self.commands[index]);
    },
    deleteSubCommand(uuid: string) {
      const toDelete = self.commands.find((c) => c.uuid === uuid);
      if (toDelete !== undefined) {
        destroy(toDelete);
      }
    }
  }));

export interface ICommandStore extends Instance<typeof CommandStore> {}
export const EventMarkerStore = types
  .model("EventMarker", {
    name: types.string,
    target: WaypointScope,
    trajTargetIndex: types.maybe(types.number),
    offset: types.number,
    command: CommandStore,
    uuid: types.identifier
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
    }
  }))
  .views((self) => ({
    get targetTimestamp(): number | undefined {
      const path = self.getPath();
      if (self.trajTargetIndex === undefined) return undefined;
      return (path as IHolonomicPathStore).generatedWaypoints[
        self.trajTargetIndex
      ]?.timestamp;
    },
    get timestamp(): number | undefined {
      if (this.targetTimestamp === undefined) {
        return undefined;
      }
      return this.targetTimestamp + self.offset;
    }
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
    setName(name: string) {
      self.name = name;
    }
  }))
  .views((self) => ({
    /**
     *
     * @returns Returns undefined if the marker does not have both a timestamp and a target timestamp.
     * Otherwise, returns whether the target waypoint and the marker timestamp are on the same split part.
     */
    isInSameSegment(): boolean | undefined {
      const path = self.getPath();
      let retVal: boolean | undefined = true;
      const targetTimestamp = self.targetTimestamp;
      const timestamp = self.timestamp;
      if (targetTimestamp === undefined || timestamp === undefined) {
        retVal = undefined;
        return undefined;
      } else if (self.offset == 0) {
        return true;
      } else {
        path.generatedWaypoints.forEach((pt) => {
          if (pt.isStopPoint && retVal) {
            const stopTimestamp = pt.timestamp;
            if (
              (targetTimestamp < stopTimestamp && timestamp > stopTimestamp) ||
              (targetTimestamp > stopTimestamp && timestamp < stopTimestamp)
            ) {
              retVal = false;
            }
          }
        });
      }
      return retVal;
    }
  }));

export interface IEventMarkerStore extends Instance<typeof EventMarkerStore> {}
