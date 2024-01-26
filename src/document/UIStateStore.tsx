import {
  Circle,
  CircleOutlined,
  DoNotDisturb,
  Grid4x4,
  Route,
  ScatterPlot,
  SquareOutlined,
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
  IConstraintStore,
} from "./ConstraintStore";
import {
  HolonomicWaypointStore,
  IHolonomicWaypointStore,
} from "./HolonomicWaypointStore";
import { IRobotConfigStore, RobotConfigStore } from "./RobotConfigStore";
import {
  CircularObstacleStore,
  ICircularObstacleStore,
} from "./CircularObstacleStore";

export const SelectableItem = types.union(
  {
    dispatcher: (snapshot) => {
      if (snapshot.mass) return RobotConfigStore;
      if (snapshot.type) {
        return ConstraintStores[snapshot.type];
      }
      if (snapshot.radius) {
        return CircularObstacleStore;
      }
      return HolonomicWaypointStore;
    },
  },
  RobotConfigStore,
  HolonomicWaypointStore,
  CircularObstacleStore,
  ...Object.values(ConstraintStores)
);

/* Navbar stuff */
export let WaypointData: {
  [key: string]: {
    index: number;
    name: string;
    icon: ReactElement;
  };
} = {
  FullWaypoint: {
    index: 0,
    name: "Pose Waypoint",
    icon: <Waypoint />,
  },
  TranslationWaypoint: {
    index: 1,
    name: "Translation Waypoint",
    icon: <Circle />,
  },
  EmptyWaypoint: {
    index: 2,
    name: "Empty Waypoint",
    icon: <CircleOutlined />,
  },
  InitialGuessPoint: {
    index: 3,
    name: "Initial Guess Point",
    icon: <InitialGuessPoint />,
  },
};
let NavbarData: {
  [key: string]: {
    index: number;
    name: string;
    icon: ReactElement;
  };
} = Object.assign({}, WaypointData);
const waypointNavbarCount = Object.keys(NavbarData).length;
let constraintsIndices: number[] = [];
let navbarIndexToConstraint: { [key: number]: typeof ConstraintStore } = {};
let navbarIndexToConstraintDefinition: { [key: number]: ConstraintDefinition } =
  {};
{
  let constraintsOffset = Object.keys(NavbarData).length;
  Object.entries(constraints).forEach(([key, data], index) => {
    NavbarData[key] = {
      index: constraintsOffset,
      name: data.name,
      icon: data.icon,
    };
    navbarIndexToConstraint[constraintsOffset] = ConstraintStores[key];
    navbarIndexToConstraintDefinition[constraintsOffset] = data;
    constraintsIndices.push(constraintsOffset);
    constraintsOffset++;
  });
}
const constraintNavbarCount = Object.keys(constraints).length;
export let ObstacleData: {
  [key: string]: {
    index: number;
    name: string;
    icon: ReactElement;
  };
} = {
  CircleObstacle: {
    index: Object.keys(NavbarData).length,
    name: "Circular Obstacle",
    icon: <DoNotDisturb />,
  },
};
const obstacleNavbarCount = Object.keys(ObstacleData).length;
Object.entries(ObstacleData).forEach(([name, data]) => {
  let obstaclesOffset = Object.keys(NavbarData).length;
  NavbarData[name] = {
    index: obstaclesOffset,
    name: data.name,
    icon: data.icon,
  };
});

/** An map of  */
export const NavbarLabels = (() => {
  let x: { [key: string]: number } = {};
  Object.entries(NavbarData).forEach(([key, data], index) => {
    x[key] = index;
  });
  return x;
})();

/** An array of name-and-icon objects for the navbar */
export const NavbarItemData = (() => {
  let x: Array<{ name: string; icon: any }> = [];
  let constraintsOffset = 0;
  Object.entries(NavbarData).forEach(([key, data], index) => {
    x[data.index] = { name: data.name, icon: data.icon };
    constraintsOffset++;
  });
  return x;
})();

export const NavbarItemSectionLengths = [
  waypointNavbarCount - 1,
  waypointNavbarCount + constraintNavbarCount - 1,
  waypointNavbarCount + constraintNavbarCount + obstacleNavbarCount - 1,
];

export type SelectableItemTypes =
  | IRobotConfigStore
  | IHolonomicWaypointStore
  | IConstraintStore
  | ICircularObstacleStore
  | undefined;

/* Visibility stuff */
const ViewData = {
  Field: {
    index: 0,
    name: "Field",
    icon: (
      <SquareOutlined style={{ transform: "scale(1.2, 0.6)" }}></SquareOutlined>
    ),
    default: true,
  },
  Grid: {
    index: 1,
    name: "Grid",
    icon: <Grid4x4 />,
    default: false,
  },
  Trajectory: {
    index: 2,
    name: "Trajectory",
    icon: <Route />,
    default: true,
  },
  Samples: {
    index: 3,
    name: "Samples",
    icon: <ScatterPlot />,
    default: false,
  },
  Waypoints: {
    index: 4,
    name: "Waypoints",
    icon: <Waypoint />,
    default: true,
  },
  Obstacles: {
    index: 5,
    name: "Obstacles",
    icon: <DoNotDisturb />,
    default: true,
  },
};

export const ViewLayers = (() => {
  let x: { [key: string]: number } = {};
  Object.entries(ViewData).forEach(([key, data], index) => {
    x[key] = index;
  });
  return x;
})();

export const ViewItemData = (() => {
  let x: Array<{ name: string; icon: any; default: boolean }> = [];
  Object.entries(ViewData).forEach(([key, data], index) => {
    x[data.index] = { name: data.name, icon: data.icon, default: data.default };
  });
  return x;
})();
export const ViewLayerDefaults = ViewItemData.map((layer) => layer.default);
export type ViewLayerType = typeof ViewLayers;
export const NUM_SETTINGS_TABS = 3;
export const UIStateStore = types
  .model("UIStateStore", {
    fieldScalingFactor: 0.02,
    saveFileName: types.maybe(types.string),
    saveFileDir: types.maybe(types.string),
    isGradleProject: types.maybe(types.boolean),
    waypointPanelOpen: false,
    visibilityPanelOpen: false,
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
          self.selectedNavbarItem > NavbarItemSectionLengths[0] &&
          self.selectedNavbarItem <= NavbarItemSectionLengths[1]
        );
      },
      isNavbarObstacleSelected() {
        return self.selectedNavbarItem > NavbarItemSectionLengths[1];
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
      },
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
    setVisibilityPanelOpen(open: boolean) {
      self.visibilityPanelOpen = open;
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
      console.log(self.layers, visibleLayers);
      self.layers.fill(false);
      visibleLayers.forEach((layer) => {
        self.layers.length = Math.max(layer + 1, self.layers.length);
        self.layers[layer] = true;
      });
    },
    setSelectedNavbarItem(item: number) {
      self.selectedNavbarItem = item;
    },
  }));
export interface IUIStateStore extends Instance<typeof UIStateStore> {}
