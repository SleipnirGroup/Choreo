import { dialog, path, window as tauriWindow } from "@tauri-apps/api";
import { TauriEvent } from "@tauri-apps/api/event";
import { DocumentStore, SelectableItemTypes } from "./DocumentModel";

import hotkeys from "hotkeys-js";
import { reaction } from "mobx";
import {
  applySnapshot,
  castToReferenceSnapshot,
  getSnapshot,
  walk
} from "mobx-state-tree";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import LocalStorageKeys from "../util/LocalStorageKeys";
import { ObjectTyped } from "../util/ObjectTyped";
import { safeGetIdentifier } from "../util/mobxutils";
import {
  PplibCommand,
  PplibCommandMarker,
  GroupCommand,
  NamedCommand,
  Project,
  Trajectory,
  WaitCommand,
  type Expr,
  type RobotConfig,
  type Waypoint
} from "./2025/DocumentTypes";
import {
  ConstraintDataObjects,
  IConstraintDataStore,
  defineCreateConstraintData
} from "./ConstraintDataStore";
import {
  ConstraintDefinitions,
  ConstraintKey,
  DataMap
} from "./ConstraintDefinitions";
import {
  ConstraintStore,
  IConstraintStore,
  IWaypointScope
} from "./ConstraintStore";
import {
  CommandStore,
  EventMarkerStore,
  ICommandStore,
  IEventMarkerStore
} from "./EventMarkerStore";
import { IExpressionStore, IVariables, Variables } from "./ExpressionStore";
import {
  IHolonomicWaypointStore,
  HolonomicWaypointStore as WaypointStore
} from "./HolonomicWaypointStore";
import {
  EXPR_DEFAULTS,
  IRobotConfigStore,
  RobotConfigStore
} from "./RobotConfigStore";
import { ViewLayerDefaults } from "./UIData";
import { UIStateStore } from "./UIStateStore";
import { Commands } from "./tauriCommands";
import { tracing } from "./tauriTracing";

export type OpenFilePayload = {
  name: string;
  dir: string;
};

export const uiState = UIStateStore.create({
  settingsTab: 0,

  layers: ViewLayerDefaults
});
type ConstraintDataConstructor<K extends ConstraintKey> = (
  data: Partial<DataMap[K]["props"]>
) => IConstraintDataStore<K>;

