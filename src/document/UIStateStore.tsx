import {
  Circle,
  CircleOutlined,
  DoNotDisturb,
  Grid4x4,
  Room,
  Route,
  ScatterPlot,
  SquareOutlined,
  CropFree
} from "@mui/icons-material";
import { path, window as tauriWindow } from "@tauri-apps/api";
import { getVersion } from "@tauri-apps/api/app";
import { Instance, types } from "mobx-state-tree";
import { ReactElement } from "react";
import InitialGuessPoint from "../assets/InitialGuessPoint";
import Waypoint from "../assets/Waypoint";
import {
  ConstraintDefinition,
  constraints,
  ConstraintStore,
  ConstraintStores,
  IConstraintStore
} from "./ConstraintStore";
import {
  HolonomicWaypointStore,
  IHolonomicWaypointStore
} from "./HolonomicWaypointStore";
import { IRobotConfigStore, RobotConfigStore } from "./RobotConfigStore";
import {
  CircularObstacleStore,
  ICircularObstacleStore
} from "./CircularObstacleStore";
import { EventMarkerStore, IEventMarkerStore } from "./EventMarkerStore";
import {
  PathGradient,
  PathGradients
} from "../components/config/robotconfig/PathGradient";
import LocalStorageKeys from "../util/LocalStorageKeys";

export const SelectableItem = types.union(
  {
    dispatcher: (snapshot) => {
      if (snapshot.mass) return RobotConfigStore;
      if (snapshot.target) return EventMarkerStore;
      if (snapshot.scope) {
        return ConstraintStores[snapshot.type];
      }
      if (snapshot.radius) {
        return CircularObstacleStore;
      }
      return HolonomicWaypointStore;
    }
  },
  RobotConfigStore,
  HolonomicWaypointStore,
  CircularObstacleStore,
  EventMarkerStore,
  ...Object.values(ConstraintStores)
);

/* Navbar stuff */
export const WaypointData: {
  [key: string]: {
    index: number;
    name: string;
    icon: ReactElement;
  };
} = {
  FullWaypoint: {
    index: 0,
    name: "Pose Waypoint",
    icon: <Waypoint />
  },
  TranslationWaypoint: {
    index: 1,
    name: "Translation Waypoint",
    icon: <Circle />
  },
  EmptyWaypoint: {
    index: 2,
    name: "Empty Waypoint",
    icon: <CircleOutlined />
  },
  InitialGuessPoint: {
    index: 3,
    name: "Initial Guess Point",
    icon: <InitialGuessPoint />
  }
};
const NavbarData: {
  [key: string]: {
    index: number;
    name: string;
    icon: ReactElement;
  };
} = Object.assign({}, WaypointData);
const waypointNavbarCount = Object.keys(NavbarData).length;
const constraintsIndices: number[] = [];
const navbarIndexToConstraint: { [key: number]: typeof ConstraintStore } = {};
const navbarIndexToConstraintDefinition: {
  [key: number]: ConstraintDefinition;
} = {};
{
  let constraintsOffset = Object.keys(NavbarData).length;
  Object.entries(constraints).forEach(([key, data], index) => {
    NavbarData[key] = {
      index: constraintsOffset,
      name: data.name,
      icon: data.icon
    };
    navbarIndexToConstraint[constraintsOffset] = ConstraintStores[key];
    navbarIndexToConstraintDefinition[constraintsOffset] = data;
    constraintsIndices.push(constraintsOffset);
    constraintsOffset++;
  });
}
const constraintNavbarCount = Object.keys(constraints).length;
export const ObstacleData: {
  [key: string]: {
    index: number;
    name: string;
    icon: ReactElement;
  };
} = {
  CircleObstacle: {
    index: Object.keys(NavbarData).length,
    name: "Circular Obstacle",
    icon: <DoNotDisturb />
  }
};
let obstacleNavbarCount = 0;
obstacleNavbarCount = Object.keys(ObstacleData).length;
Object.entries(ObstacleData).forEach(([name, data]) => {
  const obstaclesOffset = Object.keys(NavbarData).length;
  NavbarData[name] = {
    index: obstaclesOffset,
    name: data.name,
    icon: data.icon
  };
});

const eventMarkerCount = 1;
NavbarData.EventMarker = {
  index: Object.keys(NavbarData).length,
  name: "Event Marker",
  icon: <Room></Room>
};

/** An map of  */
export const NavbarLabels = (() => {
  const x: { [key: string]: number } = {};
  Object.entries(NavbarData).forEach(([key, data], index) => {
    x[key] = index;
  });
  return x;
})();

