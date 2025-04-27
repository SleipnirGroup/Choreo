import { Event, UnlistenFn, listen } from "@tauri-apps/api/event";
import { Instance, getParent, types } from "mobx-state-tree";
import { UndoManager } from "mst-middlewares";
import { toast } from "react-toastify";
import {
  DifferentialSample,
  ProgressUpdate,
  Project,
  PROJECT_SCHEMA_VERSION,
  SampleType,
  SwerveSample,
  Trajectory
} from "./2025/DocumentTypes";
import { ConstraintStore, IConstraintStore } from "./ConstraintStore";
import { EventMarkerStore, IEventMarkerStore } from "./EventMarkerStore";
import { Variables } from "./ExpressionStore";
import {
  HolonomicWaypointStore,
  IHolonomicWaypointStore
} from "./HolonomicWaypointStore";
import { PathListStore } from "./PathListStore";
import { RobotConfigStore } from "./RobotConfigStore";
import { Commands } from "./tauriCommands";
import { tracing } from "./tauriTracing";

export type SelectableItemTypes =
  | ((IHolonomicWaypointStore | IConstraintStore | IEventMarkerStore) & {
      uuid: string;
    })
  | undefined;
export const SelectableItem = types.union(
  {
    dispatcher: (snapshot): any => {
      if (Object.hasOwn(snapshot, "mass")) return RobotConfigStore;
      if (Object.hasOwn(snapshot, "target")) return EventMarkerStore;
      if (Object.hasOwn(snapshot, "from")) return ConstraintStore;
      return HolonomicWaypointStore;
    }
  },
  HolonomicWaypointStore,
  EventMarkerStore,
  ConstraintStore
);
function itemType(
  item: SelectableItemTypes
): "marker" | "constraint" | "waypoint" | undefined {
  if (item === undefined) {
    return undefined;
  }
  if (Object.hasOwn(item, "name")) {
    return "marker";
  }
  if (Object.hasOwn(item, "from")) {
    return "constraint";
  }
  if (Object.hasOwn(item, "fixTranslation")) {
    return "waypoint";
  }
  return undefined;
}
export const ISampleType = types.enumeration<SampleType>([
  "Swerve",
  "Differential"
]);

