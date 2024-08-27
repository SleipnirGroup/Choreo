import { dialog, invoke, path, window as tauriWindow } from "@tauri-apps/api";
import { TauriEvent, listen } from "@tauri-apps/api/event";
import { v4 as uuidv4 } from "uuid";
import { DocumentStore, SelectableItemTypes } from "./DocumentModel";

import hotkeys from "hotkeys-js";
import { reaction } from "mobx";
import {
  Instance,
  applySnapshot,
  castToReferenceSnapshot,
  getSnapshot
} from "mobx-state-tree";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import LocalStorageKeys from "../util/LocalStorageKeys";
import { ObjectTyped } from "../util/ObjectTyped";
import { safeGetIdentifier } from "../util/mobxutils";
import {
  Command,
  EventMarker,
  Project,
  Traj,
  type Expr,
  type RobotConfig,
  type Waypoint
} from "./2025/DocumentTypes";
import {
  CircularObstacleStore,
  ICircularObstacleStore
} from "./CircularObstacleStore";
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
import { IVariables, Units, Variables, math } from "./ExpressionStore";
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

type OpenFileEventPayload = {
  name: string;
  dir: string;
};

export const uiState = UIStateStore.create({
  settingsTab: 0,

  layers: ViewLayerDefaults
});
type ConstraintDataConstructor<K extends ConstraintKey> = (
  data: Partial<DataMap[K]["props"]>
) => Instance<IConstraintDataStore<K>>;