type ConstraintDataConstructors = {
  [key in ConstraintKey]: ConstraintDataConstructor<key>;
};
export type EnvConstructors = {
  RobotConfigStore: (config: RobotConfig<Expr>) => IRobotConfigStore;
  WaypointStore: (config: Waypoint<Expr>) => IHolonomicWaypointStore;
  CommandStore: (
    command: PplibCommand<Expr> &
      (
        | {
            data: WaitCommand<Expr>["data"] &
              GroupCommand<Expr>["data"] &
              NamedCommand["data"];
          }
        | object
      )
  ) => ICommandStore;
  EventMarkerStore: (marker: PplibCommandMarker<Expr>) => IEventMarkerStore;
  ConstraintData: ConstraintDataConstructors;
  ConstraintStore: <K extends ConstraintKey>(
    type: K,
    data: Partial<DataMap[K]["props"]>,
    enabled: boolean,
    from: IWaypointScope,
    to?: IWaypointScope
  ) => IConstraintStore;
};
function getConstructors(vars: () => IVariables): EnvConstructors {
  function commandIsNamed(
    command: PplibCommand<Expr>
  ): command is NamedCommand {
    return Object.hasOwn(command.data, "name");
  }
  function commandIsGroup(
    command: PplibCommand<Expr>
  ): command is GroupCommand<Expr> {
    return Object.hasOwn(command.data, "commands");
  }
  function commandIsTime(
    command: PplibCommand<Expr>
  ): command is WaitCommand<Expr> {
    return Object.hasOwn(command.data, "time");
  }
  function createCommandStore(command: PplibCommand<Expr>): ICommandStore {
    return CommandStore.create({
      type: command.type,
      name: commandIsNamed(command) ? command.data.name : "",
      commands: commandIsGroup(command)
        ? command.data.commands.map((c) => createCommandStore(c))
        : [],
      time: vars().createExpression(
        commandIsTime(command) ? command.data.waitTime : 0,
        "Time"
      ),
      uuid: crypto.randomUUID()
    });
  }

  const keys = ObjectTyped.keys(ConstraintDefinitions);
  const constraintDataConstructors = Object.fromEntries(
    keys.map(
      <K extends ConstraintKey>(key: K) =>
        [
          key,
          defineCreateConstraintData(key, ConstraintDefinitions[key], vars)
        ] as [
          K,
          (
            data: Partial<DataMap[K]["props"]>
          ) => (typeof ConstraintDataObjects)[K]["Type"]
        ]
    )
  ) as ConstraintDataConstructors;

  return {
    RobotConfigStore: (config: RobotConfig<Expr>) => {
      return RobotConfigStore.create({
        mass: vars().createExpression(config.mass, "Mass"),
        inertia: vars().createExpression(config.inertia, "MoI"),
        tmax: vars().createExpression(config.tmax, "Torque"),
        vmax: vars().createExpression(config.vmax, "AngVel"),
        gearing: vars().createExpression(config.gearing, "Number"),
        radius: vars().createExpression(config.radius, "Length"),
        bumper: {
          front: vars().createExpression(config.bumper.front, "Length"),
          side: vars().createExpression(config.bumper.side, "Length"),
          back: vars().createExpression(config.bumper.back, "Length")
        },
        frontLeft: {
          x: vars().createExpression(config.frontLeft.x, "Length"),
          y: vars().createExpression(config.frontLeft.y, "Length")
        },
        backLeft: {
          x: vars().createExpression(config.backLeft.x, "Length"),
          y: vars().createExpression(config.backLeft.y, "Length")
        },
        differentialTrackWidth: vars().createExpression(
          config.differentialTrackWidth,
          "Length"
        ),
        identifier: crypto.randomUUID()
      });
    },
    WaypointStore: (waypoint: Waypoint<Expr>) => {
      return WaypointStore.create({
        ...waypoint,
        x: vars().createExpression(waypoint.x, "Length"),
        y: vars().createExpression(waypoint.y, "Length"),
        heading: vars().createExpression(waypoint.heading, "Angle"),
        uuid: crypto.randomUUID()
      });
    },
    CommandStore: createCommandStore,
    EventMarkerStore: (marker: PplibCommandMarker<Expr>): IEventMarkerStore => {
      return EventMarkerStore.create({
        name: marker.name,
        target: undefined,
        trajectoryTargetIndex: marker.trajectoryTargetIndex,
        offset: vars().createExpression(marker.offset, "Time"),
        command: createCommandStore(marker.command),
        uuid: crypto.randomUUID()
      });
    },
    ConstraintData: constraintDataConstructors,
    ConstraintStore: <K extends ConstraintKey>(
      type: K,
      data: Partial<DataMap[K]["props"]>,
      enabled: boolean,
      from: IWaypointScope,
      to?: IWaypointScope
    ) => {
      const store = ConstraintStore.create({
        from,
        to,
        uuid: crypto.randomUUID(),
        //@ts-expect-error more constraint stuff not quite working
        data: constraintDataConstructors[type](data),
        enabled
      });
      store.data.deserPartial(data);
      return store;
    }
  };
}
const variables = Variables.create({ expressions: {}, poses: {} });

const env = {
  selectedSidebar: () => safeGetIdentifier(doc.selectedSidebarItem),
  select: (item: SelectableItemTypes) => select(item),
  withoutUndo: (callback: any) => {
    withoutUndo(callback);
  },
  startGroup: (callback: any) => {
    startGroup(callback);
  },
  stopGroup: () => {
    stopGroup();
  },
  vars: () => doc.variables,
  renameVariable: renameVariable,
  create: getConstructors(() => doc.variables)
};
export type Env = typeof env;
export const doc = DocumentStore.create(
  {
    robotConfig: getConstructors(() => variables).RobotConfigStore(
      EXPR_DEFAULTS
    ),
    type: "Swerve",
    pathlist: {
      defaultPath: undefined
    },
    name: "Untitled",
    //@ts-expect-error this is recommended, not sure why it doesn't work
    variables: castToReferenceSnapshot(variables),
    selectedSidebarItem: undefined
  },
  env
);
doc.pathlist.addDefaultPath();
function withoutUndo(callback: any) {
  doc.history.withoutUndo(callback);
}
function startGroup(callback: any) {
  doc.history.startGroup(callback);
}
function stopGroup() {
  doc.history.stopGroup();
}
function renameVariable(find: string, replace: string) {
  walk(doc, (node) => {
    if (node["expr"] !== undefined) {
      (node as IExpressionStore).findReplaceVariable(find, replace);
    }
  });
}
export function setup() {
  doc.pathlist.setExporter((uuid) => {
    try {
      writeTrajectory(uuid);
    } catch (e) {
      tracing.error(e);
    }
  });
  doc.history.clear();
  setupEventListeners()
    .then(() => newProject())
    .then(() => uiState.updateWindowTitle());
  // .then(() => openProjectFile())
}
setup();

