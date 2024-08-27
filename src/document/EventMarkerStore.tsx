import {
  IAnyType,
  Instance,
  destroy,
  detach,
  getEnv,
  getParent,
  isAlive,
  types
} from "mobx-state-tree";
import { moveItem } from "mobx-utils";
import { v4 as uuidv4 } from "uuid";
import { Command, Expr } from "./2025/DocumentTypes";
import { WaypointID } from "./ConstraintDefinitions";
import { WaypointScope } from "./ConstraintStore";
import { Env } from "./DocumentManager";
import { ExpressionStore } from "./ExpressionStore";
import { IChoreoTrajStore } from "./path/ChoreoTrajStore";
import { IHolonomicPathStore } from "./path/HolonomicPathStore";

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
    time: ExpressionStore,
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
    serialize(): Command<Expr> {
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
            waitTime: self.time.serialize()
          }
        };
      } else {
        return {
          type: self.type,
          data: {
            commands: self.commands.map((c) => c.serialize())
          }
        };
      }
    }
  }))
  .actions((self) => ({
    deserialize(ser: Command<Expr>) {
      self.commands.clear();
      self.name = "";
      self.type = ser.type;
      if (ser.type === "named") {
        self.name = ser.data.name;
      } else if (ser.type === "wait") {
        self.time.deserialize(ser.data.waitTime);
      } else {
        ser.data.commands.forEach((c) => {
          const command: ICommandStore =
            getEnv<Env>(self).create.CommandStore(c);
          self.commands.push(command);
        });
      }
    },
    reorderCommands(startIndex: number, endIndex: number) {
      moveItem(self.commands, startIndex, endIndex);
    },
    setType(type: CommandType) {
      self.type = type;
    },
    setName(name: string) {
      self.name = name;
    },
    addSubCommand() {
      // TODO add subcommand
      const newCommand = getEnv<Env>(self).create.CommandStore({
        type: "named",
        uuid: uuidv4(),
        time: ["0 s", 0],
        name: "",
        commands: []
      });
      self.commands.push(newCommand);
      return undefined;
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

export type ICommandStore = Instance<typeof CommandStore>;
export const EventMarkerStore = types
  .model("EventMarker", {
    name: types.string,
    target: types.maybe(WaypointScope),
    trajTargetIndex: types.maybe(types.number),
    offset: ExpressionStore,
    command: CommandStore,
    uuid: types.identifier
  })
  .views((self) => ({
    get selected(): boolean {
      if (!isAlive(self)) {
        return false;
      }
      return self.uuid === getEnv<Env>(self).selectedSidebar();
    },
    setSelected(selected: boolean) {
      if (selected && !this.selected) {
        getEnv<Env>(self).select(
          getParent<IEventMarkerStore[]>(self)?.find(
            (point) => self.uuid == point.uuid
          )
        );
      }
    },
    getPath(): IHolonomicPathStore {
      const path: IHolonomicPathStore = getParent<IHolonomicPathStore>(
        getParent<IChoreoTrajStore>(getParent<IEventMarkerStore[]>(self))
      );
      return path;
    },
    getTargetIndex(): number | undefined {
      const path: IHolonomicPathStore = this.getPath();
      if (path === undefined) {
        return undefined;
      }
      const startScope = self.target;
      if (startScope === undefined) {
        return undefined;
      }
      const waypoint = path.path.getByWaypointID(startScope);
      if (waypoint === undefined) return undefined;
      return path.path.findUUIDIndex(waypoint.uuid);
    }
  }))
  .views((self) => ({
    get targetTimestamp(): number | undefined {
      const path = self.getPath();
      if (self.trajTargetIndex === undefined) return undefined;
      return (path as IHolonomicPathStore).traj.waypoints[self.trajTargetIndex];
    },
    get timestamp(): number | undefined {
      if (this.targetTimestamp === undefined) {
        return undefined;
      }
      return this.targetTimestamp + self.offset.value;
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
      } else if (self.offset.value == 0) {
        return true;
      } else {
        const splitTimes = path.traj.samples.map((sect) => sect[0]?.t);
        splitTimes.forEach((stopTimestamp) => {
          if (
            (targetTimestamp < stopTimestamp && timestamp > stopTimestamp) ||
            (targetTimestamp > stopTimestamp && timestamp < stopTimestamp)
          ) {
            retVal = false;
          }
        });
      }
      return retVal;
    }
  }));

export type IEventMarkerStore = Instance<typeof EventMarkerStore>;