type ConstraintDataConstructors = {
  [key in ConstraintKey]: ConstraintDataConstructor<key>;
};
export type EnvConstructors = {
  RobotConfigStore: (config: RobotConfig<Expr>) => IRobotConfigStore;
  WaypointStore: (config: Waypoint<Expr>) => IHolonomicWaypointStore;
  ObstacleStore: (
    x: number,
    y: number,
    radius: number
  ) => ICircularObstacleStore;
  CommandStore: (command: Command<Expr>) => ICommandStore;
  EventMarkerStore: (marker: EventMarker<Expr>) => IEventMarkerStore;
  ConstraintData: ConstraintDataConstructors;
  ConstraintStore: <K extends ConstraintKey>(
    type: K,
    data: Partial<DataMap[K]["props"]>,
    from: IWaypointScope,
    to?: IWaypointScope
  ) => IConstraintStore;
};
function getConstructors(vars: () => IVariables): EnvConstructors {
  function createCommandStore(command: Command<Expr>): ICommandStore {
    return CommandStore.create({
      type: command.type,
      name: command.data?.name ?? "",
      commands: (command.data?.commands ?? []).map((c) =>
        createCommandStore(c)
      ),
      time: vars().createExpression(command.data?.time ?? 0, Units.Second),
      uuid: uuidv4()
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
        mass: vars().createExpression(config.mass, Units.Kg),
        inertia: vars().createExpression(config.inertia, Units.KgM2),
        tmax: vars().createExpression(
          config.tmax,
          math.multiply(Units.Newton, Units.Meter)
        ),
        vmax: vars().createExpression(config.vmax, Units.RadianPerSecond),
        gearing: vars().createExpression(config.gearing),
        radius: vars().createExpression(config.radius, Units.Meter),
        bumper: {
          front: vars().createExpression(config.bumper.front, Units.Meter),
          left: vars().createExpression(config.bumper.left, Units.Meter),
          right: vars().createExpression(config.bumper.right, Units.Meter),
          back: vars().createExpression(config.bumper.back, Units.Meter)
        },
        modules: [0, 1, 2, 3].map((i) => {
          return {
            x: vars().createExpression(config.modules[i].x, Units.Meter),
            y: vars().createExpression(config.modules[i].y, Units.Meter)
          };
        }),
        identifier: uuidv4()
      });
    },
    WaypointStore: (waypoint: Waypoint<Expr>) => {
      return WaypointStore.create({
        ...waypoint,
        x: vars().createExpression(waypoint.x, Units.Meter),
        y: vars().createExpression(waypoint.y, Units.Meter),
        heading: vars().createExpression(waypoint.heading, Units.Radian),
        uuid: uuidv4()
      });
    },
    ObstacleStore: (
      x: number,
      y: number,
      radius: number
    ): ICircularObstacleStore => {
      return CircularObstacleStore.create({
        x: vars().createExpression(x, Units.Meter),
        y: vars().createExpression(y, Units.Meter),
        radius: vars().createExpression(radius, Units.Meter),
        uuid: uuidv4()
      });
    },
    CommandStore: createCommandStore,
    EventMarkerStore: (marker: EventMarker<Expr>): IEventMarkerStore => {
      return EventMarkerStore.create({
        name: marker.name,
        target: marker.target,
        trajTargetIndex: marker.trajTargetIndex,
        offset: vars().createExpression(marker.offset, Units.Second),
        command: createCommandStore(marker.command),
        uuid: uuidv4()
      });
    },
    ConstraintData: constraintDataConstructors,
    ConstraintStore: <K extends ConstraintKey>(
      type: K,
      data: Partial<DataMap[K]["props"]>,
      from: IWaypointScope,
      to?: IWaypointScope
    ) => {
      const store = ConstraintStore.create({
        from,
        to,
        uuid: uuidv4(),
        data: constraintDataConstructors[type](data)
      });
      (store.data as Instance<IConstraintDataStore<K>>).deserPartial(data);
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
  create: getConstructors(() => doc.variables)
};
export type Env = typeof env;
export const doc = DocumentStore.create(
  {
    robotConfig: getConstructors(() => variables).RobotConfigStore(
      EXPR_DEFAULTS
    ),
    pathlist: {},
    splitTrajectoriesAtStopPoints: false,
    usesObstacles: false,
    variables: castToReferenceSnapshot(variables),
    selectedSidebarItem: undefined
  },
  env
);
function withoutUndo(callback: any) {
  doc.history.withoutUndo(callback);
}
function startGroup(callback: any) {
  doc.history.startGroup(callback);
}
function stopGroup() {
  doc.history.stopGroup();
}
export function setup() {
  doc.pathlist.setExporter((uuid) => {
    try {
      writeTrajectory(() => getTrajFilePath(uuid), uuid);
    } catch (e) {
      console.error(e);
    }
  });
  doc.history.clear();
  setupEventListeners()
    .then(() => newFile())
    .then(() => uiState.updateWindowTitle())
    .then(() => openLastFile());
}
setup();

// opens the last Choreo file saved in LocalStorage, if it exists
export async function openLastFile() {
  const lastOpenedFileEventPayload = localStorage.getItem(
    LocalStorageKeys.LAST_OPENED_FILE_LOCATION
  );
  if (lastOpenedFileEventPayload) {
    const fileDirectory: OpenFileEventPayload = JSON.parse(
      lastOpenedFileEventPayload
    );
    const filePath = fileDirectory.dir + path.sep + fileDirectory.name;
    console.log(`Attempting to open: ${filePath}`);
    return openProject([fileDirectory.dir, fileDirectory.name]).catch((err) => {
      console.error(
        `Failed to open last Choreo file '${fileDirectory.name}': ${err}`
      );
      toast.error(
        `Failed to open last Choreo file '${fileDirectory.name}': ${err}`
      );
    });
    // invoke("file_event_payload_from_dir", {
    //   dir: fileDirectory.dir,
    //   name: fileDirectory.name,
    //   path: filePath
    // }).catch((err) => {
    //   console.error(
    //     `Failed to open last Choreo file '${fileDirectory.name}': ${err}`
    //   );
    //   toast.error(
    //     `Failed to open last Choreo file '${fileDirectory.name}': ${err}`
    //   );
    // });
  }
}

// export async function handleOpenFileEvent(event: Event<unknown>) {
//   const payload = event.payload as OpenFileEventPayload;
//   if (payload.dir === undefined || payload.name === undefined) {
//     throw "Non-UTF-8 characters in file path";
//   } else if (payload.contents === undefined) {
//     throw "Unable to read file";
//   } else {
//     const oldDocument = getSnapshot(doc);
//     const oldUIState = getSnapshot(uiState);
//     const saveName = payload.name;
//     const saveDir = payload.dir;
//     const adjacent_gradle = payload.adjacent_gradle;
//     uiState.setSaveFileName(undefined);
//     uiState.setSaveFileDir(undefined);
//     uiState.setIsGradleProject(undefined);
//     await openFromContents(payload.contents)
//       .catch((err) => {
//         applySnapshot(doc, oldDocument);
//         applySnapshot(uiState, oldUIState);
//         throw `Internal parsing error: ${err}`;
//       })
//       .then(() => {
//         uiState.setSaveFileName(saveName);
//         uiState.setSaveFileDir(saveDir);
//         uiState.setIsGradleProject(adjacent_gradle);

//       });
//   }
// }

export async function setupEventListeners() {
  // const openFileUnlisten = await listen("open-file", async (event) =>
  //   handleOpenFileEvent(event).catch((err) =>
  //     toast.error("Opening file error: " + err)
  //   )
  // );

  const fileOpenFromDirUnlisten = await listen(
    "file_event_payload_from_dir",
    async (event) => {
      console.log("Received file event from dir: ");
      console.log(event.payload);
      handleOpenFileEvent(event)
        .then(() => {
          toast.success(
            `Opened last Choreo file '${(event.payload as OpenFileEventPayload).name}'`
          );
        })
        .catch((err) => toast.error(`Failed to open last Choreo file: ${err}`));
    }
  );

  window.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("copy", (e) => {
    const selection = document.getSelection();
    // Sometimes clicking away from a text input with selection retains that input element as
    // doc.getSelection()'s focusNode, but sets the actual selection range to ''
    if (selection?.focusNode === null || selection?.toString() === "") {
      if (doc.isSidebarWaypointSelected) {
        doc.selectedSidebarItem.copyToClipboard(e);
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
          const idx = activePath.path.findUUIDIndex(
            doc.selectedSidebarItem.uuid
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
              activePath.path.reorderWaypoint(
                activePath.path.waypoints.length - 1,
                currentSelectedWaypointIdx + 1
              );
            }
          } finally {
            doc.history.stopGroup();
          }
        });
      }
    } catch (err) {
      console.error("Error when pasting:", err);
      applySnapshot(activePath, pathSnapshot);
    }
  });

  // Save files on closing
  tauriWindow
    .getCurrent()
    .listen(TauriEvent.WINDOW_CLOSE_REQUESTED, async () => {
      if (!uiState.hasSaveLocation) {
        if (
          await dialog.ask("Save project?", {
            title: "Choreo",
            type: "warning"
          })
        ) {
          if (!(await saveFileDialog())) {
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
        console.log("autosave");
        saveFile();
      }
    }
  );
  const updateTitleUnlisten = reaction(
    () => uiState.saveFileName,
    () => {
      uiState.updateWindowTitle();
    }
  );
  window.addEventListener("unload", () => {
    hotkeys.unbind();
    ///openFileUnlisten();
    fileOpenFromDirUnlisten();
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
          Commands.openFileDialog().then((filepath) => openProject(filepath));
        }
      });
  });
  hotkeys("f5,ctrl+shift+r,ctrl+r", function (event, handler) {
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
    newFile();
  });
  hotkeys("command+=,ctrl+=", () => {
    doc.zoomIn();
  });
  hotkeys("command+-,ctrl+-", () => {
    doc.zoomOut();
  });
  hotkeys("command+0,ctrl+0", () => {
    if (doc.pathlist.activePath.path.waypoints.length == 0) {
      toast.error("No waypoints to zoom to");
    } else {
      doc.zoomToFitWaypoints();
    }
  });
  hotkeys("right,x", () => {
    const waypoints = doc.pathlist.activePath.path.waypoints;
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
    const waypoints = doc.pathlist.activePath.path.waypoints;
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
      doc.pathlist.activePath.path.deleteWaypoint(selectedWaypoint.uuid);
    }
    const selectedConstraint = getSelectedConstraint();
    if (selectedConstraint) {
      doc.pathlist.activePath.path.deleteConstraint(selectedConstraint.uuid);
    }
    const selectedObstacle = getSelectedObstacle();
    if (selectedObstacle) {
      doc.pathlist.activePath.path.deleteObstacle(selectedObstacle.uuid);
    }
  });
}