// opens the last Choreo file saved in LocalStorage, if it exists
export async function openProjectFile() {
  const lastOpenedFileEventPayload = localStorage.getItem(
    LocalStorageKeys.LAST_OPENED_FILE_LOCATION
  );
  const cliRequestedProject = await Commands.requestedProject();

  if (cliRequestedProject) {
    const fileDirectory: OpenFilePayload = cliRequestedProject;
    const filePath = fileDirectory.dir + path.sep + fileDirectory.name;
    tracing.info(`Attempting to open: ${filePath}`);
    return openProject(fileDirectory).catch((err) => {
      tracing.error(
        `Failed to open cli requested Choreo file '${fileDirectory.name}': ${err}`
      );
      toast.error(
        `Failed to open cli requested Choreo file '${fileDirectory.name}': ${err}`
      );
    });
  } else if (lastOpenedFileEventPayload) {
    const fileDirectory: OpenFilePayload = JSON.parse(
      lastOpenedFileEventPayload
    );
    const filePath = fileDirectory.dir + path.sep + fileDirectory.name;
    tracing.info(`Attempting to open: ${filePath}`);
    return openProject(fileDirectory).catch((err) => {
      tracing.error(
        `Failed to open last Choreo file '${fileDirectory.name}': ${err}`
      );
      toast.error(
        `Failed to open last Choreo file '${fileDirectory.name}': ${err}`
      );
    });
  }
}

