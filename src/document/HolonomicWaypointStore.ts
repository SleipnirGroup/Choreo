import { types, getRoot, Instance, getParent, isAlive } from "mobx-state-tree";
import { safeGetIdentifier } from "../util/mobxutils";
import { IStateStore } from "./DocumentModel";
import { SavedWaypoint } from "./DocumentSpecTypes";
import { NavbarItemData } from "./UIStateStore";

export const HolonomicWaypointStore = types
  .model("WaypointStore", {
    x: 0,
    y: 0,
    heading: 0,
    translationConstrained: true,
    headingConstrained: true,
    controlIntervalCount: 40,
    isInitialGuess: false,
    uuid: types.identifier
  })
  .views((self) => {
    return {
      isConstrainable() {
        return !self.isInitialGuess;
      },
      get type(): number {
        if (self.isInitialGuess) {
          return 3; // Guess
        } else if (self.headingConstrained) {
          return 0; // Full
        } else if (self.translationConstrained) {
          return 1; // Translation
        } else {
          return 2; // Empty
        }
      },
      get selected(): boolean {
        if (!isAlive(self)) {
          return false;
        }
        return (
          self.uuid ==
          safeGetIdentifier(
            getRoot<IStateStore>(self).uiState.selectedSidebarItem
          )
        );
      },
      asSavedWaypoint(): SavedWaypoint {
        const {
          x,
          y,
          isInitialGuess,
          heading,
          translationConstrained,
          headingConstrained,
          controlIntervalCount
        } = self;
        return {
          x,
          y,
          heading,
          isInitialGuess,
          translationConstrained,
          headingConstrained,
          controlIntervalCount
        };
      }
    };
  })
  .views((self) => ({
    get typeName() {
      return NavbarItemData[self.type].name;
    }
  }))
  .actions((self) => {
    return {
      fromSavedWaypoint(point: SavedWaypoint) {
        self.x = point.x;
        self.y = point.y;
        self.heading = point.heading;
        self.isInitialGuess = point.isInitialGuess;
        self.translationConstrained = point.translationConstrained;
        self.headingConstrained = point.headingConstrained;
        self.controlIntervalCount = point.controlIntervalCount;
      },

      setX(x: number) {
        self.x = x;
      },
      setTranslationConstrained(translationConstrained: boolean) {
        self.translationConstrained = translationConstrained;
      },
      setY(y: number) {
        self.y = y;
      },
      setHeading(heading: number) {
        self.heading = heading;
      },
      setHeadingConstrained(headingConstrained: boolean) {
        self.headingConstrained = headingConstrained;
      },
      setSelected(selected: boolean) {
        if (selected && !self.selected) {
          const root = getRoot<IStateStore>(self);
          root.select(
            getParent<IHolonomicWaypointStore[]>(self)?.find(
              (point) => self.uuid == point.uuid
            )
          );
        }
      },
      setInitialGuess(initialGuess: boolean) {
        self.isInitialGuess = initialGuess;
      },
      setControlIntervalCount(count: number) {
        self.controlIntervalCount = count;
      }
    };
  })
  .actions((self) => ({
    setType(type: number) {
      switch (type) {
        case 0:
          self.setHeadingConstrained(true);
          self.setTranslationConstrained(true);
          self.setInitialGuess(false);
          break;
        case 1:
          self.setHeadingConstrained(false);
          self.setTranslationConstrained(true);
          self.setInitialGuess(false);
          break;
        case 2:
          self.setTranslationConstrained(false);
          self.setHeadingConstrained(false);
          self.setInitialGuess(false);
          break;
        case 3:
          self.setTranslationConstrained(true);
          self.setHeadingConstrained(true);
          self.setInitialGuess(true);
          break;
        default:
          break;
      }
    }
  }))
  .views((self) => ({
    copyToClipboard(evt: ClipboardEvent) {
      console.log("copying waypoint to", evt.clipboardData);
      const content = JSON.stringify({
        dataType: "choreo/waypoint",
        ...self.asSavedWaypoint()
      });
      evt.clipboardData?.setData("text/plain", content);
      console.log(evt.clipboardData);
    }
  }));
export interface IHolonomicWaypointStore
  extends Instance<typeof HolonomicWaypointStore> {}