export async function openProject(chorFile: [dir: string, name: string]) {
  const [dir, name] = chorFile;
  let chor: Project | undefined = undefined;
  const trajs: Traj[] = [];
  await Promise.allSettled([
    Commands.openChor(dir, name)
      .then((c) => (chor = c))
      .catch(console.error),
    Commands.findAllTraj(dir)
      .then((paths) =>
        Promise.allSettled(
          paths.map((p) => Commands.openTraj(dir, p).then((t) => trajs.push(t)))
        )
      )
      .catch(console.error)
  ]);
  if (chor === undefined) {
    throw "Internal error. Check console logs.";
  }
  doc.deserializeChor(chor);
  trajs.forEach((traj) => {
    doc.pathlist.addPath(traj.name, true, traj);
  });
  uiState.setSaveFileDir(dir);
  uiState.setSaveFileName(name);
  await Commands.setChorPath(dir, name);
  localStorage.setItem(
    LocalStorageKeys.LAST_OPENED_FILE_LOCATION,
    JSON.stringify({ dir, name })
  );
}

export async function generateAndExport(uuid: string) {
  await doc.generatePath(uuid);
  await exportTrajectory(uuid);
}

export async function generateWithToastsAndExport(uuid: string) {
  const pathName = doc.pathlist.paths.get(uuid)?.name;
  doc.generatePathWithToasts(uuid).then(() =>
    toast.promise(
      writeTrajectory(() => getTrajFilePath(uuid), uuid),
      {
        success: `Saved "${pathName}" to ${uiState.chorRelativeTrajDir}.`,
        error: {
          render(toastProps) {
            console.error(toastProps.data);
            return `Couldn't export trajectory: ${toastProps.data as string[]}`;
          }
        }
      }
    )
  );
}