export async function setupEventListeners() {
  window.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("copy", (e) => {
    const selection = document.getSelection();
    // Sometimes clicking away from a text input with selection retains that input element as
    // doc.getSelection()'s focusNode, but sets the actual selection range to ''
    if (selection?.focusNode === null || selection?.toString() === "") {
      if (doc.isSidebarWaypointSelected) {
        (doc.selectedSidebarItem as IHolonomicWaypointStore).copyToClipboard(e);
      }
      e.preventDefault();
    }
  });

  window.addEventListener("paste", (e) => {
    const evt = e as ClipboardEvent;
    const content = evt.clipboardData?.getData("text/plain");
    if (content === undefined) {
      return;
    }
    const activePath = doc.pathlist.activePath;
    const pathSnapshot = getSnapshot(activePath);
    try {
      const savedObject = JSON.parse(content);
      if (!Object.hasOwn(savedObject, "dataType")) return;
      if (savedObject.dataType === "choreo/waypoint") {
        let currentSelectedWaypointIdx = -1;
        if (doc.isSidebarWaypointSelected) {
          const idx = activePath.params.findUUIDIndex(
            (doc.selectedSidebarItem as IHolonomicWaypointStore).uuid
          );
          if (idx != -1) {
            currentSelectedWaypointIdx = idx;
          }
        }
        doc.history.startGroup(() => {
          try {
            const newWaypoint = doc.pathlist.activePath.addWaypoint();
            newWaypoint.deserialize(savedObject);
            if (currentSelectedWaypointIdx != -1) {
              activePath.params.reorderWaypoint(
                activePath.params.waypoints.length - 1,
                currentSelectedWaypointIdx + 1
              );
            }
          } finally {
            doc.history.stopGroup();
          }
        });
      }
    } catch (err) {
      tracing.error("Error when pasting:", err);
      applySnapshot(activePath, pathSnapshot);
    }
  });

  // Save files on closing
  tauriWindow
    .getCurrent()
    .listen(TauriEvent.WINDOW_CLOSE_REQUESTED, async () => {
      if (!(await canSave())) {
        if (
          await dialog.ask("Save project?", {
            title: "Choreo",
            type: "warning"
          })
        ) {
          if (!(await saveProjectDialog())) {
            return;
          }
        }
      }
      await tauriWindow.getCurrent().close();
    })
    .then((unlisten) => {
      window.addEventListener("unload", () => {
        unlisten();
      });
    });
  const autoSaveUnlisten = reaction(
    () => doc.history.undoIdx,
    () => {
      if (uiState.hasSaveLocation) {
        saveProject();
      }
    }
  );
  const updateTitleUnlisten = reaction(
    () => uiState.projectName,
    () => {
      uiState.updateWindowTitle();
    }
  );
  window.addEventListener("unload", () => {
    hotkeys.unbind();
    ///openFileUnlisten();
    // fileOpenFromDirUnlisten();
    autoSaveUnlisten();
    updateTitleUnlisten();
  });
  hotkeys.unbind();
  hotkeys("escape", () => {
    doc.setSelectedSidebarItem(undefined);
    uiState.setSelectedNavbarItem(-1);
  });
  hotkeys("ctrl+o,command+o", () => {
    dialog
      .confirm("You may lose unsaved or not generated changes. Continue?", {
        title: "Choreo",
        type: "warning"
      })
      .then((proceed) => {
        if (proceed) {
          Commands.openProjectDialog().then((filepath) =>
            openProject(filepath)
          );
        }
      });
  });
  hotkeys("f5,ctrl+shift+r,ctrl+r", function (event, _handler) {
    event.preventDefault();
  });
  hotkeys("command+g,ctrl+g,g", () => {
    if (!doc.pathlist.activePath.ui.generating) {
      generateWithToastsAndExport(doc.pathlist.activePathUUID);
    }
  });
  hotkeys("command+z,ctrl+z", () => {
    doc.undo();
  });
  hotkeys("command+shift+z,ctrl+shift+z,ctrl+y", () => {
    doc.redo();
  });
  hotkeys("command+n,ctrl+n", { keydown: true }, () => {
    newProject();
  });
  hotkeys("command+=,ctrl+=", () => {
    doc.zoomIn();
  });
  hotkeys("command+-,ctrl+-", () => {
    doc.zoomOut();
  });
  hotkeys("command+0,ctrl+0", () => {
    if (doc.pathlist.activePath.params.waypoints.length == 0) {
      toast.error("No waypoints to zoom to");
    } else {
      doc.zoomToFitWaypoints();
    }
  });
  hotkeys("right,x", () => {
    const waypoints = doc.pathlist.activePath.params.waypoints;
    const selected = waypoints.find((w) => {
      return w.selected;
    });
    let i = waypoints.indexOf(selected ?? waypoints[0]);
    i++;
    if (i >= waypoints.length) {
      i = waypoints.length - 1;
    }
    select(waypoints[i]);
  });
  hotkeys("left,z", () => {
    const waypoints = doc.pathlist.activePath.params.waypoints;
    const selected = waypoints.find((w) => {
      return w.selected;
    });
    let i = waypoints.indexOf(selected ?? waypoints[0]);
    i--;
    if (i <= 0) {
      i = 0;
    }
    select(waypoints[i]);
  });
  // navbar keys
  for (let i = 0; i < 9; i++) {
    hotkeys((i + 1).toString(), () => {
      uiState.setSelectedNavbarItem(i);
    });
  }
  hotkeys("0", () => {
    uiState.setSelectedNavbarItem(9);
  });
  hotkeys("-", () => uiState.setSelectedNavbarItem(10));
  // set current waypoint type
  for (let i = 0; i < 4; i++) {
    hotkeys("shift+" + (i + 1), () => {
      const selected = getSelectedWaypoint();
      selected?.setType(i);
    });
  }
  // nudge selected waypoint
  hotkeys("d,shift+d", () => {
    const selected = getSelectedWaypoint();
    if (selected !== undefined) {
      const delta = hotkeys.shift ? 0.5 : 0.1;
      selected.x.set(selected.x.value + delta);
    }
  });
  hotkeys("a,shift+a", () => {
    const selected = getSelectedWaypoint();
    if (selected !== undefined) {
      const delta = hotkeys.shift ? 0.5 : 0.1;
      selected.x.set(selected.x.value - delta);
    }
  });
  hotkeys("w,shift+w", () => {
    const selected = getSelectedWaypoint();
    if (selected !== undefined) {
      const delta = hotkeys.shift ? 0.5 : 0.1;
      selected.y.set(selected.y.value + delta);
    }
  });
  hotkeys("s,shift+s", () => {
    const selected = getSelectedWaypoint();
    if (selected !== undefined) {
      const delta = hotkeys.shift ? 0.5 : 0.1;
      selected.y.set(selected.y.value - delta);
    }
  });
  hotkeys("q,shift+q", () => {
    const selected = getSelectedWaypoint();
    if (selected !== undefined) {
      const delta = hotkeys.shift ? Math.PI / 4 : Math.PI / 16;
      const newHeading = selected.heading.value + delta;
      selected.heading.set(newHeading);
    }
  });
  hotkeys("e,shift+e", () => {
    const selected = getSelectedWaypoint();
    if (selected !== undefined) {
      const delta = hotkeys.shift ? -Math.PI / 4 : -Math.PI / 16;
      const newHeading = selected.heading.value + delta;
      selected.heading.set(newHeading);
    }
  });
  hotkeys("f", () => {
    const selected = getSelectedWaypoint();
    if (selected) {
      const newWaypoint = doc.pathlist.activePath.addWaypoint();
      newWaypoint.x.set(selected.x.value);
      newWaypoint.y.set(selected.y.value);
      newWaypoint.heading.set(selected.heading.value);
      select(newWaypoint);
    } else {
      const newWaypoint = doc.pathlist.activePath.addWaypoint();
      newWaypoint.x.set(5);
      newWaypoint.y.set(5);
      newWaypoint.heading.set(0);
      select(newWaypoint);
    }
  });
  hotkeys("delete,backspace,clear", () => {
    const selectedWaypoint = getSelectedWaypoint();
    if (selectedWaypoint) {
      doc.pathlist.activePath.params.deleteWaypoint(selectedWaypoint.uuid);
    }
    const selectedConstraint = getSelectedConstraint();
    if (selectedConstraint) {
      doc.pathlist.activePath.params.deleteConstraint(selectedConstraint.uuid);
    }
  });
}