// When adding new fields, consult
// https://choreo.autos/contributing/schema-upgrade/
// to see all the places that change with every schema upgrade.
export const DocumentStore = types
  .model("DocumentStore", {
    name: types.string,
    type: ISampleType,
    pathlist: PathListStore,
    robotConfig: RobotConfigStore,
    variables: Variables,
    selectedSidebarItem: types.maybe(types.safeReference(SelectableItem)),
    hoveredSidebarItem: types.maybe(types.safeReference(SelectableItem))
  })
  .views((self) => ({
    selected(item: SelectableItemTypes) {
      return self.selectedSidebarItem?.uuid === item?.uuid;
    },
    hovered(item: SelectableItemTypes) {
      return self.hoveredSidebarItem?.uuid === item?.uuid;
    },
    serializeChor(): Project {
      return {
        name: self.name,
        version: PROJECT_SCHEMA_VERSION,
        type: self.type,
        variables: self.variables.serialize,
        config: self.robotConfig.serialize
      };
    },
    get isSidebarMarkerSelected() {
      return itemType(self.selectedSidebarItem) === "marker";
    },
    get isSidebarConstraintSelected() {
      return itemType(self.selectedSidebarItem) === "constraint";
    },
    get isSidebarWaypointSelected() {
      return itemType(self.selectedSidebarItem) === "waypoint";
    },
    get isSidebarMarkerHovered() {
      return itemType(self.hoveredSidebarItem) === "marker";
    },
    get isSidebarConstraintHovered() {
      return itemType(self.hoveredSidebarItem) === "constraint";
    },
    get isSidebarWaypointHovered() {
      return itemType(self.hoveredSidebarItem) === "waypoint";
    },
    get hoveredWaypointIndex() {
      if (this.isSidebarWaypointHovered) {
        const pt = self.hoveredSidebarItem as IHolonomicWaypointStore;
        return getParent<IHolonomicWaypointStore[]>(pt).findIndex(
          (p) => p.uuid == pt.uuid
        );
      } else {
        return undefined;
      }
    }
  }))
  .volatile((self) => ({
    history: UndoManager.create({}, { targetStore: self })
  }))
  .actions((self) => ({
    deserializeChor(ser: Project) {
      self.name = ser.name;
      self.variables.deserialize(ser.variables);
      self.robotConfig.deserialize(ser.config);
      self.type = ser.type;
    },
    setName(name: string) {
      self.name = name;
    },
    setType(type: SampleType) {
      self.type = type;
    },
    setSelectedSidebarItem(item: SelectableItemTypes) {
      self.history.withoutUndo(() => {
        self.selectedSidebarItem = item;
      });
    },
    setHoveredSidebarItem(item: SelectableItemTypes | undefined) {
      self.history.withoutUndo(() => {
        self.hoveredSidebarItem = item;
      });
    },
    afterCreate() {
      self.history = UndoManager.create({}, { targetStore: self });
    },
    undo() {
      if (self.history.canUndo) {
        self.history.undo();
      }
    },
    redo() {
      if (self.history.canRedo) {
        self.history.redo();
      }
    },
    async generateAllOutdated() {
      const uuidsToGenerate: string[] = [];
      self.pathlist.paths.forEach((pathStore) => {
        if (!pathStore.ui.upToDate) {
          uuidsToGenerate.push(pathStore.uuid);
        }
      });
      await Promise.allSettled(uuidsToGenerate.map(this.generatePath));
    },

    async generatePath(uuid: string) {
      const pathStore = self.pathlist.paths.get(uuid);
      if (pathStore === undefined) {
        throw "Path store is undefined";
      }
      const points = pathStore.params.waypoints;
      if (points.length < 2) {
        return;
      }

      console.log(pathStore.serialize);
      const config = self.robotConfig.serialize;
      pathStore.params.constraints
        .filter((constraint) => constraint.enabled)
        .forEach((constraint) => {
          if (constraint.issues(points).length > 0) {
            throw constraint.issues(points).join(", ");
          }
        });

      pathStore.markers.forEach((m) => {
        m.from.setTrajectoryTargetIndex(m.from.getTargetIndex());
      });
      pathStore.ui.setGenerating(true);
      const handle = pathStore.uuid
        .split("")
        .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
      let unlisten: UnlistenFn = () => {};
      pathStore.ui.setIterationNumber(0);
      await Commands.guessIntervals(config, pathStore.serialize)
        .catch((e) => {
          tracing.error("guessIntervals:", e);
          throw e;
        })
        .then((counts) => {
          tracing.debug(counts);
          counts.forEach((count, i) => {
            const waypoint = pathStore.params.waypoints[i];
            if (waypoint.overrideIntervals && count !== waypoint.intervals) {
              console.assert(
                false,
                "Control interval guessing did not ignore override intervals! %o",
                {
                  path: pathStore.name,
                  waypoint: i,
                  override: waypoint.intervals,
                  calculated: count
                }
              );
            } else {
              waypoint.setIntervals(count);
            }
          });
        })
        .then(() => {
          tracing.debug("generatePathPre");
          return listen(`solver-status-${handle}`, async (rawEvent) => {
            const event: Event<ProgressUpdate> =
              rawEvent as Event<ProgressUpdate>;
            if (
              event.payload!.type === "swerveTrajectory" ||
              event.payload!.type === "differentialTrajectory"
            ) {
              const samples = event.payload.update as
                | SwerveSample[]
                | DifferentialSample[];
              pathStore.ui.setInProgressTrajectory(samples);
              pathStore.ui.setIterationNumber(
                pathStore.ui.generationIterationNumber + 1
              );
            }
          });
        })
        .then((unlistener) => {
          unlisten = unlistener;
          return Commands.generate(
            self.serializeChor(),
            pathStore.serialize,
            handle
          );
        })
        .finally(() => {
          unlisten();
        })
        .then(
          (rust_trajectory) => {
            const result: Trajectory = rust_trajectory as Trajectory;
            console.log(result);
            if (result.trajectory.samples.length == 0) throw "No trajectory";
            pathStore.processGenerationResult(result);
          },
          (e) => {
            tracing.error("generatePathPost:", e);
            throw e;
          }
        )
        .finally(() => {
          // none of the below should trigger autosave
          pathStore.ui.setGenerating(false);
        });
    }
  }))
  .actions((self) => {
    return {
      generatePathWithToasts(activePathUUID: string) {
        tracing.debug("generatePathWithToasts", activePathUUID);
        const path = self.pathlist.paths.get(activePathUUID)!;
        if (path.ui.generating) {
          return Promise.resolve();
        }
        toast.dismiss();

        const pathName = path.name;
        if (pathName === undefined) {
          toast.error("Tried to generate unknown path.");
        }
        return toast.promise(self.generatePath(activePathUUID), {
          success: {
            render({ data, toastProps }) {
              return `Generated "${pathName}"`;
            }
          },

          error: {
            render({ data, toastProps }) {
              tracing.error("generatePathWithToasts:", data);
              return `Can't generate "${pathName}": ` + (data as string);
            }
          }
        });
      },
      zoomToFitWaypoints() {
        const waypoints = self.pathlist.activePath.params.waypoints;
        if (waypoints.length <= 0) {
          return;
        }

        let xMin = Infinity;
        let xMax = -Infinity;
        let yMin = Infinity;
        let yMax = -Infinity;

        for (const waypoint of waypoints) {
          xMin = Math.min(xMin, waypoint.x.value);
          xMax = Math.max(xMax, waypoint.x.value);
          yMin = Math.min(yMin, waypoint.y.value);
          yMax = Math.max(yMax, waypoint.y.value);
        }

        const x = (xMin + xMax) / 2;
        const y = (yMin + yMax) / 2;
        let k = 10 / (xMax - xMin) + 0.01;

        // x-scaling desmos graph: https://www.desmos.com/calculator/5ie360vse3

        if (k > 1.7) {
          k = 1.7;
        }

        this.callCenter(x, y, k);
      },
      zoomIn() {
        window.dispatchEvent(new CustomEvent("zoomIn"));
      },
      zoomOut() {
        window.dispatchEvent(new CustomEvent("zoomOut"));
      },

      // x, y, k are the center coordinates (x, y) and scale factor (k)
      callCenter(x: number, y: number, k: number) {
        window.dispatchEvent(
          new CustomEvent("center", { detail: { x, y, k } })
        );
      }
    };
  });
export type IDocumentStore = Instance<typeof DocumentStore>;
export default DocumentStore;
