import { window as tauriWindow } from "@tauri-apps/api";
import { getVersion } from "@tauri-apps/api/app";
import { Instance, types } from "mobx-state-tree";
import {
  PathGradient,
  PathGradients
} from "../components/config/robotconfig/PathGradient";
import LocalStorageKeys from "../util/LocalStorageKeys";
import { ConstraintKey } from "./ConstraintDefinitions";
import {
  NUM_SETTINGS_TABS,
  NavbarData,
  NavbarItemSectionEnds,
  NavbarLabels,
  ViewItemData,
  navbarIndexToConstraint,
  navbarIndexToConstraintDefinition,
  navbarIndexToConstraintKey
} from "./UIData";

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
        return "";
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

      getSelectedConstraintKey(): ConstraintKey {
        return navbarIndexToConstraintKey[self.selectedNavbarItem] ?? undefined;
      },
      isNavbarWaypointSelected() {
        return (
          self.selectedNavbarItem == NavbarLabels.FullWaypoint ||
          self.selectedNavbarItem == NavbarLabels.TranslationWaypoint ||
          self.selectedNavbarItem == NavbarLabels.EmptyWaypoint
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
export type IUIStateStore = Instance<typeof UIStateStore>;