export async function openProject(projectPath: OpenFilePayload) {
  try {
    const dir = projectPath.dir;
    const name = projectPath.name.split(".")[0];
    let project: Project | undefined = undefined;
    const trajectories: Trajectory[] = [];
    await Commands.cancelAll();
    await Commands.setDeployRoot(dir);
    await Promise.allSettled([
      Commands.readProject(name)
        .then((p) => (project = p))
        .catch(tracing.error),
      Commands.readAllTrajectory()
        .then((paths) =>
          paths.forEach((path) => {
            trajectories.push(path);
          })
        )
        .catch(tracing.error)
    ]);

    if (project === undefined) {
      throw "Internal error. Check console logs.";
    }
    doc.deserializeChor(project);
    doc.pathlist.paths.clear();
    trajectories.forEach((trajectory) => {
      doc.pathlist.addPath(trajectory.name, true, trajectory);
    });
    uiState.setSaveFileDir(dir);
    uiState.setProjectName(name);
    localStorage.setItem(
      LocalStorageKeys.LAST_OPENED_FILE_LOCATION,
      JSON.stringify({ dir, name })
    );
  } catch (e) {
    await Commands.setDeployRoot("");
    throw e;
  }
}

export async function generateAndExport(uuid: string) {
  tracing.debug("generateAndExport", uuid);
  await doc.generatePath(uuid);
  await writeTrajectory(uuid);
}

export async function generateWithToastsAndExport(uuid: string) {
  tracing.debug("generateWithToastsAndExport", uuid);
  const pathName = doc.pathlist.paths.get(uuid)?.name;
  doc.generatePathWithToasts(uuid).then(() =>
    toast.promise(writeTrajectory(uuid), {
      success: `Saved "${pathName}" to ${uiState.projectDir}.`,
      error: {
        render(toastProps) {
          tracing.error(toastProps.data);
          return `Couldn't export trajectory: ${toastProps.data as string[]}`;
        }
      }
    })
  );
}