function getSelectedWaypoint() {
  const waypoints = doc.pathlist.activePath.path.waypoints;
  return waypoints.find((w) => {
    return w.selected;
  });
}
function getSelectedConstraint() {
  const constraints = doc.pathlist.activePath.path.constraints;
  return constraints.find((c) => {
    return c.selected;
  });
}

function getSelectedObstacle() {
  const obstacles = doc.pathlist.activePath.path.obstacles;
  return obstacles.find((o) => {
    return o.selected;
  });
}
export async function newFile() {
  applySnapshot(uiState, {
    settingsTab: 0,
    layers: ViewLayerDefaults
  });
  const newChor = await Commands.newFile();
  doc.deserializeChor(newChor);
  //let newVariables

  //TODO change this for opening from new content.
  // applySnapshot(doc,{
  //     robotConfig: { identifier: uuidv4() },
  //     pathlist: {},
  //     splitTrajectoriesAtStopPoints: false,
  //     usesObstacles: false,
  //     variables: {},
  //     selectedSidebarItem: undefined,
  //   });
  uiState.loadPathGradientFromLocalStorage();
  doc.pathlist.addPath("NewPath");
  doc.history.clear();
  doc.variables.addPose("pose");
  doc.variables.add("name", "pose.x()", Units.Meter);
}
export function select(item: SelectableItemTypes) {
  doc.setSelectedSidebarItem(item);
}

export async function renamePath(uuid: string, newName: string) {
  if (uiState.hasSaveLocation) {
    const oldPath = await getTrajFilePath(uuid);
    doc.pathlist.paths.get(uuid)?.setName(newName);
    const newPath = await getTrajFilePath(uuid);
    if (oldPath !== null) {
      Promise.all([Commands.deleteFile(oldPath[0], oldPath[1])])
        .then(() => writeTrajectory(() => newPath, uuid))
        .catch((e) => {
          console.error(e);
        });
    }
  } else {
    doc.pathlist.paths.get(uuid)?.setName(newName);
  }
}

export async function deletePath(uuid: string) {
  const newPath = await getTrajFilePath(uuid).catch(() => null);
  doc.pathlist.deletePath(uuid);
  if (newPath !== null && uiState.hasSaveLocation) {
    await Commands.deleteFile(newPath[0], newPath[1]);
  }
}

/**
 * Save the specified trajectory to the file path supplied by the given async function
 * @param filePath An (optionally async) function returning a 2-string array of [dir, name], or null
 * @param uuid the UUID of the path with the trajectory to export
 */
export async function writeTrajectory(
  filePath: () => Promise<[string, string] | null> | [string, string] | null,
  uuid: string
) {
  // Avoid conflicts with tauri path namespace
  const chorPath = doc.pathlist.paths.get(uuid);
  if (chorPath === undefined) {
    throw `Tried to export trajectory with unknown uuid ${uuid}`;
  }
  const trajectory = chorPath.serialize();
  const file = await filePath();
  if (file) {
    await Commands.writeTraj(file[0] + path.sep + file[1], trajectory);
  }
}