/** An array of name-and-icon objects for the navbar */
export const NavbarItemData = (() => {
  const x: Array<{ name: string; icon: any }> = [];
  Object.entries(NavbarData).forEach(([key, data], index) => {
    x[data.index] = { name: data.name, icon: data.icon };
  });
  return x;
})();

const NavbarItemSections = [waypointNavbarCount, constraintNavbarCount];
NavbarItemSections.push(obstacleNavbarCount);
NavbarItemSections.push(eventMarkerCount);

export const NavbarItemSectionEnds = NavbarItemSections.map((s, idx) =>
  NavbarItemSections.slice(0, idx + 1).reduce((prev, cur) => prev + cur, -1)
);
console.log(NavbarItemSectionEnds);

export type SelectableItemTypes =
  | IRobotConfigStore
  | IHolonomicWaypointStore
  | IConstraintStore
  | ICircularObstacleStore
  | IEventMarkerStore
  | undefined;

/* ViewOptionsPanel items */
const ViewData = {
  Field: {
    index: 0,
    name: "Field",
    icon: (
      <SquareOutlined style={{ transform: "scale(1.2, 0.6)" }}></SquareOutlined>
    ),
    default: true
  },
  Grid: {
    index: 1,
    name: "Grid",
    icon: <Grid4x4 />,
    default: false
  },
  Trajectory: {
    index: 2,
    name: "Trajectory",
    icon: <Route />,
    default: true
  },
  Samples: {
    index: 3,
    name: "Samples",
    icon: <ScatterPlot />,
    default: false
  },
  Waypoints: {
    index: 4,
    name: "Waypoints",
    icon: <Waypoint />,
    default: true
  },
  Obstacles: {
    index: 5,
    name: "Obstacles",
    icon: <DoNotDisturb />,
    default: true
  },
  Focus: {
    index: 6,
    name: "Focus",
    icon: <CropFree />,
    default: false
  }
};

export const ViewLayers = (() => {
  const x: { [key: string]: number } = {};
  Object.entries(ViewData).forEach(([key, data], index) => {
    x[key] = index;
  });
  return x;
})();

