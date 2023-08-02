import { types, getRoot, Instance, getParent, isAlive } from "mobx-state-tree";
import { safeGetIdentifier } from "../util/mobxutils";
import { IDocumentModelStore } from "./DocumentModel";
import { SavedWaypoint } from "./DocumentSpecTypes";

export const HolonomicWaypointStore = types
  .model("WaypointStore", {
    x: 0,
    y: 0,
    heading: 0,
    translationConstrained: true,
    headingConstrained: true,
    controlIntervalCount: 0,
    velocityMagnitude: 0,
    velocityAngle: 0,
    angularVelocity: 0,
    velocityMagnitudeConstrained: false,
    velocityAngleConstrained: false,
    angularVelocityConstrained: false,
    uuid: types.identifier,
  })
  .views((self) => {
    return {
      get selected(): boolean {
        if (!isAlive(self)) {
          return false;
        }
        return (
          self.uuid ==
          safeGetIdentifier(
            getRoot<IDocumentModelStore>(self).uiState.selectedSidebarItem
          )
        );
      },
      asSavedWaypoint(): SavedWaypoint {
        let {
          x,
          y,
          heading,
          velocityMagnitude,
          velocityAngle,
          translationConstrained,
          headingConstrained,
          velocityMagnitudeConstrained,
          velocityAngleConstrained,
          angularVelocity,
          angularVelocityConstrained,
          controlIntervalCount,
        } = self;
        return {
          x,
          y,
          heading,
          velocityMagnitude,
          velocityAngle,
          translationConstrained,
          headingConstrained,
          velocityMagnitudeConstrained,
          velocityAngleConstrained,
          angularVelocity,
          angularVelocityConstrained,
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
        self.velocityMagnitude = point.velocityMagnitude;
        self.velocityAngle = point.velocityAngle;
        self.translationConstrained = point.translationConstrained;
        self.headingConstrained = point.headingConstrained;
        self.velocityMagnitudeConstrained = point.velocityMagnitudeConstrained;
        self.velocityAngleConstrained = point.velocityAngleConstrained;
        self.angularVelocity = point.angularVelocity;
        self.angularVelocityConstrained = point.angularVelocityConstrained;
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
          const root = getRoot<IDocumentModelStore>(self);
          root.select(
            getParent<IHolonomicWaypointStore[]>(self)?.find(
              (point) => self.uuid == point.uuid
            )
          );
        }
      },

      setVelocityAngle(vAngle: number) {
        self.velocityAngle = vAngle;
      },
      setVelocityAngleConstrained(velocityAngleConstrained: boolean) {
        self.velocityAngleConstrained = velocityAngleConstrained;
      },
      setVelocityMagnitude(vMag: number) {
        self.velocityMagnitude = vMag;
      },
      setVelocityMagnitudeConstrained(velocityMagnitudeConstrained: boolean) {
        self.velocityMagnitudeConstrained = velocityMagnitudeConstrained;
      },
      setAngularVelocity(omega: number) {
        self.angularVelocity = omega;
      },
      setAngularVelocityConstrained(angularVelocityConstrained: boolean) {
        self.angularVelocityConstrained = angularVelocityConstrained;
      },
    };
  });
export interface IHolonomicWaypointStore
  extends Instance<typeof HolonomicWaypointStore> {}
