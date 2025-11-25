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
  CUSTOM_FIELD_ID,
  DEFAULT_FIELD_SETTINGS,
  FieldSettingsStore,
  SerializedFieldSettings,
  getPresetById
} from "./FieldSettingsStore";
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
import { tracing } from "./tauriTracing";

export enum SavingState {
  SAVED = "saved",
  SAVING = "saving",
  ERROR = "error",
  NO_LOCATION = "noLocation"
}
export const UIStateStore = types
  .model("UIStateStore", {
    //The transform matrix between mouse event clientX/Y and field coordinates
    fieldMatrix: types.frozen<DOMMatrix>(
      //identity, because there's apparently no factory for it
      DOMMatrix.fromFloat32Array(
        Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
      )
    ),
    fieldScalingFactor: 0.02,
    projectName: types.maybe(types.string),
    projectDir: types.maybe(types.string),
    projectSaveTime: types.maybe(types.Date),
    projectSavingState: types.enumeration<SavingState>(
      Object.values(SavingState)
    ),
    waypointPanelOpen: false,
    isViewOptionsPanelOpen: false,
    robotConfigOpen: false,
    mainMenuOpen: false,
    variablesPanelOpen: false,
    settingsTab: types.refinement(
      types.integer,
      (i) => i >= 0 && i < NUM_SETTINGS_TABS
    ),
    pathAnimationTimestamp: 0,
    layers: types.refinement(
      types.array(types.boolean),
      (arr) => arr?.length == ViewItemData.length
    ),
    fieldSettings: FieldSettingsStore,
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
      get hasSaveLocation() {
        return self.projectName !== undefined && self.projectDir !== undefined;
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
          .getCurrentWindow()
          .setTitle(
            `Choreo ${await getVersion()} - ${self.projectName ?? "Untitled"}`
          )
          .catch(tracing.error);
      }
    };
  })
  .actions((self: any) => ({
    setFieldMatrix(matrix: DOMMatrix) {
      self.fieldMatrix = matrix;
    },
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
    setProjectSavingState(state: SavingState) {
      self.projectSavingState = state;
    },
    setProjectSavingTime(time: Date | undefined) {
      self.projectSaveTime = time;
    },
    setFieldScalingFactor(metersPerPixel: number) {
      self.fieldScalingFactor = metersPerPixel;
    },
    setProjectName(name: string | undefined) {
      self.projectName = name;
      self.updateWindowTitle();
    },
    setSaveFileDir(dir: string | undefined) {
      self.projectDir = dir;
    },
    setWaypointPanelOpen(open: boolean) {
      self.waypointPanelOpen = open;
    },
    setViewOptionsPanelOpen(open: boolean) {
      self.isViewOptionsPanelOpen = open;
    },
    setVariablesPanelOpen(open: boolean) {
      self.variablesPanelOpen = open;
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
        PathGradients.LinearVelocity.name;
    },
    selectFieldPreset(presetId: string) {
      if (
        presetId === CUSTOM_FIELD_ID ||
        getPresetById(presetId) !== undefined
      ) {
        self.fieldSettings.selectPreset(presetId);
        this._saveFieldSettingsToLocalStorage();
      }
    },
    setFieldDimensions(length: number, width: number) {
      if (
        Number.isFinite(length) &&
        Number.isFinite(width) &&
        length > 0 &&
        width > 0
      ) {
        self.fieldSettings.setDimensions(length, width);
        this._saveFieldSettingsToLocalStorage();
      }
    },
    setPreviewGridSpacing(spacing: number) {
      if (Number.isFinite(spacing) && spacing > 0) {
        self.fieldSettings.setPreviewGridSpacing(spacing);
        this._saveFieldSettingsToLocalStorage();
      }
    },
    setCustomFieldImage(path: string | undefined) {
      self.fieldSettings.setCustomImagePath(path);
      this._saveFieldSettingsToLocalStorage();
    },
    resetFieldDimensionsToDefault() {
      self.fieldSettings.resetToPresetDefaults();
      this._saveFieldSettingsToLocalStorage();
    },
    loadFieldSettingsFromLocalStorage() {
      const stored = localStorage.getItem(LocalStorageKeys.FIELD_SETTINGS);
      if (!stored) {
        self.fieldSettings.hydrate(DEFAULT_FIELD_SETTINGS);
        return;
      }
      try {
        const parsed = JSON.parse(stored) as SerializedFieldSettings;
        const targetPreset =
          parsed.selectedPresetId === CUSTOM_FIELD_ID ||
          getPresetById(parsed.selectedPresetId)
            ? parsed.selectedPresetId
            : DEFAULT_FIELD_SETTINGS.selectedPresetId;
        self.fieldSettings.selectPreset(targetPreset);
        if (parsed.fieldLength && parsed.fieldWidth) {
          self.fieldSettings.setDimensions(
            parsed.fieldLength,
            parsed.fieldWidth
          );
        }
        if (
          parsed.previewGridSpacing !== undefined &&
          parsed.previewGridSpacing > 0
        ) {
          self.fieldSettings.setPreviewGridSpacing(parsed.previewGridSpacing);
        }
        if (targetPreset === CUSTOM_FIELD_ID) {
          self.fieldSettings.setCustomImagePath(parsed.customImagePath);
        }
      } catch (err) {
        console.error("Failed to load field settings", err);
        self.fieldSettings.hydrate(DEFAULT_FIELD_SETTINGS);
      }
    },
    _saveFieldSettingsToLocalStorage() {
      const serialized = self.fieldSettings.serialize;
      localStorage.setItem(
        LocalStorageKeys.FIELD_SETTINGS,
        JSON.stringify(serialized)
      );
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
