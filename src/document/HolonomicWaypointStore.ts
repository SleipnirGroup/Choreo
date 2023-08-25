import { types, getRoot, Instance, getParent, isAlive } from "mobx-state-tree";
import { safeGetIdentifier } from "../util/mobxutils";
import { IStateStore } from "./DocumentModel";
import { SavedWaypoint } from "./DocumentSpecTypes";

export const HolonomicWaypointStore = types
  .model("WaypointStore", {
    x: 0,
    y: 0,
    heading: 0,
    translationConstrained: true,
    headingConstrained: true,
    controlIntervalCount: 0,
    isInitialGuess: false,
    uuid: types.identifier,
  })
  .views((self) => {
    return {
      get type(): number {
        if (self.isInitialGuess) {
          return 3; // Guess
        } else if (self.headingConstrained) {
          return 0; // Full
        } else  if (self.translationConstrained) {
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
        let {
          x,
          y,
          isInitialGuess,
          heading,
          translationConstrained,
          headingConstrained,
          controlIntervalCount,
        } = self;
        return {
          x,
          y,
          heading,
          isInitialGuess,
          translationConstrained,
          headingConstrained,
          controlIntervalCount,
        };
      },
    };
  })
  .actions((self) => {
    return {
      fromSavedWaypoint(point: SavedWaypoint) {
        self.x = point.x;
        self.y = point.y;
        self.heading = point.heading;
        self.isInitialGuess = point.isInitialGuess;
        self.translationConstrained = point.translationConstrained;
        self.headingConstrained = point.headingConstrained;
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
      }
    };
  });
export interface IHolonomicWaypointStore
  extends Instance<typeof HolonomicWaypointStore> {}
