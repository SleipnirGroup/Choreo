import {
  IAnyType,
  Instance,
  destroy,
  detach,
  getEnv,
  types
} from "mobx-state-tree";
import { moveItem } from "mobx-utils";
import {
  ChoreolibEvent,
  Command,
  Expr,
  GroupCommand,
  NamedCommand,
  WaitCommand
} from "./2025/DocumentTypes";
import { Env } from "./DocumentManager";
import { ExpressionStore } from "./ExpressionStore";

export type CommandGroupType = "sequential" | "parallel" | "deadline" | "race";
export type CommandType = CommandGroupType | "wait" | "named" | "choreolib";
export const CommandTypeNames = {
  sequential: { id: "sequential", name: "Sequence" },
  parallel: { id: "parallel", name: "Parallel" },
  deadline: { id: "deadline", name: "Deadline" },
  race: { id: "race", name: "Race" },
  wait: { id: "wait", name: "Wait" },
  named: { id: "named", name: "Named" },
  choreolib: { id: "choreolib", name: "Choreolib" }
};
export const CommandUIData = Object.values(CommandTypeNames);
export function commandIsNamed(command: Command): command is NamedCommand {
  return command.type === "named";
}
export function commandTypeIsGroup(type: CommandType) {
  return (
    type === "deadline" ||
    type === "race" ||
    type === "parallel" ||
    type === "sequential"
  );
}
export function commandIsGroup(command: Command): command is GroupCommand {
  return commandTypeIsGroup(command.type);
}
export function commandIsWait(command: Command): command is WaitCommand {
  return command.type === "wait";
}
export function commandIsChoreolib(
  command: Command
): command is ChoreolibEvent {
  return command.type === "choreolib";
}
export const CommandStore = types
  .model("CommandStore", {
    type: types.union(
      types.literal("parallel"),
      types.literal("sequential"),
      types.literal("deadline"),
      types.literal("race"),
      types.literal("wait"),
      types.literal("named"),
      types.literal("choreolib")
    ),
    commands: types.array(types.late((): IAnyType => CommandStore)),
    time: ExpressionStore,
    name: types.maybeNull(types.string),
    event: types.maybeNull(types.string),
    uuid: types.identifier
  })
  .views((self) => ({
    get isGroup(): boolean {
      return commandTypeIsGroup(self.type);
    },
    get isChoreolib(): boolean {
      return self.type === "choreolib";
    },
    get isNamed(): boolean {
      return self.type === "named";
    },
    get isWait(): boolean {
      return self.type === "wait";
    }
  }))
  .views((self) => ({
    get serialize(): Command {
      if (self.isNamed) {
        return {
          type: "named",
          data: {
            name: self.name
          }
        };
      } else if (self.isWait) {
        return {
          type: "wait",
          data: {
            waitTime: self.time.serialize
          }
        };
      } else if (self.isChoreolib) {
        return {
          type: "choreolib",
          data: {
            event: self.event
          }
        };
      } else {
        return {
          type: self.type as CommandGroupType,
          data: {
            commands: self.commands.map((c) => c.serialize)
          }
        };
      }
    }
  }))
  .actions((self) => ({
    deserialize(ser: Command) {
      self.commands.clear();
      self.name = "";
      self.event = "";
      self.type = ser.type;
      if (commandIsNamed(ser)) {
        self.name = ser.data.name;
      } else if (commandIsWait(ser)) {
        self.time.deserialize(ser.data.waitTime);
      } else if (commandIsChoreolib(ser)) {
        self.event = ser.data.event;
      } else {
        ser.data.commands.forEach((c) => {
          const command: ICommandStore =
            getEnv<Env>(self).create.CommandStore(c);
          command.deserialize(c);
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
    setEvent(event: string) {
      self.event = event;
    },
    addSubCommand() {
      // TODO add subcommand
      const newCommand = getEnv<Env>(self).create.CommandStore({
        type: "named",
        data: {
          waitTime: { exp: "0 s", val: 0 } as Expr,
          name: "",
          commands: []
        }
      });
      self.commands.push(newCommand);
      return undefined;
    },
    pushCommand(subcommand: IAnyType) {
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