export const ViewItemData = (() => {
  const x: Array<{ name: string; icon: any; default: boolean }> = [];
  Object.entries(ViewData).forEach(([key, data], index) => {
    x[data.index] = { name: data.name, icon: data.icon, default: data.default };
  });
  return x;
})();
export const ViewLayerDefaults = ViewItemData.map((layer) => layer.default);
export type ViewLayerType = typeof ViewLayers;
export const NUM_SETTINGS_TABS = 4;
export const UIStateStore = types
  .model("UIStateStore", {
    fieldScalingFactor: 0.02,
    saveFileName: types.maybe(types.string),
    saveFileDir: types.maybe(types.string),
    isGradleProject: types.maybe(types.boolean),
    waypointPanelOpen: false,
    isViewOptionsPanelOpen: false,
    robotConfigOpen: false,
    mainMenuOpen: false,
    settingsTab: types.refinement(
      types.integer,
      (i) => i >= 0 && i < NUM_SETTINGS_TABS
    ),
    pathAnimationTimestamp: 0,
    layers: types.refinement(
      types.array(types.boolean),
      (arr) => arr?.length == ViewItemData.length
    ),
    selectedSidebarItem: types.maybe(types.safeReference(SelectableItem)),
    selectedNavbarItem: NavbarLabels.FullWaypoint,
    selectedPathGradient: types.maybe(
      types.union(
        ...Object.keys(PathGradients).map((key) => types.literal(key))
      )
    ),

    contextMenuSelectedWaypoint: types.maybe(types.number),
    contextMenuWaypointType: types.maybe(types.number),
    contextMenuMouseSelection: types.maybe(types.array(types.number)) // [clientX, clientY] from `MouseEvent`
  })
  .views((self: any) => {
    return {
      get chorRelativeTrajDir() {
        return (
          self.isGradleProject ? "src/main/deploy/choreo" : "deploy/choreo"
        ).replaceAll("/", path.sep);
      },
      get hasSaveLocation() {
        return (
          self.saveFileName !== undefined && self.saveFileDir !== undefined
        );
      },
      get isSidebarConstraintSelected() {
        return (
          self.selectedSidebarItem !== undefined &&
          self.selectedSidebarItem.scope !== undefined
        );
      },
      get isSidebarCircularObstacleSelected() {
        return (
          self.selectedSidebarItem !== undefined &&
          self.selectedSidebarItem.radius !== undefined
        );
      },
      get isSidebarWaypointSelected() {
        return (
          self.selectedSidebarItem !== undefined &&
          !this.isSidebarConstraintSelected &&
          !this.isSidebarCircularObstacleSelected
        );
      },
      getSelectedConstraint() {
        return navbarIndexToConstraint[self.selectedNavbarItem] ?? undefined;
      },
      getSelectedConstraintDefinition() {
        return (
          navbarIndexToConstraintDefinition[self.selectedNavbarItem] ??
          undefined
        );
      },
      isNavbarWaypointSelected() {
        return (
          self.selectedNavbarItem == NavbarLabels.FullWaypoint ||
          self.selectedNavbarItem == NavbarLabels.TranslationWaypoint ||
          self.selectedNavbarItem == NavbarLabels.EmptyWaypoint ||
          self.selectedNavbarItem == NavbarLabels.InitialGuessPoint
        );
      },
      isConstraintSelected() {
        return (
          self.selectedNavbarItem > NavbarItemSectionEnds[0] &&
          self.selectedNavbarItem <= NavbarItemSectionEnds[1]
        );
      },
      isEventMarkerSelected() {
        return self.selectedNavbarItem == NavbarData.EventMarker.index;
      },
      isNavbarObstacleSelected() {
        return (
          self.selectedNavbarItem > NavbarItemSectionEnds[1] &&
          self.selectedNavbarItem <= NavbarItemSectionEnds[2]
        );
      },
      visibleLayersOnly() {
        return self.layers.flatMap((visible: boolean, index: number) => {
          if (visible) {
            return [index];
          }
          return [];
        });
      },
      async updateWindowTitle() {
        await tauriWindow
          .getCurrent()
          .setTitle(
            `Choreo ${await getVersion()} - ${self.saveFileName ?? "Untitled"}`
          )
          .catch(console.error);
      }
    };
  })
  .actions((self: any) => ({
    setMainMenuOpen(open: boolean) {
      self.mainMenuOpen = open;
    },
    setRobotConfigOpen(open: boolean) {
      self.robotConfigOpen = open;
    },
    setSettingsTab(tab: number) {
      if (tab >= 0 && tab < NUM_SETTINGS_TABS) {
        self.settingsTab = tab;
      }
    },
    toggleMainMenu() {
      self.mainMenuOpen = !self.mainMenuOpen;
    },
    setFieldScalingFactor(metersPerPixel: number) {
      self.fieldScalingFactor = metersPerPixel;
    },
    setSaveFileName(name: string | undefined) {
      self.saveFileName = name;
      self.updateWindowTitle();
    },
    setSaveFileDir(dir: string | undefined) {
      self.saveFileDir = dir;
    },
    setIsGradleProject(isGradleProject: boolean | undefined) {
      self.isGradleProject = isGradleProject;
    },
    setWaypointPanelOpen(open: boolean) {
      self.waypointPanelOpen = open;
    },
    setViewOptionsPanelOpen(open: boolean) {
      self.isViewOptionsPanelOpen = open;
    },
    setPathAnimationTimestamp(time: number) {
      self.pathAnimationTimestamp = time;
    },
    setSelectedSidebarItem(item: SelectableItemTypes) {
      self.selectedSidebarItem = item;
    },
    setLayerVisible(layer: number, visible: boolean) {
      self.layers.length = Math.max(layer + 1, self.layers.length);
      self.layers[layer] = visible;
    },
    setVisibleLayers(visibleLayers: number[]) {
      self.layers.fill(false);
      visibleLayers.forEach((layer) => {
        self.layers.length = Math.max(layer + 1, self.layers.length);
        self.layers[layer] = true;
      });
    },
    setSelectedNavbarItem(item: number) {
      self.selectedNavbarItem = item;
    },
    setSelectedPathGradient(pathGradient: PathGradient) {
      self.selectedPathGradient = pathGradient.name;
      this._saveSelectedPathGradientToLocalStorage();
    },
    _saveSelectedPathGradientToLocalStorage() {
      localStorage.setItem(
        LocalStorageKeys.PATH_GRADIENT,
        self.selectedPathGradient
      );
    },
    loadPathGradientFromLocalStorage() {
      self.selectedPathGradient =
        localStorage.getItem(LocalStorageKeys.PATH_GRADIENT) ??
        PathGradients.Velocity.name;
    },
    setContextMenuSelectedWaypoint(waypointIndex: number | undefined) {
      self.contextMenuSelectedWaypoint = waypointIndex;
    },
    setContextMenuWaypointType(waypointType: number | undefined) {
      self.contextMenuWaypointType = waypointType;
    },
    setContextMenuMouseSelection(mouseSelection: MouseEvent | undefined) {
      self.contextMenuMouseSelection = mouseSelection
        ? [mouseSelection.clientX, mouseSelection.clientY]
        : undefined;
    }
  }));
export interface IUIStateStore extends Instance<typeof UIStateStore> {}