export async function getTrajFilePath(uuid: string): Promise<[string, string]> {
  const choreoPath = doc.pathlist.paths.get(uuid);
  if (choreoPath === undefined) {
    throw `Trajectory has unknown uuid ${uuid}`;
  }
  const { hasSaveLocation } = uiState;
  if (!hasSaveLocation) {
    throw "Project has not been saved yet";
  }
  const dir = uiState.saveFileDir; //+ path.sep + uiState.chorRelativeTrajDir;
  return [dir, `${choreoPath.name}.traj`];
}

export async function exportTrajectory(uuid: string) {
  return await writeTrajectory(() => {
    const { hasSaveLocation, chorRelativeTrajDir } = uiState;
    if (!hasSaveLocation || chorRelativeTrajDir === undefined) {
      return (async () => {
        const file = await dialog.save({
          title: "Export Trajectory",
          filters: [
            {
              name: "Trajopt Trajectory",
              extensions: ["traj"]
            }
          ]
        });
        if (file == null) {
          throw "No file selected or user cancelled";
        }
        return [await path.dirname(file), await path.basename(file)];
      })();
    }
    return getTrajFilePath(uuid).then(async (filepath) => {
      const file = await dialog.save({
        title: "Export Trajectory",
        defaultPath: filepath.join(path.sep),
        filters: [
          {
            name: "Trajopt Trajectory",
            extensions: ["traj"]
          }
        ]
      });
      if (file == null) {
        throw "No file selected or user cancelled";
      }
      return [await path.dirname(file), await path.basename(file)];
    });
  }, uuid);
}

export async function exportActiveTrajectory() {
  return await exportTrajectory(doc.pathlist.activePathUUID);
}

export async function saveFile() {
  const dir = uiState.saveFileDir;
  const name = uiState.saveFileName;
  // we could use hasSaveLocation but TS wouldn't know
  // that dir and name aren't undefined below
  if (dir === undefined || name === undefined) {
    return await saveFileDialog();
  } else {
    await saveFileAs(dir, name);
  }
  return true;
}

export async function saveFileDialog() {
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
  let name = await path.basename(filePath);
  if (!name.endsWith(".chor")) {
    name = name + ".chor";
  }
  await saveFileAs(dir, name);
  uiState.setSaveFileDir(dir);
  uiState.setSaveFileName(name);

  toast.success(`Saved ${name}. Future changes will now be auto-saved.`);
  return true;
}

/**
 * Save the doc as `dir/name`.
 * @param dir The absolute path to the directory that will contain the saved file
 * @param name The saved file, name only, including the extension ".chor"
 * @returns Whether the dir contains a file named "build.gradle", or undefined
 * if something failed
 */
async function saveFileAs(dir: string, name: string): Promise<void> {
  if (dir !== uiState.saveFileDir || name !== uiState.saveFileName) {
    await Commands.setChorPath(dir, name);
    uiState.setSaveFileDir(dir);
    uiState.setSaveFileName(name);
  }
  return Commands.writeChor(doc.serializeChor());
}

/**
 * Export all trajectories to the deploy directory, as determined by uiState.isGradleProject
 */
export async function exportAllTrajectories() {
  if (uiState.hasSaveLocation) {
    const promises = doc.pathlist.pathUUIDs.map((uuid) =>
      writeTrajectory(() => getTrajFilePath(uuid), uuid)
    );
    const pathNames = doc.pathlist.pathNames;
    Promise.allSettled(promises).then((results) => {
      const errors: string[] = [];

      results.map((result, i) => {
        if (result.status === "rejected") {
          console.error(pathNames[i], ":", result.reason);
          errors.push(`Couldn't save "${pathNames[i]}": ${result.reason}`);
        }
      });

      if (errors.length != 0) {
        throw errors;
      }
    });
  }
}

export async function clearAllTrajectories() {
  if (uiState.hasSaveLocation && uiState.chorRelativeTrajDir !== undefined) {
    invoke("delete_dir", {
      dir: uiState.saveFileDir + path.sep + uiState.chorRelativeTrajDir
    });
  }
}
