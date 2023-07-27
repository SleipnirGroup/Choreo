import { Instance, types } from "mobx-state-tree";
import { HolonomicWaypointStore, IHolonomicWaypointStore } from "./HolonomicWaypointStore";
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
  
  export const UIStateStore = types
    .model("UIStateStore", {
      appPage: 1,
      fieldScalingFactor: 0.02,
      fieldGridView: false,
      saveFileName: "save",
      waypointPanelOpen: false,
      pathAnimationTimestamp: 0,
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
        setFieldGridView(on: boolean) {
          self.fieldGridView = on;
        },
        setSaveFileName(name: string) {
          self.saveFileName = name;
        },
        setWaypointPanelOpen(open: boolean) {
          self.waypointPanelOpen = open;
        },
        setPathAnimationTimestamp(time: number) {
          self.pathAnimationTimestamp = time;
        },
        setSelectedSidebarItem(item: SelectableItemTypes) {
          console.error("from", Object.keys(self.selectedSidebarItem ?? {}));
          self.selectedSidebarItem = item;
          console.log("to", Object.keys(self.selectedSidebarItem ?? {}));
        },
      };
    });
  export interface IUIStateStore extends Instance<typeof UIStateStore> {}