function getSelectedWaypoint() {
  const waypoints = doc.pathlist.activePath.params.waypoints;
  return waypoints.find((w) => {
    return w.selected;
  });
}
function getSelectedConstraint() {
  const constraints = doc.pathlist.activePath.params.constraints;
  return constraints.find((c) => {
    return c.selected;
  });
}

export async function newProject() {
  applySnapshot(uiState, {
    settingsTab: 0,
    layers: ViewLayerDefaults
  });
  await Commands.setDeployRoot("");
  const newChor = await Commands.defaultProject();
  doc.deserializeChor(newChor);
  uiState.loadPathGradientFromLocalStorage();
  doc.pathlist.addPath("New Path");
  doc.history.clear();
}
export function select(item: SelectableItemTypes) {
  doc.setSelectedSidebarItem(item);
}

export async function canSave(): Promise<boolean> {
  return (await Commands.getDeployRoot()).length > 0;
}

export async function renamePath(uuid: string, newName: string) {
  if (uiState.hasSaveLocation) {
    const trajectory = doc.pathlist.paths.get(uuid);
    if (trajectory) {
      tracing.debug("renamePath", uuid, "to", newName);
      await Commands.renameTrajectory(trajectory.serialize, newName)
        .finally(() => doc.pathlist.paths.get(uuid)?.setName(newName))
        .catch(tracing.error);
    }
  } else {
    doc.pathlist.paths.get(uuid)?.setName(newName);
  }
}

export async function deletePath(uuid: string) {
  if (uiState.hasSaveLocation) {
    const trajectory = doc.pathlist.paths.get(uuid);
    if (trajectory) {
      await Commands.deleteTrajectory(trajectory.serialize)
        .finally(() => doc.pathlist.deletePath(uuid))
        .catch(tracing.error);
    }
  } else {
    doc.pathlist.deletePath(uuid);
  }
}

export async function writeTrajectory(uuid: string) {
  if (await canSave()) {
    const trajectory = doc.pathlist.paths.get(uuid);
    if (trajectory === undefined) {
      throw `Tried to export trajectory with unknown uuid ${uuid}`;
    }
    await Commands.writeTrajectory(trajectory.serialize);
  } else {
    tracing.warn("Can't save trajectory, skipping");
  }
}

export async function writeActiveTrajectory() {
  return await writeTrajectory(doc.pathlist.activePathUUID);
}

export async function writeAllTrajectories() {
  if (uiState.hasSaveLocation) {
    const promises = doc.pathlist.pathUUIDs.map((uuid) =>
      writeTrajectory(uuid)
    );
    const pathNames = doc.pathlist.pathNames;
    await Promise.allSettled(promises).then((results) => {
      results.map((result, i) => {
        if (result.status === "rejected") {
          tracing.error(pathNames[i], ":", result.reason);
        }
      });
    });
  }
}

export async function saveProject() {
  if (await canSave()) {
    await Commands.writeProject(doc.serializeChor());
  } else {
    tracing.warn("Can't save project, skipping");
  }
}

export async function saveProjectDialog() {
  const filePath = await dialog.save({
    title: "Save Document",
    filters: [
      {
        name: "Choreo Document",
        extensions: ["chor"]
      }
    ]
  });
  if (filePath === null) {
    return false;
  }
  const dir = await path.dirname(filePath);
  const name = (await path.basename(filePath)).split(".")[0];

  tracing.info("Saving to", dir, name);

  localStorage.setItem(
    LocalStorageKeys.LAST_OPENED_FILE_LOCATION,
    JSON.stringify({ dir, name })
  );

  doc.setName(name);

  await Commands.setDeployRoot(dir).catch(tracing.error);

  uiState.setSaveFileDir(dir);
  uiState.setProjectName(name);

  await saveProject();

  //save all trajectories
  await writeAllTrajectories();

  toast.success(`Saved ${name}. Future changes will now be auto-saved.`);
  return true;
}

export async function openDiagnosticZipWithInfo() {
  const project = doc.serializeChor();
  const trajectories: Trajectory[] = [];
  doc.pathlist.paths.forEach((path) => {
    trajectories.push(path.serialize);
  });
  await Commands.openDiagnosticZip(project, trajectories);
}
