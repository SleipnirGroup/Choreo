import { Instance, types } from "mobx-state-tree";
import {
  HolonomicWaypointStore,
  IHolonomicWaypointStore,
} from "./HolonomicWaypointStore";
import { IRobotConfigStore, RobotConfigStore } from "./RobotConfigStore";

export const SelectableItem = types.union(
  {
    dispatcher: (snapshot) => {
      if (snapshot.mass) return RobotConfigStore;
      return HolonomicWaypointStore;
    },
  },
  RobotConfigStore,
  HolonomicWaypointStore
);
export type SelectableItemTypes =
  | IRobotConfigStore
  | IHolonomicWaypointStore
  | undefined;

export const ViewLabels = ["Field", "Grid", "Trajectory", "Waypoints"];
export const ViewLayers = (() => {
  let x: { [key: string]: number } = {};
  ViewLabels.forEach((label, index) => {
    x[label] = index;
  });
  return x;
})();
export type ViewLayerType = typeof ViewLayers;
export const UIStateStore = types
  .model("UIStateStore", {
    appPage: 1,
    fieldScalingFactor: 0.02,
    saveFileName: "save",
    waypointPanelOpen: false,
    visibilityPanelOpen: false,
    pathAnimationTimestamp: 0,
    layers: types.array(types.boolean),
    selectedSidebarItem: types.maybe(types.safeReference(SelectableItem)),
  })
  .actions((self: any) => {
    return {
      setPageNumber(page: number) {
        self.appPage = page;
      },
      setFieldScalingFactor(metersPerPixel: number) {
        self.fieldScalingFactor = metersPerPixel;
      },
      setSaveFileName(name: string) {
        self.saveFileName = name;
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
        console.error("from", Object.keys(self.selectedSidebarItem ?? {}));
        self.selectedSidebarItem = item;
        console.log("to", Object.keys(self.selectedSidebarItem ?? {}));
      },
      setLayerVisible(layer: number, visible: boolean) {
        self.layers.length = Math.max(layer + 1, self.layers.length);
        self.layers[layer] = visible;
      },
    };
  });
export interface IUIStateStore extends Instance<typeof UIStateStore> {}
